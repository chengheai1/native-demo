from __future__ import annotations

import sqlite3
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient

from app import mailer
from app.config import Settings
from app.google import GoogleUser
from app.main import create_app


@pytest.fixture
def outbox(monkeypatch) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = []

    def fake_send(settings: Settings, to: str, code: str) -> None:
        messages.append({"to": to, "code": code})

    monkeypatch.setattr("app.mailer.send_login_code", fake_send)
    return messages


def send_code(client: TestClient, email: str = "user@example.com") -> dict[str, object]:
    response = client.post("/api/auth/email/code", json={"email": email})
    assert response.status_code == 200, response.text
    return response.json()["data"]


def verify(client: TestClient, email: str, code: str):
    return client.post(
        "/api/auth/email/verify",
        json={"email": email, "code": code},
    )


def _db(client: TestClient) -> sqlite3.Connection:
    conn = sqlite3.connect(client.app.state.settings.database_path)
    conn.row_factory = sqlite3.Row
    return conn


def _age_codes(client: TestClient) -> None:
    with _db(client) as conn:
        conn.execute("UPDATE email_codes SET created_at = '2020-01-01T00:00:00.000Z'")


def test_email_code_login_creates_and_reuses_account(
    client: TestClient,
    outbox: list[dict[str, str]],
) -> None:
    data = send_code(client, "User@Example.com")
    assert data == {"sent": True, "cooldownSeconds": 60}
    assert outbox[-1]["to"] == "user@example.com"
    assert len(outbox[-1]["code"]) == 6 and outbox[-1]["code"].isdigit()

    first = verify(client, "user@example.com", outbox[-1]["code"])
    assert first.status_code == 200, first.text
    payload = first.json()["data"]
    assert payload["user"]["email"] == "user@example.com"
    assert payload["user"]["name"] == "user"
    assert payload["user"]["isDemo"] is False
    user_id = payload["user"]["id"]
    token = payload["token"]

    me = client.get("/api/auth/me", headers={"authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["data"]["user"]["id"] == user_id

    # A code is single use.
    replay = verify(client, "user@example.com", outbox[-1]["code"])
    assert replay.status_code == 401
    assert replay.json()["code"] == "invalid_code"

    # Requesting a new code after the cooldown signs into the same account.
    _age_codes(client)
    send_code(client, "user@example.com")
    second = verify(client, "user@example.com", outbox[-1]["code"])
    assert second.status_code == 200
    assert second.json()["data"]["user"]["id"] == user_id

    with _db(client) as conn:
        assert conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 1


def test_email_code_cooldown(client: TestClient, outbox: list[dict[str, str]]) -> None:
    send_code(client)
    duplicate = client.post(
        "/api/auth/email/code",
        json={"email": "user@example.com"},
    )
    assert duplicate.status_code == 429
    assert duplicate.json()["code"] == "email_code_cooldown"
    assert len(outbox) == 1


def test_email_code_invalid_email(client: TestClient) -> None:
    response = client.post("/api/auth/email/code", json={"email": "not-an-email"})
    assert response.status_code == 400
    assert response.json()["code"] == "invalid_email"


def test_email_code_wrong_code_attempt_limit(
    client: TestClient,
    outbox: list[dict[str, str]],
) -> None:
    send_code(client)
    correct = outbox[-1]["code"]
    wrong = "111111" if correct != "111111" else "222222"

    for _ in range(5):
        response = verify(client, "user@example.com", wrong)
        assert response.status_code == 401, response.text
        assert response.json()["code"] == "invalid_code"

    blocked = verify(client, "user@example.com", correct)
    assert blocked.status_code == 429
    assert blocked.json()["code"] == "too_many_attempts"


def test_email_code_expires(client: TestClient, outbox: list[dict[str, str]]) -> None:
    send_code(client)
    with _db(client) as conn:
        conn.execute("UPDATE email_codes SET expires_at = '2020-01-01T00:00:00.000Z'")

    response = verify(client, "user@example.com", outbox[-1]["code"])
    assert response.status_code == 401
    assert response.json()["code"] == "invalid_code"


def test_email_code_send_failure_does_not_start_cooldown(
    client: TestClient,
    monkeypatch,
) -> None:
    def failing_send(settings: Settings, to: str, code: str) -> None:
        raise mailer.MailError("boom")

    monkeypatch.setattr("app.mailer.send_login_code", failing_send)

    first = client.post("/api/auth/email/code", json={"email": "user@example.com"})
    assert first.status_code == 502
    assert first.json()["code"] == "email_send_failed"

    # The failed attempt is removed, so the user can retry immediately.
    second = client.post("/api/auth/email/code", json={"email": "user@example.com"})
    assert second.status_code == 502

    with _db(client) as conn:
        assert conn.execute("SELECT COUNT(*) FROM email_codes").fetchone()[0] == 0


def test_email_login_disabled_in_production_without_mail(tmp_path) -> None:
    settings = Settings(
        app_env="production",
        database_path=tmp_path / "prod.db",
        public_base_url="https://api.example.com",
        frontend_origin="https://example.com",
        google_client_id="test-client-id",
        google_client_secret="test-client-secret",
        allow_demo_auth=False,
        cookie_secure=True,
    )
    with TestClient(create_app(settings)) as client:
        config = client.get("/api/auth/config").json()["data"]
        assert config["email"] is False
        assert config["emailDev"] is False

        response = client.post("/api/auth/email/code", json={"email": "user@example.com"})
        assert response.status_code == 503
        assert response.json()["code"] == "email_login_unavailable"


def test_google_login_links_email_account(
    client: TestClient,
    outbox,
    monkeypatch,
) -> None:
    send_code(client, "linked@example.com")
    verified = verify(client, "linked@example.com", outbox[-1]["code"])
    assert verified.status_code == 200
    user_id = verified.json()["data"]["user"]["id"]

    start = client.get("/api/auth/google/start", follow_redirects=False)
    state = parse_qs(urlparse(start.headers["location"]).query)["state"][0]

    monkeypatch.setattr("app.auth.GoogleClient.exchange_code", lambda *_: "access-token")
    monkeypatch.setattr(
        "app.auth.GoogleClient.fetch_userinfo",
        lambda *_: GoogleUser(
            sub="google-linked-1",
            email="linked@example.com",
            name="Linked User",
            picture_url=None,
            email_verified=True,
        ),
    )
    callback = client.get(
        f"/api/auth/google/callback?code=the-code&state={state}",
        follow_redirects=False,
    )

    assert callback.status_code == 302
    me = client.get("/api/auth/me")
    assert me.status_code == 200
    user = me.json()["data"]["user"]
    assert user["id"] == user_id
    assert user["name"] == "Linked User"

    with _db(client) as conn:
        assert conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 1
