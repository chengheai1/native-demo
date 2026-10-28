from __future__ import annotations

import hashlib
import sqlite3
from collections.abc import Iterator

from fastapi import Depends, Request

from .config import Settings
from .db import connect, iso, utc_now
from .errors import ApiError

SESSION_COOKIE = "xu_session"


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_db(request: Request) -> Iterator[sqlite3.Connection]:
    conn = connect(request.app.state.settings.database_path)
    try:
        yield conn
    finally:
        conn.close()


def request_token(request: Request) -> str | None:
    authorization = request.headers.get("authorization", "")
    scheme, _, value = authorization.partition(" ")
    if scheme.lower() == "bearer" and value.strip():
        return value.strip()
    return request.cookies.get(SESSION_COOKIE)


def require_user(
    request: Request,
    db: sqlite3.Connection = Depends(get_db),
) -> sqlite3.Row:
    token = request_token(request)
    if not token:
        raise ApiError(401, "unauthorized", "请先登录")

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    row = db.execute(
        """
        SELECT u.*, s.expires_at AS session_expires_at
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ?
        """,
        (token_hash, iso(utc_now())),
    ).fetchone()

    if row is None:
        db.execute(
            "DELETE FROM sessions WHERE token_hash = ? AND expires_at <= ?",
            (token_hash, iso(utc_now())),
        )
        raise ApiError(401, "unauthorized", "登录已过期，请重新登录")

    return row


def public_user(row: sqlite3.Row) -> dict[str, object]:
    return {
        "id": row["id"],
        "email": row["email"],
        "name": row["name"],
        "pictureUrl": row["picture_url"],
        "isDemo": bool(row["is_demo"]),
    }
