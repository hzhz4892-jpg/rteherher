import sqlite3
from pathlib import Path
from typing import Iterable

DB_PATH = Path("chat.db")


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender TEXT NOT NULL,
            receiver TEXT,
            body TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
    conn.close()


def create_user(username: str, password_hash: str) -> bool:
    conn = get_conn()
    try:
        conn.execute(
            "INSERT INTO users (username, password) VALUES (?, ?)",
            (username, password_hash),
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()


def get_user_password(username: str) -> str | None:
    conn = get_conn()
    row = conn.execute(
        "SELECT password FROM users WHERE username = ?", (username,)
    ).fetchone()
    conn.close()
    return row["password"] if row else None


def save_message(sender: str, body: str, receiver: str | None = None) -> None:
    conn = get_conn()
    conn.execute(
        "INSERT INTO messages (sender, receiver, body) VALUES (?, ?, ?)",
        (sender, receiver, body),
    )
    conn.commit()
    conn.close()


def last_messages(limit: int = 100) -> Iterable[sqlite3.Row]:
    conn = get_conn()
    rows = conn.execute(
        """
        SELECT sender, receiver, body, created_at
        FROM messages
        ORDER BY id DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    conn.close()
    return reversed(rows)
