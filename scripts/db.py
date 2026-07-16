#!/usr/bin/env python3
"""CLI the LLM-driven agents (agents/*/SKILL.md) shell out to for every
database read/write. A skill's job is judgment -- what does this item mean,
is it worth teaching, is the lab objective observable -- not raw SQL, so
that judgment gets captured here as small, named, scriptable operations
instead of ad hoc queries scattered across skill prompts.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scouts"))
from base import get_connection  # noqa: E402


def cmd_new_items(args: argparse.Namespace) -> None:
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT id, title, canonical_url, tier, tier_label, mention_count, topic
        FROM curated_items
        WHERE status = 'new'
        ORDER BY tier ASC, mention_count DESC
        LIMIT ?
        """,
        (args.limit,),
    ).fetchall()
    conn.close()
    for row in rows:
        print(json.dumps({
            "id": row[0], "title": row[1], "url": row[2],
            "tier": row[3], "tier_label": row[4],
            "mention_count": row[5], "topic": row[6],
        }))


def cmd_set_topic(args: argparse.Namespace) -> None:
    conn = get_connection()
    conn.execute("UPDATE curated_items SET topic = ? WHERE id = ?", (args.topic, args.item_id))
    conn.commit()
    conn.close()
    print(f"item {args.item_id} -> topic '{args.topic}'")


def cmd_mark_digested(args: argparse.Namespace) -> None:
    conn = get_connection()
    conn.executemany(
        "UPDATE curated_items SET status = 'digested' WHERE id = ?",
        [(i,) for i in args.item_ids],
    )
    conn.commit()
    conn.close()
    print(f"marked {len(args.item_ids)} items digested")


def cmd_insert_digest(args: argparse.Namespace) -> None:
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO digests (period_start, period_end, markdown_path, item_count)
        VALUES (?, ?, ?, ?)
        """,
        (args.period_start, args.period_end, args.markdown_path, args.item_count),
    )
    conn.commit()
    conn.close()
    print(f"digest recorded: {args.markdown_path}")


def cmd_insert_watchlist(args: argparse.Namespace) -> None:
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO forecast_watchlist (topic, signal_summary, confidence)
        VALUES (?, ?, ?)
        """,
        (args.topic, args.signal_summary, args.confidence),
    )
    conn.commit()
    conn.close()
    print(f"watchlist: {args.topic} ({args.confidence})")


def cmd_insert_curriculum_unit(args: argparse.Namespace) -> None:
    conn = get_connection()
    cur = conn.execute(
        """
        INSERT INTO curriculum_units
            (title, competency, proficiency_level, format, source_curated_item_id, spec_path)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (args.title, args.competency, args.proficiency_level, args.format,
         args.source_curated_item_id, args.spec_path),
    )
    conn.commit()
    unit_id = cur.lastrowid
    conn.close()
    print(f"curriculum_unit id={unit_id}: {args.title}")


def cmd_insert_lab_spec(args: argparse.Namespace) -> None:
    conn = get_connection()
    cur = conn.execute(
        """
        INSERT INTO lab_specs (curriculum_unit_id, objective, spec_path, target_time_pct)
        VALUES (?, ?, ?, ?)
        """,
        (args.curriculum_unit_id, args.objective, args.spec_path, args.target_time_pct),
    )
    conn.commit()
    lab_id = cur.lastrowid
    conn.close()
    print(f"lab_spec id={lab_id} for curriculum_unit {args.curriculum_unit_id}")


def cmd_insert_review(args: argparse.Namespace) -> None:
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO editorial_reviews
            (target_type, target_id, pedagogical_notes, technical_notes, decision, reviewed_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        """,
        (args.target_type, args.target_id, args.pedagogical_notes, args.technical_notes, args.decision),
    )
    conn.commit()
    conn.close()
    print(f"review recorded: {args.target_type} {args.target_id} -> {args.decision}")


def cmd_pending_review(args: argparse.Namespace) -> None:
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT cu.id, cu.title, cu.spec_path
        FROM curriculum_units cu
        LEFT JOIN editorial_reviews er ON er.target_type = 'curriculum_unit' AND er.target_id = cu.id
        WHERE er.id IS NULL AND cu.status = 'drafted'
        """
    ).fetchall()
    conn.close()
    for row in rows:
        print(json.dumps({"id": row[0], "title": row[1], "spec_path": row[2]}))


def cmd_stale_units(args: argparse.Namespace) -> None:
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT id, title, created_at
        FROM curriculum_units
        WHERE status = 'shipped'
          AND julianday('now') - julianday(created_at) > ?
        """,
        (args.older_than_days,),
    ).fetchall()
    conn.close()
    for row in rows:
        print(json.dumps({"id": row[0], "title": row[1], "created_at": row[2]}))


def cmd_insert_decay_flag(args: argparse.Namespace) -> None:
    conn = get_connection()
    conn.execute(
        "INSERT INTO decay_flags (curriculum_unit_id, reason) VALUES (?, ?)",
        (args.curriculum_unit_id, args.reason),
    )
    conn.commit()
    conn.close()
    print(f"decay flag: unit {args.curriculum_unit_id} -- {args.reason}")


def cmd_log_telemetry(args: argparse.Namespace) -> None:
    conn = get_connection()
    conn.execute(
        "INSERT INTO telemetry_events (curated_item_id, event_type, detail) VALUES (?, ?, ?)",
        (args.curated_item_id, args.event_type, args.detail),
    )
    conn.commit()
    conn.close()
    print(f"telemetry: item {args.curated_item_id} -- {args.event_type}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("new-items", help="List curated items not yet digested")
    p.add_argument("--limit", type=int, default=100)
    p.set_defaults(func=cmd_new_items)

    p = sub.add_parser("set-topic", help="Assign a topic to a curated item")
    p.add_argument("item_id", type=int)
    p.add_argument("topic")
    p.set_defaults(func=cmd_set_topic)

    p = sub.add_parser("mark-digested", help="Mark curated items as digested")
    p.add_argument("item_ids", type=int, nargs="+")
    p.set_defaults(func=cmd_mark_digested)

    p = sub.add_parser("insert-digest", help="Record a completed digest run")
    p.add_argument("--period-start", required=True)
    p.add_argument("--period-end", required=True)
    p.add_argument("--markdown-path", required=True)
    p.add_argument("--item-count", type=int, required=True)
    p.set_defaults(func=cmd_insert_digest, period_start=None)

    p = sub.add_parser("insert-watchlist", help="Add a trend-forecasting watchlist entry")
    p.add_argument("--topic", required=True)
    p.add_argument("--signal-summary", required=True)
    p.add_argument("--confidence", required=True, choices=["high", "medium", "low"])
    p.set_defaults(func=cmd_insert_watchlist)

    p = sub.add_parser("insert-curriculum-unit", help="Record a scaffolded curriculum unit")
    p.add_argument("--title", required=True)
    p.add_argument("--competency", required=True,
                    choices=["tool_operation", "critical_evaluation", "workflow_integration", "building_ai_native"])
    p.add_argument("--proficiency-level", type=int, required=True, choices=[1, 2, 3, 4])
    p.add_argument("--format", required=True, choices=["durable_course", "frontier_oneshot"])
    p.add_argument("--source-curated-item-id", type=int)
    p.add_argument("--spec-path", required=True)
    p.set_defaults(func=cmd_insert_curriculum_unit)

    p = sub.add_parser("insert-lab-spec", help="Record a generated lab spec")
    p.add_argument("--curriculum-unit-id", type=int, required=True)
    p.add_argument("--objective", required=True)
    p.add_argument("--spec-path", required=True)
    p.add_argument("--target-time-pct", type=int)
    p.set_defaults(func=cmd_insert_lab_spec)

    p = sub.add_parser("insert-review", help="Record an editorial review decision")
    p.add_argument("--target-type", required=True, choices=["curriculum_unit", "lab_spec", "digest"])
    p.add_argument("--target-id", type=int, required=True)
    p.add_argument("--pedagogical-notes")
    p.add_argument("--technical-notes")
    p.add_argument("--decision", required=True, choices=["approved", "changes_requested", "rejected"])
    p.set_defaults(func=cmd_insert_review)

    p = sub.add_parser("pending-review", help="List curriculum units awaiting editorial review")
    p.set_defaults(func=cmd_pending_review)

    p = sub.add_parser("stale-units", help="List shipped curriculum units older than N days")
    p.add_argument("--older-than-days", type=int, default=60)
    p.set_defaults(func=cmd_stale_units)

    p = sub.add_parser("insert-decay-flag", help="Flag a curriculum unit for staleness")
    p.add_argument("--curriculum-unit-id", type=int, required=True)
    p.add_argument("--reason", required=True)
    p.set_defaults(func=cmd_insert_decay_flag)

    p = sub.add_parser("log-telemetry", help="Log a solo-practitioner telemetry event")
    p.add_argument("--curated-item-id", type=int, required=True)
    p.add_argument("--event-type", required=True,
                    choices=["surfaced", "opened", "cited_in_post", "promoted_to_curriculum"])
    p.add_argument("--detail")
    p.set_defaults(func=cmd_log_telemetry)

    return parser


if __name__ == "__main__":
    args = build_parser().parse_args()
    args.func(args)
