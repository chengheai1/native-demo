from __future__ import annotations

import sqlite3
from urllib.parse import parse_qs, urlparse

from fastapi.testclient import TestClient

from app.config import Settings
from app.db import iso, utc_now
from app.google import GoogleUser
from app.main import create_app


def test_health_and_config(client: TestClient) -> None:
    assert client.get("/api/health").json() == {"status": "ok"}
    assert client.get("/api/auth/config").json() == {"google": True, "demo": True}


def test_me_requires_session(client: TestClient) -> None:
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_demo_login_seeds_and_logs_out(client: TestClient) -> None:
    response = client.post("/api/auth/demo")
    assert response.status_code == 201
    user = response.json()["user"]
    assert user["isDemo"] is True
    assert user["name"] == "体验用户"

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["user"]["id"] == user["id"]

    todos = client.get("/api/todos").json()["todos"]
    assert len(todos) == 3
    assert [todo["title"] for todo in todos][0] == "给今天留 20 分钟散步"
    assert sum(todo["completed"] for todo in todos) == 1

    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401


def test_demo_can_be_disabled(tmp_path) -> None:
    settings = Settings(
        app_env="test",
        database_path=tmp_path / "disabled.db",
        public_base_url="http://testserver",
        frontend_origin="http://testserver",
        allow_demo_auth=False,
        native_redirect_uris=("nativedemo://auth",),
    )
    with TestClient(create_app(settings)) as client:
        response = client.post("/api/auth/demo")
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "demo_disabled"


def test_todo_crud_and_clear_completed(demo_client: TestClient) -> None:
    created = demo_client.post("/api/todos", json={"title": "  写周报  "})
    assert created.status_code == 201
    todo = created.json()["todo"]
    assert todo["title"] == "写周报"
    assert todo["completed"] is False

    updated = demo_client.patch(f"/api/todos/{todo['id']}", json={"completed": True})
    assert updated.status_code == 200
    assert updated.json()["todo"]["completed"] is True

    renamed = demo_client.patch(f"/api/todos/{todo['id']}", json={"title": "写周报并发送"})
    assert renamed.json()["todo"]["title"] == "写周报并发送"

    empty_update = demo_client.patch(f"/api/todos/{todo['id']}", json={})
    assert empty_update.status_code == 400
    assert empty_update.json()["error"]["code"] == "empty_update"

    deleted = demo_client.delete(f"/api/todos/{todo['id']}")
    assert deleted.status_code == 204
    assert demo_client.delete(f"/api/todos/{todo['id']}").status_code == 404

    cleared = demo_client.post("/api/todos/clear-completed")
    assert cleared.status_code == 200
    assert cleared.json()["deleted"] == 1


def test_todo_validation(demo_client: TestClient) -> None:
    blank = demo_client.post("/api/todos", json={"title": "   "})
    assert blank.status_code == 422
    assert blank.json()["error"]["code"] == "invalid_request"

    too_long = demo_client.post("/api/todos", json={"title": "x" * 201})
    assert too_long.status_code == 422


def test_users_are_isolated(demo_client: TestClient) -> None:
    created = demo_client.post("/api/todos", json={"title": "只有我能看到"})
    assert created.status_code == 201
    todo_id = created.json()["todo"]["id"]

    other = TestClient(demo_client.app)
    other.post("/api/auth/demo")
    other_todos = other.get("/api/todos").json()["todos"]
    assert all(todo["title"] != "只有我能看到" for todo in other_todos)
    assert other.delete(f"/api/todos/{todo_id}").status_code == 404
    assert other.patch(f"/api/todos/{todo_id}", json={"completed": True}).status_code == 404


def test_origin_check(demo_client: TestClient) -> None:
    response = demo_client.post(
        "/api/todos",
        json={"title": "csrf"},
        headers={"origin": "https://evil.example"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "origin_not_allowed"


def test_expired_session_is_rejected(settings: Settings, client: TestClient) -> None:
    assert client.post("/api/auth/demo").status_code == 201
    with sqlite3.connect(settings.database_path) as conn:
        conn.execute("UPDATE sessions SET expires_at = ?", (iso(utc_now()),))
        conn.commit()

    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_google_start_requires_configuration(tmp_path) -> None:
    settings = Settings(
        app_env="test",
        database_path=tmp_path / "no-google.db",
        public_base_url="http://localhost:5173",
        frontend_origin="http://localhost:5173",
        allow_demo_auth=True,
        native_redirect_uris=("nativedemo://auth",),
    )
    with TestClient(create_app(settings)) as client:
        response = client.get("/api/auth/google/start", follow_redirects=False)
    assert response.status_code == 302
    assert response.headers["location"] == (
        "http://localhost:5173/?auth_error=google_not_configured"
    )


def test_google_start_builds_state_and_pkce(client: TestClient) -> None:
    response = client.get("/api/auth/google/start", follow_redirects=False)
    assert response.status_code == 302
    location = response.headers["location"]
    assert location.startswith("https://accounts.google.com/o/oauth2/v2/auth?")
    query = parse_qs(urlparse(location).query)
    assert query["code_challenge_method"] == ["S256"]
    assert query["redirect_uri"] == ["http://testserver/api/auth/google/callback"]
    assert query["state"][0]
    assert "xu_oauth_state" in response.headers["set-cookie"]


def test_google_callback_rejects_bad_state(client: TestClient) -> None:
    start = client.get("/api/auth/google/start", follow_redirects=False)
    state = parse_qs(urlparse(start.headers["location"]).query)["state"][0]
    response = client.get(
        f"/api/auth/google/callback?code=code&state={state}",
        headers={"cookie": "xu_oauth_state=wrong"},
        follow_redirects=False,
    )
    assert response.status_code == 302
    assert response.headers["location"].endswith("/?auth_error=state_mismatch")


def test_google_callback_success(
    client: TestClient,
    monkeypatch,
) -> None:
    start = client.get("/api/auth/google/start", follow_redirects=False)
    state = parse_qs(urlparse(start.headers["location"]).query)["state"][0]

    def fake_exchange(self, code: str, verifier: str) -> str:
        assert code == "the-code"
        assert verifier
        return "access-token"

    def fake_userinfo(self, access_token: str) -> GoogleUser:
        assert access_token == "access-token"
        return GoogleUser(
            sub="google-123",
            email="hello@example.com",
            name="Cheng He",
            picture_url="https://example.com/avatar.png",
            email_verified=True,
        )

    monkeypatch.setattr("app.auth.GoogleClient.exchange_code", fake_exchange)
    monkeypatch.setattr("app.auth.GoogleClient.fetch_userinfo", fake_userinfo)

    response = client.get(
        f"/api/auth/google/callback?code=the-code&state={state}",
        follow_redirects=False,
    )
    assert response.status_code == 302
    assert response.headers["location"] == "http://testserver/"

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    user = me.json()["user"]
    assert user["email"] == "hello@example.com"
    assert user["name"] == "Cheng He"
    assert user["isDemo"] is False


def test_google_callback_rejects_unverified_email(
    client: TestClient,
    monkeypatch,
) -> None:
    start = client.get("/api/auth/google/start", follow_redirects=False)
    state = parse_qs(urlparse(start.headers["location"]).query)["state"][0]

    monkeypatch.setattr("app.auth.GoogleClient.exchange_code", lambda *_: "access-token")
    monkeypatch.setattr(
        "app.auth.GoogleClient.fetch_userinfo",
        lambda *_: GoogleUser(
            sub="google-unverified",
            email="unverified@example.com",
            name="Unverified",
            picture_url=None,
            email_verified=False,
        ),
    )

    response = client.get(
        f"/api/auth/google/callback?code=the-code&state={state}",
        follow_redirects=False,
    )
    assert response.status_code == 302
    assert response.headers["location"].endswith("/?auth_error=email_unverified")


def test_native_demo_returns_bearer_token(client: TestClient) -> None:
    response = client.post("/api/auth/native/demo")
    assert response.status_code == 201
    payload = response.json()
    token = payload["token"]
    assert payload["user"]["isDemo"] is True
    assert token

    headers = {"authorization": f"Bearer {token}"}
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["user"]["id"] == payload["user"]["id"]
    assert len(client.get("/api/todos", headers=headers).json()["todos"]) == 3
    assert "xu_session" not in response.cookies


def test_native_logout_revokes_bearer_token(client: TestClient) -> None:
    token = client.post("/api/auth/native/demo").json()["token"]
    headers = {"authorization": f"Bearer {token}"}
    assert client.post("/api/auth/logout", headers=headers).status_code == 204
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_native_oauth_exchange_flow(client: TestClient, monkeypatch) -> None:
    start = client.get(
        "/api/auth/google/native/start",
        params={"redirect": "nativedemo://auth"},
        follow_redirects=False,
    )
    assert start.status_code == 302
    state = parse_qs(urlparse(start.headers["location"]).query)["state"][0]

    monkeypatch.setattr("app.auth.GoogleClient.exchange_code", lambda *_: "access-token")
    monkeypatch.setattr(
        "app.auth.GoogleClient.fetch_userinfo",
        lambda *_: GoogleUser(
            sub="native-google-1",
            email="native@example.com",
            name="Native User",
            picture_url=None,
            email_verified=True,
        ),
    )

    callback = client.get(
        f"/api/auth/google/callback?code=the-code&state={state}",
        follow_redirects=False,
    )
    assert callback.status_code == 302
    location = callback.headers["location"]
    assert location.startswith("nativedemo://auth?code=")
    login_code = parse_qs(urlparse(location).query)["code"][0]

    exchanged = client.post("/api/auth/native/exchange", json={"code": login_code})
    assert exchanged.status_code == 200
    token = exchanged.json()["token"]
    assert exchanged.json()["user"]["email"] == "native@example.com"
    assert "xu_session" not in exchanged.cookies

    me = client.get("/api/auth/me", headers={"authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["user"]["name"] == "Native User"

    replay = client.post("/api/auth/native/exchange", json={"code": login_code})
    assert replay.status_code == 401
    assert replay.json()["error"]["code"] == "invalid_code"


def test_native_oauth_rejects_untrusted_redirect(client: TestClient) -> None:
    response = client.get(
        "/api/auth/google/native/start",
        params={"redirect": "https://evil.example/callback"},
        follow_redirects=False,
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_redirect"


def test_web_oauth_fallback_flow(client: TestClient, monkeypatch) -> None:
    start = client.get(
        "/api/auth/google/web/start",
        params={"redirect": "http://localhost:8081/web-auth"},
        follow_redirects=False,
    )
    assert start.status_code == 302
    state = parse_qs(urlparse(start.headers["location"]).query)["state"][0]

    monkeypatch.setattr("app.auth.GoogleClient.exchange_code", lambda *_: "access-token")
    monkeypatch.setattr(
        "app.auth.GoogleClient.fetch_userinfo",
        lambda *_: GoogleUser(
            sub="web-google-1",
            email="web@example.com",
            name="Web User",
            picture_url=None,
            email_verified=True,
        ),
    )

    callback = client.get(
        f"/api/auth/google/callback?code=the-code&state={state}",
        follow_redirects=False,
    )
    assert callback.status_code == 302
    location = callback.headers["location"]
    assert location.startswith("http://localhost:8081/web-auth?code=")

    code = parse_qs(urlparse(location).query)["code"][0]
    exchanged = client.post("/api/auth/native/exchange", json={"code": code})
    assert exchanged.status_code == 200
    assert exchanged.json()["user"]["email"] == "web@example.com"
