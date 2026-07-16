"""Shared plumbing every scout uses: a SQLite connection and an upsert
helper for raw_items. Each scout is otherwise fully independent, per the
design in the blog post: different source types need different judgment,
not just a different API call, so this stays deliberately thin.
"""

from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = Path(os.environ.get("MAES_DB_PATH", REPO_ROOT / "db" / "maes.sqlite3"))
SCHEMA_PATH = REPO_ROOT / "db" / "schema.sql"


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    if not _is_initialized(conn):
        conn.executescript(SCHEMA_PATH.read_text())
        conn.commit()
    return conn


def _is_initialized(conn: sqlite3.Connection) -> bool:
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='raw_items'"
    ).fetchone()
    return row is not None


def insert_item(
    conn: sqlite3.Connection,
    *,
    scout: str,
    source_url: str,
    title: str,
    summary: str | None = None,
    author: str | None = None,
    published_at: str | None = None,
    raw_metadata: dict | None = None,
) -> bool:
    """Insert one raw item. Returns True if it was newly inserted, False if
    this scout already had this exact URL on file (idempotent re-runs)."""
    try:
        conn.execute(
            """
            INSERT INTO raw_items
                (scout, source_url, title, summary, author, published_at, raw_metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                scout,
                source_url,
                title,
                summary,
                author,
                published_at,
                json.dumps(raw_metadata or {}),
            ),
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False


def report(scout: str, inserted: int, skipped: int, note: str = "") -> None:
    msg = f"[{scout}] {inserted} new, {skipped} already known"
    if note:
        msg += f" ({note})"
    print(msg)
