#!/usr/bin/env python3
"""CLI the LLM-driven agents (.claude/skills/*/SKILL.md) shell out to for every
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


def cmd_item_details(args: argparse.Namespace) -> None:
    conn = get_connection()
    if args.item_ids:
        placeholders = ",".join("?" for _ in args.item_ids)
        where = f"ci.id IN ({placeholders})"
        params = list(args.item_ids)
    else:
        where = "ci.status = 'new'"
        params = []
    rows = conn.execute(
        f"""
        SELECT ci.id, ci.title, ci.canonical_url, ci.tier, ci.tier_label,
               ci.mention_count, ci.topic,
               ri.scout, ri.summary, ri.published_at, ri.raw_metadata
        FROM curated_items ci
        JOIN item_merges im ON im.curated_item_id = ci.id
        JOIN raw_items ri ON ri.id = im.raw_item_id
        WHERE {where}
        ORDER BY ci.id ASC, ri.id ASC
        """,
        params,
    ).fetchall()
    conn.close()
    for row in rows:
        summary = row[8]
        if summary and args.summary_chars:
            summary = summary[: args.summary_chars]
        print(json.dumps({
            "id": row[0], "title": row[1], "url": row[2],
            "tier": row[3], "tier_label": row[4],
            "mention_count": row[5], "topic": row[6],
            "scout": row[7], "summary": summary,
            "published_at": row[9],
            "raw_metadata": json.loads(row[10]) if row[10] else {},
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


def cmd_recent_digests(args: argparse.Namespace) -> None:
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT id, run_at, period_start, period_end, markdown_path, item_count
        FROM digests
        WHERE date(run_at) >= date('now', ?)
        ORDER BY run_at ASC, id ASC
        """,
        (f"-{args.days} days",),
    ).fetchall()
    conn.close()
    for row in rows:
        print(json.dumps({
            "id": row[0],
            "run_at": row[1],
            "period_start": row[2],
            "period_end": row[3],
            "markdown_path": row[4],
            "item_count": row[5],
        }))


def cmd_insert_wiki(args: argparse.Namespace) -> None:
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO wiki_pages
            (title, period_start, period_end, markdown_path, digest_count)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            args.title,
            args.period_start,
            args.period_end,
            args.markdown_path,
            args.digest_count,
        ),
    )
    conn.commit()
    conn.close()
    print(f"wiki recorded: {args.markdown_path}")


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


TELEMETRY_EVENT_TYPES = {
    # desk / pipeline
    "surfaced",
    "opened",
    "cited_in_post",
    "promoted_to_curriculum",
    # learning (curriculum unit)
    "unit_opened",
    "summary_completed",
    "quiz_attempted",
    "quiz_passed",
    "exercise_submitted",
    "project_started",
    "project_completed",
    "transfer_observed",
}


def cmd_log_telemetry(args: argparse.Namespace) -> None:
    if args.curated_item_id is None and args.curriculum_unit_id is None:
        raise SystemExit(
            "log-telemetry requires --curated-item-id and/or --curriculum-unit-id"
        )
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO telemetry_events
            (curated_item_id, curriculum_unit_id, event_type, detail)
        VALUES (?, ?, ?, ?)
        """,
        (
            args.curated_item_id,
            args.curriculum_unit_id,
            args.event_type,
            args.detail,
        ),
    )
    conn.commit()
    conn.close()
    target = []
    if args.curated_item_id is not None:
        target.append(f"item {args.curated_item_id}")
    if args.curriculum_unit_id is not None:
        target.append(f"unit {args.curriculum_unit_id}")
    print(f"telemetry: {' / '.join(target)} -- {args.event_type}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("new-items", help="List curated items not yet digested")
    p.add_argument("--limit", type=int, default=100)
    p.set_defaults(func=cmd_new_items)

    p = sub.add_parser(
        "item-details",
        help="Show curated items joined to their raw scout rows (summary, venue)",
    )
    p.add_argument("item_ids", type=int, nargs="*")
    p.add_argument("--summary-chars", type=int, default=600)
    p.set_defaults(func=cmd_item_details)

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

    p = sub.add_parser(
        "recent-digests",
        help="List digest runs from the last N days (for weekly-wiki)",
    )
    p.add_argument("--days", type=int, default=7)
    p.set_defaults(func=cmd_recent_digests)

    p = sub.add_parser("insert-wiki", help="Record a completed weekly wiki page")
    p.add_argument("--title", required=True)
    p.add_argument("--period-start", required=True)
    p.add_argument("--period-end", required=True)
    p.add_argument("--markdown-path", required=True)
    p.add_argument("--digest-count", type=int, required=True)
    p.set_defaults(func=cmd_insert_wiki)

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

    p = sub.add_parser("log-telemetry", help="Log a desk or learning telemetry event")
    p.add_argument("--curated-item-id", type=int)
    p.add_argument("--curriculum-unit-id", type=int)
    p.add_argument(
        "--event-type",
        required=True,
        choices=sorted(TELEMETRY_EVENT_TYPES),
    )
    p.add_argument("--detail")
    p.set_defaults(func=cmd_log_telemetry)

    return parser


if __name__ == "__main__":
    args = build_parser().parse_args()
    args.func(args)
