from __future__ import annotations

import hashlib
import secrets
import sqlite3
import uuid
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, Field

from .config import Settings
from .db import iso, iso_in, transaction, utc_now
from .deps import (
    SESSION_COOKIE,
    get_db,
    get_settings,
    public_user,
    request_token,
    require_user,
)
from .errors import ApiError
from .google import GoogleAuthError, GoogleClient, GoogleUser, create_pkce_pair
from .todos import seed_demo_todos

router = APIRouter(prefix="/api/auth", tags=["auth"])

STATE_COOKIE = "xu_oauth_state"
STATE_TTL_SECONDS = 600
LOGIN_CODE_TTL_SECONDS = 300


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _create_session(conn: sqlite3.Connection, user_id: int, settings: Settings) -> str:
    token = secrets.token_urlsafe(32)
    conn.execute(
        """
        INSERT INTO sessions (user_id, token_hash, created_at, expires_at)
        VALUES (?, ?, ?, ?)
        """,
        (
            user_id,
            _hash_token(token),
            iso(utc_now()),
            iso_in(days=settings.session_days),
        ),
    )
    return token


def _create_login_code(conn: sqlite3.Connection, user_id: int) -> str:
    code = secrets.token_urlsafe(32)
    conn.execute(
        """
        INSERT INTO login_codes (code_hash, user_id, created_at, expires_at, used_at)
        VALUES (?, ?, ?, ?, NULL)
        """,
        (
            _hash_token(code),
            user_id,
            iso(utc_now()),
            iso_in(seconds=LOGIN_CODE_TTL_SECONDS),
        ),
    )
    return code


def _set_session_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=settings.session_days * 24 * 60 * 60,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
    )


def _clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE,
        path="/",
        secure=settings.cookie_secure,
        httponly=True,
        samesite="lax",
    )


def _clear_state_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        key=STATE_COOKIE,
        path="/api/auth",
        secure=settings.cookie_secure,
        httponly=True,
        samesite="lax",
    )


def _append_query(url: str, values: dict[str, str]) -> str:
    separator = "&" if "?" in url else "?"
    return f"{url}{separator}{urlencode(values)}"


def _redirect_error(
    settings: Settings,
    code: str,
    native_redirect: str | None = None,
) -> RedirectResponse:
    if native_redirect and (
        settings.native_redirect_allowed(native_redirect)
        or settings.web_redirect_allowed(native_redirect)
    ):
        url = _append_query(native_redirect, {"error": code})
    else:
        url = _append_query(
            f"{settings.frontend_origin.rstrip('/')}/",
            {"auth_error": code},
        )
    response = RedirectResponse(url=url, status_code=302)
    _clear_state_cookie(response, settings)
    return response


def _redirect_native_success(
    settings: Settings,
    native_redirect: str,
    code: str,
) -> RedirectResponse:
    response = RedirectResponse(
        url=_append_query(native_redirect, {"code": code}),
        status_code=302,
    )
    _clear_state_cookie(response, settings)
    return response


def _upsert_google_user(conn: sqlite3.Connection, user: GoogleUser) -> sqlite3.Row:
    now = iso(utc_now())
    conn.execute(
        """
        INSERT INTO users (google_sub, email, name, picture_url, is_demo, created_at, updated_at)
        VALUES (?, ?, ?, ?, 0, ?, ?)
        ON CONFLICT(google_sub) DO UPDATE SET
            email = excluded.email,
            name = excluded.name,
            picture_url = excluded.picture_url,
            updated_at = excluded.updated_at
        """,
        (user.sub, user.email, user.name, user.picture_url, now, now),
    )
    row = conn.execute("SELECT * FROM users WHERE google_sub = ?", (user.sub,)).fetchone()
    if row is None:
        raise ApiError(500, "user_upsert_failed", "无法创建账号")
    return row


def _create_demo_account(
    db: sqlite3.Connection,
    settings: Settings,
) -> tuple[str, sqlite3.Row]:
    suffix = uuid.uuid4().hex[:8]
    now = iso(utc_now())
    with transaction(db):
        cursor = db.execute(
            """
            INSERT INTO users (google_sub, email, name, picture_url, is_demo, created_at, updated_at)
            VALUES (?, ?, ?, NULL, 1, ?, ?)
            """,
            (f"demo:{suffix}", f"demo-{suffix}@example.local", "体验用户", now, now),
        )
        user_id = int(cursor.lastrowid)
        seed_demo_todos(db, user_id)
        token = _create_session(db, user_id, settings)
        user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

    if user is None:
        raise ApiError(500, "demo_failed", "演示账号创建失败")
    return token, user


def _begin_oauth(
    settings: Settings,
    db: sqlite3.Connection,
    *,
    mode: str,
    native_redirect: str | None = None,
) -> RedirectResponse:
    if not settings.google_configured:
        return _redirect_error(settings, "google_not_configured", native_redirect)

    state = secrets.token_urlsafe(32)
    verifier, challenge = create_pkce_pair()
    now = utc_now()

    with transaction(db):
        db.execute("DELETE FROM oauth_states WHERE expires_at <= ?", (iso(now),))
        db.execute(
            """
            INSERT INTO oauth_states
                (state_hash, code_verifier, mode, native_redirect, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                _hash_token(state),
                verifier,
                mode,
                native_redirect,
                iso(now),
                iso_in(seconds=STATE_TTL_SECONDS),
            ),
        )

    google = GoogleClient(settings)
    response = RedirectResponse(
        url=google.authorization_url(state, challenge),
        status_code=302,
    )
    response.set_cookie(
        key=STATE_COOKIE,
        value=state,
        max_age=STATE_TTL_SECONDS,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/api/auth",
    )
    return response


@router.get("/config")
def auth_config(settings: Settings = Depends(get_settings)) -> dict[str, bool]:
    return {
        "google": settings.google_configured,
        "demo": settings.allow_demo_auth,
    }


@router.get("/me")
def me(user: sqlite3.Row = Depends(require_user)) -> dict[str, object]:
    return {"user": public_user(user)}


@router.get("/google/start")
def google_start(
    settings: Settings = Depends(get_settings),
    db: sqlite3.Connection = Depends(get_db),
) -> RedirectResponse:
    return _begin_oauth(settings, db, mode="web")


@router.get("/google/native/start")
def google_native_start(
    redirect: str = Query(..., description="Custom scheme registered by the app"),
    settings: Settings = Depends(get_settings),
    db: sqlite3.Connection = Depends(get_db),
) -> RedirectResponse:
    if not settings.native_redirect_allowed(redirect):
        raise ApiError(400, "invalid_redirect", "不允许的回调地址")
    return _begin_oauth(settings, db, mode="native", native_redirect=redirect)


@router.get("/google/web/start")
def google_web_start(
    redirect: str = Query(..., description="Web fallback return URL"),
    settings: Settings = Depends(get_settings),
    db: sqlite3.Connection = Depends(get_db),
) -> RedirectResponse:
    if not settings.web_redirect_allowed(redirect):
        raise ApiError(400, "invalid_redirect", "不允许的回调地址")
    return _begin_oauth(settings, db, mode="webapp", native_redirect=redirect)


@router.get("/google/callback")
def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    settings: Settings = Depends(get_settings),
    db: sqlite3.Connection = Depends(get_db),
) -> RedirectResponse:
    state_hash = _hash_token(state) if state else None
    state_row = (
        db.execute(
            """
            SELECT code_verifier, expires_at, mode, native_redirect
            FROM oauth_states
            WHERE state_hash = ?
            """,
            (state_hash,),
        ).fetchone()
        if state_hash
        else None
    )
    native_redirect: str | None = None
    if state_row is not None and state_row["native_redirect"]:
        stored_redirect = str(state_row["native_redirect"])
        if state_row["mode"] == "native" and settings.native_redirect_allowed(stored_redirect):
            native_redirect = stored_redirect
        elif state_row["mode"] == "webapp" and settings.web_redirect_allowed(stored_redirect):
            native_redirect = stored_redirect

    if error:
        return _redirect_error(settings, "access_denied", native_redirect)
    if not code or not state:
        return _redirect_error(settings, "oauth_failed", native_redirect)

    cookie_state = request.cookies.get(STATE_COOKIE)
    if not cookie_state or not secrets.compare_digest(cookie_state, state):
        return _redirect_error(settings, "state_mismatch", native_redirect)

    verifier: str | None = None
    with transaction(db):
        row = db.execute(
            "SELECT code_verifier, expires_at FROM oauth_states WHERE state_hash = ?",
            (state_hash,),
        ).fetchone()
        if row is not None and row["expires_at"] > iso(utc_now()):
            verifier = str(row["code_verifier"])
        db.execute("DELETE FROM oauth_states WHERE state_hash = ?", (state_hash,))

    if not verifier:
        return _redirect_error(settings, "state_mismatch", native_redirect)

    google = GoogleClient(settings)
    try:
        access_token = google.exchange_code(code, verifier)
        google_user = google.fetch_userinfo(access_token)
    except GoogleAuthError:
        return _redirect_error(settings, "oauth_failed", native_redirect)

    if not google_user.email_verified:
        return _redirect_error(settings, "email_unverified", native_redirect)

    with transaction(db):
        user = _upsert_google_user(db, google_user)
        user_id = int(user["id"])
        if native_redirect:
            login_code = _create_login_code(db, user_id)
            token = None
        else:
            login_code = None
            token = _create_session(db, user_id, settings)

    if native_redirect and login_code:
        return _redirect_native_success(settings, native_redirect, login_code)

    response = RedirectResponse(
        url=f"{settings.frontend_origin.rstrip('/')}/",
        status_code=302,
    )
    if token:
        _set_session_cookie(response, token, settings)
    _clear_state_cookie(response, settings)
    return response


class NativeExchangeRequest(BaseModel):
    code: str = Field(min_length=8, max_length=256)


@router.post("/native/exchange")
def native_exchange(
    payload: NativeExchangeRequest,
    settings: Settings = Depends(get_settings),
    db: sqlite3.Connection = Depends(get_db),
) -> dict[str, object]:
    code_hash = _hash_token(payload.code)
    now = iso(utc_now())

    with transaction(db):
        row = db.execute(
            """
            SELECT user_id, expires_at, used_at
            FROM login_codes
            WHERE code_hash = ?
            """,
            (code_hash,),
        ).fetchone()
        if row is None or row["used_at"] is not None or row["expires_at"] <= now:
            raise ApiError(401, "invalid_code", "登录链接已失效，请重新登录")

        cursor = db.execute(
            "UPDATE login_codes SET used_at = ? WHERE code_hash = ? AND used_at IS NULL",
            (now, code_hash),
        )
        if cursor.rowcount == 0:
            raise ApiError(401, "invalid_code", "登录链接已使用，请重新登录")

        user = db.execute("SELECT * FROM users WHERE id = ?", (row["user_id"],)).fetchone()
        if user is None:
            raise ApiError(401, "invalid_code", "登录用户不存在")

        token = _create_session(db, int(user["id"]), settings)

    return {"token": token, "user": public_user(user)}


@router.post("/native/demo", status_code=201)
def native_demo(
    settings: Settings = Depends(get_settings),
    db: sqlite3.Connection = Depends(get_db),
) -> dict[str, object]:
    if not settings.allow_demo_auth:
        raise ApiError(403, "demo_disabled", "演示登录未开启")
    token, user = _create_demo_account(db, settings)
    return {"token": token, "user": public_user(user)}


@router.post("/demo", status_code=201)
def demo_login(
    settings: Settings = Depends(get_settings),
    db: sqlite3.Connection = Depends(get_db),
) -> Response:
    if not settings.allow_demo_auth:
        raise ApiError(403, "demo_disabled", "演示登录未开启")

    token, user = _create_demo_account(db, settings)
    response = JSONResponse(
        content={"user": public_user(user)},
        status_code=201,
    )
    _set_session_cookie(response, token, settings)
    return response


@router.post("/logout")
def logout(
    request: Request,
    settings: Settings = Depends(get_settings),
    db: sqlite3.Connection = Depends(get_db),
) -> Response:
    token = request_token(request)
    if token:
        db.execute(
            "DELETE FROM sessions WHERE token_hash = ?",
            (_hash_token(token),),
        )
    response = Response(status_code=204)
    _clear_session_cookie(response, settings)
    return response
