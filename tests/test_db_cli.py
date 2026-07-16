"""Spec tests for scripts/db.py, the CLI every skill shells out to.

Exercised through build_parser() + args.func(args), the same path
`python3 scripts/db.py <command>` takes, so argument names, choices
validation, and output format are all covered as the skills see them.
"""

from __future__ import annotations

import json

import db
import pytest


def run_cli(*argv):
    args = db.build_parser().parse_args(list(argv))
    args.func(args)


def _out_lines(capsys):
    return [l for l in capsys.readouterr().out.splitlines() if l.strip()]


def _insert_curated(conn, title, url, tier, mention_count=1, status="new", topic=None):
    conn.execute(
        """
        INSERT INTO curated_items
            (title, canonical_url, tier, tier_label, mention_count, status, topic)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (title, url, tier, f"tier-{tier}", mention_count, status, topic),
    )
    conn.commit()
    return conn.execute("SELECT last_insert_rowid()").fetchone()[0]


def _insert_unit(conn, title="Unit", status="drafted", created_at=None):
    conn.execute(
        """
        INSERT INTO curriculum_units
            (title, competency, proficiency_level, format, spec_path, status, created_at)
        VALUES (?, 'tool_operation', 1, 'durable_course', 'curriculum/x.md', ?,
                COALESCE(?, datetime('now')))
        """,
        (title, status, created_at),
    )
    conn.commit()
    return conn.execute("SELECT last_insert_rowid()").fetchone()[0]


# --- new-items -------------------------------------------------------------


def test_new_items_lists_only_status_new(conn, capsys):
    _insert_curated(conn, "Fresh", "https://a.example/1", 1)
    _insert_curated(conn, "Old", "https://a.example/2", 1, status="digested")

    run_cli("new-items")
    items = [json.loads(l) for l in _out_lines(capsys)]
    assert [i["title"] for i in items] == ["Fresh"]


def test_new_items_orders_by_tier_then_mentions(conn, capsys):
    _insert_curated(conn, "T3", "https://a.example/3", 3, mention_count=9)
    _insert_curated(conn, "T1-quiet", "https://a.example/4", 1, mention_count=1)
    _insert_curated(conn, "T1-loud", "https://a.example/5", 1, mention_count=5)

    run_cli("new-items")
    items = [json.loads(l) for l in _out_lines(capsys)]
    assert [i["title"] for i in items] == ["T1-loud", "T1-quiet", "T3"]


def test_new_items_respects_limit(conn, capsys):
    for n in range(5):
        _insert_curated(conn, f"item-{n}", f"https://a.example/l{n}", 3)

    run_cli("new-items", "--limit", "2")
    assert len(_out_lines(capsys)) == 2


# --- item state transitions -------------------------------------------------


def test_set_topic(conn, capsys):
    item_id = _insert_curated(conn, "A", "https://a.example/6", 2)
    run_cli("set-topic", str(item_id), "agentic-coding")

    topic = conn.execute(
        "SELECT topic FROM curated_items WHERE id = ?", (item_id,)
    ).fetchone()[0]
    assert topic == "agentic-coding"


def test_mark_digested_multiple_ids(conn, capsys):
    ids = [
        _insert_curated(conn, f"i{n}", f"https://a.example/m{n}", 3) for n in range(3)
    ]
    run_cli("mark-digested", str(ids[0]), str(ids[2]))

    statuses = dict(
        conn.execute("SELECT id, status FROM curated_items").fetchall()
    )
    assert statuses[ids[0]] == "digested"
    assert statuses[ids[1]] == "new"
    assert statuses[ids[2]] == "digested"


# --- run records -------------------------------------------------------------


def test_insert_digest(conn, capsys):
    run_cli(
        "insert-digest",
        "--period-start", "2026-07-06",
        "--period-end", "2026-07-12",
        "--markdown-path", "digests/2026-07-12.md",
        "--item-count", "17",
    )
    row = conn.execute(
        "SELECT period_start, period_end, markdown_path, item_count FROM digests"
    ).fetchone()
    assert row == ("2026-07-06", "2026-07-12", "digests/2026-07-12.md", 17)


def test_insert_watchlist(conn, capsys):
    run_cli(
        "insert-watchlist",
        "--topic", "on-device agents",
        "--signal-summary", "three tier-1 papers plus tooling velocity",
        "--confidence", "medium",
    )
    row = conn.execute(
        "SELECT topic, confidence, status FROM forecast_watchlist"
    ).fetchone()
    assert row == ("on-device agents", "medium", "watching")


def test_insert_watchlist_rejects_bad_confidence(conn):
    with pytest.raises(SystemExit):
        run_cli(
            "insert-watchlist",
            "--topic", "x",
            "--signal-summary", "y",
            "--confidence", "certain",
        )


def test_insert_curriculum_unit_prints_id(conn, capsys):
    run_cli(
        "insert-curriculum-unit",
        "--title", "Evaluating agent trajectories",
        "--competency", "critical_evaluation",
        "--proficiency-level", "3",
        "--format", "frontier_oneshot",
        "--spec-path", "curriculum/eval-agents.md",
    )
    out = capsys.readouterr().out
    assert "curriculum_unit id=1" in out
    row = conn.execute(
        "SELECT competency, proficiency_level, format, status FROM curriculum_units"
    ).fetchone()
    assert row == ("critical_evaluation", 3, "frontier_oneshot", "drafted")


def test_insert_curriculum_unit_rejects_bad_competency(conn):
    with pytest.raises(SystemExit):
        run_cli(
            "insert-curriculum-unit",
            "--title", "t",
            "--competency", "vibes",
            "--proficiency-level", "1",
            "--format", "durable_course",
            "--spec-path", "curriculum/x.md",
        )


def test_insert_lab_spec(conn, capsys):
    unit_id = _insert_unit(conn)
    run_cli(
        "insert-lab-spec",
        "--curriculum-unit-id", str(unit_id),
        "--objective", "Reproduce the eval harness end to end",
        "--spec-path", "labs/eval-harness.md",
        "--target-time-pct", "70",
    )
    row = conn.execute(
        "SELECT curriculum_unit_id, target_time_pct, status FROM lab_specs"
    ).fetchone()
    assert row == (unit_id, 70, "drafted")


# --- editorial review --------------------------------------------------------


def test_insert_review_records_decision(conn, capsys):
    unit_id = _insert_unit(conn)
    run_cli(
        "insert-review",
        "--target-type", "curriculum_unit",
        "--target-id", str(unit_id),
        "--decision", "changes_requested",
        "--pedagogical-notes", "objective not observable",
    )
    row = conn.execute(
        "SELECT target_type, target_id, decision FROM editorial_reviews"
    ).fetchone()
    assert row == ("curriculum_unit", unit_id, "changes_requested")


def test_insert_review_rejects_unknown_decision(conn):
    with pytest.raises(SystemExit):
        run_cli(
            "insert-review",
            "--target-type", "curriculum_unit",
            "--target-id", "1",
            "--decision", "lgtm",
        )


def test_pending_review_lists_unreviewed_drafted_units(conn, capsys):
    drafted = _insert_unit(conn, title="Needs review")
    _insert_unit(conn, title="Already shipped", status="shipped")

    run_cli("pending-review")
    items = [json.loads(l) for l in _out_lines(capsys)]
    assert [i["id"] for i in items] == [drafted]


def test_pending_review_excludes_reviewed_units(conn, capsys):
    unit_id = _insert_unit(conn)
    run_cli(
        "insert-review",
        "--target-type", "curriculum_unit",
        "--target-id", str(unit_id),
        "--decision", "approved",
    )
    capsys.readouterr()

    run_cli("pending-review")
    assert _out_lines(capsys) == []


# --- decay and telemetry -----------------------------------------------------


def test_stale_units_honors_age_and_status(conn, capsys):
    old_shipped = _insert_unit(
        conn, title="Old shipped", status="shipped",
        created_at="2026-01-01 00:00:00",
    )
    _insert_unit(conn, title="Fresh shipped", status="shipped")
    _insert_unit(
        conn, title="Old but drafted", created_at="2026-01-01 00:00:00"
    )

    run_cli("stale-units", "--older-than-days", "60")
    items = [json.loads(l) for l in _out_lines(capsys)]
    assert [i["id"] for i in items] == [old_shipped]


def test_insert_decay_flag(conn, capsys):
    unit_id = _insert_unit(conn, status="shipped")
    run_cli(
        "insert-decay-flag",
        "--curriculum-unit-id", str(unit_id),
        "--reason", "tool renamed, screenshots stale",
    )
    row = conn.execute(
        "SELECT curriculum_unit_id, reason, resolution FROM decay_flags"
    ).fetchone()
    assert row == (unit_id, "tool renamed, screenshots stale", None)


def test_log_telemetry(conn, capsys):
    item_id = _insert_curated(conn, "A", "https://a.example/t1", 2)
    run_cli(
        "log-telemetry",
        "--curated-item-id", str(item_id),
        "--event-type", "cited_in_post",
        "--detail", "linked from weekly sketch",
    )
    row = conn.execute(
        "SELECT curated_item_id, event_type, detail FROM telemetry_events"
    ).fetchone()
    assert row == (item_id, "cited_in_post", "linked from weekly sketch")


def test_log_telemetry_rejects_unknown_event_type(conn):
    with pytest.raises(SystemExit):
        run_cli(
            "log-telemetry",
            "--curated-item-id", "1",
            "--event-type", "glanced_at",
        )
