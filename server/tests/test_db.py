from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from app.db import connect, init_db

LEGACY_SCHEMA = """
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_sub TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    picture_url TEXT,
    is_demo INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE TABLE todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
    position INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

INSERT INTO users
    (id, google_sub, email, name, picture_url, is_demo, created_at, updated_at)
VALUES
    (7, 'google-legacy', 'legacy@example.com', 'Legacy', NULL, 0,
     '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
INSERT INTO sessions (user_id, token_hash, created_at, expires_at)
VALUES (7, 'hash', '2026-01-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z');
INSERT INTO todos (user_id, title, completed, position, created_at, updated_at)
VALUES (7, '旧待办', 0, 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
"""


def test_fresh_db_accepts_email_only_users(tmp_path: Path) -> None:
    path = tmp_path / "fresh.db"
    init_db(path)

    conn = connect(path)
    try:
        conn.execute(
            """
            INSERT INTO users (google_sub, email, name, is_demo, created_at, updated_at)
            VALUES (NULL, 'first@example.com', 'First', 0, 't', 't')
            """
        )
        conn.execute(
            """
            INSERT INTO users (google_sub, email, name, is_demo, created_at, updated_at)
            VALUES (NULL, 'second@example.com', 'Second', 0, 't', 't')
            """
        )
        assert conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 2
    finally:
        conn.close()


def test_init_db_migrates_legacy_users_table(tmp_path: Path) -> None:
    path = tmp_path / "legacy.db"
    legacy = sqlite3.connect(path)
    try:
        legacy.executescript(LEGACY_SCHEMA)
    finally:
        legacy.close()

    init_db(path)

    conn = connect(path)
    try:
        columns = {row["name"]: row for row in conn.execute("PRAGMA table_info(users)")}
        assert columns["google_sub"]["notnull"] == 0

        assert conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 1
        user = conn.execute("SELECT * FROM users WHERE id = 7").fetchone()
        assert user is not None
        assert user["email"] == "legacy@example.com"
        assert user["google_sub"] == "google-legacy"

        assert conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0] == 1
        assert conn.execute("SELECT COUNT(*) FROM todos").fetchone()[0] == 1

        # Foreign keys survived the rebuild and still point at `users`.
        foreign_keys = conn.execute("PRAGMA foreign_key_list(sessions)").fetchall()
        assert foreign_keys[0]["table"] == "users"
        assert conn.execute("PRAGMA foreign_key_check").fetchall() == []

        with pytest.raises(sqlite3.IntegrityError):
            conn.execute(
                """
                INSERT INTO sessions (user_id, token_hash, created_at, expires_at)
                VALUES (999, 'orphan', 't', 't')
                """
            )

        # The migration is idempotent.
        init_db(path)
        conn.execute(
            """
            INSERT INTO users (google_sub, email, name, is_demo, created_at, updated_at)
            VALUES (NULL, 'new@example.com', 'New', 0, 't', 't')
            """
        )
        assert conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 2
    finally:
        conn.close()
