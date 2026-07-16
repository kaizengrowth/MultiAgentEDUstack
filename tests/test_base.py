"""Spec tests for scouts/base.py, the plumbing every scout depends on.

The contract that matters most: insert_item is idempotent on
(scout, source_url). The whole "a scout can just re-fetch its full target
list every run" design in CLAUDE.md rests on that.
"""

from __future__ import annotations

import json

import base


def test_get_connection_initializes_schema_on_fresh_db(conn):
    tables = {
        row[0]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
    }
    expected = {
        "raw_items",
        "curated_items",
        "item_merges",
        "digests",
        "forecast_watchlist",
        "curriculum_units",
        "lab_specs",
        "editorial_reviews",
        "telemetry_events",
        "decay_flags",
        "wiki_pages",
    }
    assert expected <= tables


def test_get_connection_enables_foreign_keys(conn):
    assert conn.execute("PRAGMA foreign_keys").fetchone()[0] == 1


def test_get_connection_is_reentrant(db_path):
    """A second connection re-applies CREATE IF NOT EXISTS and must not wipe
    existing rows or fail."""
    c1 = base.get_connection()
    c1.execute(
        "INSERT INTO raw_items (scout, source_url, title) VALUES ('t', 'u', 'x')"
    )
    c1.commit()
    c1.close()

    c2 = base.get_connection()
    assert c2.execute("SELECT COUNT(*) FROM raw_items").fetchone()[0] == 1
    c2.close()


def test_insert_item_returns_true_on_new_item(conn):
    ok = base.insert_item(
        conn,
        scout="arxiv",
        source_url="https://arxiv.org/abs/1",
        title="A Paper",
    )
    assert ok is True
    assert conn.execute("SELECT COUNT(*) FROM raw_items").fetchone()[0] == 1


def test_insert_item_is_idempotent_on_scout_and_url(conn):
    kwargs = dict(scout="hn", source_url="https://example.com/story", title="T")
    assert base.insert_item(conn, **kwargs) is True
    assert base.insert_item(conn, **kwargs) is False
    assert conn.execute("SELECT COUNT(*) FROM raw_items").fetchone()[0] == 1


def test_insert_item_same_url_different_scout_inserts_both(conn):
    """Cross-scout duplicates are the dedupe pass's job, not the scouts'."""
    url = "https://example.com/big-model-release"
    assert base.insert_item(conn, scout="hn", source_url=url, title="T") is True
    assert base.insert_item(conn, scout="blog", source_url=url, title="T") is True
    assert conn.execute("SELECT COUNT(*) FROM raw_items").fetchone()[0] == 2


def test_insert_item_serializes_metadata_as_json(conn):
    base.insert_item(
        conn,
        scout="hn",
        source_url="https://example.com/x",
        title="T",
        raw_metadata={"score": 42, "comments": 7},
    )
    raw = conn.execute("SELECT raw_metadata FROM raw_items").fetchone()[0]
    assert json.loads(raw) == {"score": 42, "comments": 7}


def test_insert_item_defaults_metadata_to_empty_object(conn):
    base.insert_item(conn, scout="hn", source_url="https://example.com/y", title="T")
    raw = conn.execute("SELECT raw_metadata FROM raw_items").fetchone()[0]
    assert json.loads(raw) == {}


def test_report_format(capsys):
    base.report("arxiv", 3, 12, note="categories=cs.CL")
    out = capsys.readouterr().out
    assert out == "[arxiv] 3 new, 12 already known (categories=cs.CL)\n"

    base.report("hn", 0, 0)
    out = capsys.readouterr().out
    assert out == "[hn] 0 new, 0 already known\n"
