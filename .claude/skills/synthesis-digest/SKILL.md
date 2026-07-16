---
name: synthesis-digest
description: Turn this week's curated items into a structured weekly digest, grouped by topic. Use when the user wants the weekly AI digest generated, asks "what happened this week", or the scheduled synthesis run invokes it.
---

# Synthesis / Digest Agent

Turn everything the scouts landed and the dedup pass curated since the last digest into one organized weekly digest. Read `python3 scripts/db.py new-items --limit 300` for the queue: each row already carries its credibility tier, so trust it, don't re-derive it.

## Process

1. **Pull the queue.** Run `python3 scripts/db.py new-items --limit 300` from the repo root. Empty queue: write nothing, report "no new items since last digest," done.
2. **Assign topics.** For each item without a topic, read title + summary (for `youtube` items, the transcript path in raw_metadata is worth opening if the summary preview is too thin to judge) and assign a short topic label (2-4 words: "Agentic Evaluation," "Local Inference," "AI Labor Effects," reuse a label already in use this run before inventing a new one). Record it: `python3 scripts/db.py set-topic <item_id> "<topic>"`.
3. **Group and write.** Organize the digest by topic, not by scout or tier: a reader should see "Agentic Evaluation" as a heading, not "arXiv" as a heading. Within each topic, order by tier (1 first). For each item: one or two sentences on what changed and why it matters, the tier label, and the link. Items with `mention_count > 1` (corroborated across sources, see the Credibility + Dedup agent) are worth flagging as such, corroboration across independent sources is itself a signal.
4. **Save the digest** to `digests/YYYY-MM-DD.md` (create the `digests/` directory if absent; it's gitignored runtime output, not source). Use the house style from the source blog post: direct, no hype-adjectives, name the mechanism not just the headline.
5. **Record the run and close the loop:**
   ```
   python3 scripts/db.py insert-digest --period-start <ISO date of oldest item> --period-end <today> --markdown-path digests/YYYY-MM-DD.md --item-count <N>
   python3 scripts/db.py mark-digested <id1> <id2> ...
   ```
   Mark every item that made it into the digest, in one call. Items you deliberately excluded (too thin, redundant with something already covered) stay `new`, don't mark-digested items you didn't actually write up, that's how the queue silently loses things.

## Writing style

No em-dashes in anything you write here (digests, specs, notes). Use a colon, comma, or period instead. This is a standing preference for everything this pipeline produces, not just this skill.

## Completion criterion

Every item returned by `new-items` at the start of the run is either written up in the digest and marked digested, or left `new` with a reason you can state if asked ("too thin to write up," "same story as #47, already covered"). No item should just vanish.
