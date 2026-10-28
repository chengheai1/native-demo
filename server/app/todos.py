from __future__ import annotations

import sqlite3

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field, field_validator

from .db import iso, transaction, utc_now
from .deps import get_db, require_user
from .errors import ApiError

router = APIRouter(prefix="/api/todos", tags=["todos"])

MAX_TITLE = 200


def _clean_title(value: str) -> str:
    cleaned = " ".join(value.split())
    if not cleaned:
        raise ValueError("标题不能为空")
    return cleaned


class TodoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=MAX_TITLE)
    completed: bool = False

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        return _clean_title(value)


class TodoUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=MAX_TITLE)
    completed: bool | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _clean_title(value)


def public_todo(row: sqlite3.Row) -> dict[str, object]:
    return {
        "id": row["id"],
        "title": row["title"],
        "completed": bool(row["completed"]),
        "position": row["position"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def _get_todo(db: sqlite3.Connection, user_id: int, todo_id: int) -> sqlite3.Row:
    row = db.execute(
        "SELECT * FROM todos WHERE id = ? AND user_id = ?",
        (todo_id, user_id),
    ).fetchone()
    if row is None:
        raise ApiError(404, "todo_not_found", "任务不存在")
    return row


def seed_demo_todos(db: sqlite3.Connection, user_id: int) -> None:
    now = iso(utc_now())
    samples = [
        ("给今天留 20 分钟散步", 0),
        ("读完手边那本书的一章", 0),
        ("给妈妈打个电话", 1),
    ]
    for index, (title, completed) in enumerate(samples):
        db.execute(
            """
            INSERT INTO todos (user_id, title, completed, position, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (user_id, title, completed, len(samples) - index, now, now),
        )


@router.get("")
def list_todos(
    user: sqlite3.Row = Depends(require_user),
    db: sqlite3.Connection = Depends(get_db),
) -> dict[str, object]:
    rows = db.execute(
        """
        SELECT * FROM todos
        WHERE user_id = ?
        ORDER BY completed ASC, position DESC, id DESC
        """,
        (user["id"],),
    ).fetchall()
    return {"todos": [public_todo(row) for row in rows]}


@router.post("", status_code=201)
def create_todo(
    payload: TodoCreate,
    user: sqlite3.Row = Depends(require_user),
    db: sqlite3.Connection = Depends(get_db),
) -> dict[str, object]:
    now = iso(utc_now())
    with transaction(db):
        row = db.execute(
            "SELECT COALESCE(MAX(position), 0) + 1 AS next_position FROM todos WHERE user_id = ?",
            (user["id"],),
        ).fetchone()
        position = int(row["next_position"]) if row is not None else 1
        cursor = db.execute(
            """
            INSERT INTO todos (user_id, title, completed, position, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (user["id"], payload.title, 1 if payload.completed else 0, position, now, now),
        )
        created = db.execute("SELECT * FROM todos WHERE id = ?", (cursor.lastrowid,)).fetchone()

    if created is None:
        raise ApiError(500, "todo_create_failed", "任务创建失败")
    return {"todo": public_todo(created)}


@router.patch("/{todo_id}")
def update_todo(
    todo_id: int,
    payload: TodoUpdate,
    user: sqlite3.Row = Depends(require_user),
    db: sqlite3.Connection = Depends(get_db),
) -> dict[str, object]:
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise ApiError(400, "empty_update", "没有需要更新的字段")

    fields: list[str] = []
    values: list[object] = []
    if "title" in changes and changes["title"] is not None:
        fields.append("title = ?")
        values.append(changes["title"])
    if "completed" in changes and changes["completed"] is not None:
        fields.append("completed = ?")
        values.append(1 if changes["completed"] else 0)

    if not fields:
        raise ApiError(400, "empty_update", "没有需要更新的字段")

    fields.append("updated_at = ?")
    values.extend([iso(utc_now()), todo_id, user["id"]])

    with transaction(db):
        cursor = db.execute(
            f"UPDATE todos SET {', '.join(fields)} WHERE id = ? AND user_id = ?",
            values,
        )
        if cursor.rowcount == 0:
            raise ApiError(404, "todo_not_found", "任务不存在")
        updated = _get_todo(db, int(user["id"]), todo_id)

    return {"todo": public_todo(updated)}


@router.delete("/{todo_id}", status_code=204)
def delete_todo(
    todo_id: int,
    user: sqlite3.Row = Depends(require_user),
    db: sqlite3.Connection = Depends(get_db),
) -> Response:
    with transaction(db):
        cursor = db.execute(
            "DELETE FROM todos WHERE id = ? AND user_id = ?",
            (todo_id, user["id"]),
        )
        if cursor.rowcount == 0:
            raise ApiError(404, "todo_not_found", "任务不存在")
    return Response(status_code=204)


@router.post("/clear-completed")
def clear_completed(
    user: sqlite3.Row = Depends(require_user),
    db: sqlite3.Connection = Depends(get_db),
) -> dict[str, int]:
    with transaction(db):
        cursor = db.execute(
            "DELETE FROM todos WHERE user_id = ? AND completed = 1",
            (user["id"],),
        )
    return {"deleted": cursor.rowcount}
