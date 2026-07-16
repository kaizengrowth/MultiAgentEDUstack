---
name: synthesis-digest
description: Turn newly curated items into a short daily digest of article summaries, grouped by topic. Use when the user wants today's digest, asks what landed recently, or the scheduled daily digest run invokes it.
---

# Synthesis / Digest Agent (daily)

Turn everything the scouts landed and the dedup pass curated since the last digest into one short **daily** digest of new-article summaries. Read `python3 scripts/db.py new-items --limit 300` for the queue: each row already carries its credibility tier, so trust it, don't re-derive it.

This skill is for the day-to-day feed. The durable weekly rollup is `/weekly-wiki` (Sundays).

## Process

1. **Pull the queue.** Run `python3 scripts/db.py new-items --limit 300` from the repo root. Empty queue: write nothing, report "no new items since last digest," done.
2. **Assign topics.** For each item without a topic, read title + summary (for `youtube` items, the transcript path in raw_metadata is worth opening if the summary preview is too thin to judge) and assign a short topic label (2-4 words: "Agentic Evaluation," "Local Inference," "AI Labor Effects," reuse a label already in use this run before inventing a new one). Record it: `python3 scripts/db.py set-topic <item_id> "<topic>"`.
3. **Group and write.** Organize the digest by topic, not by scout or tier: a reader should see "Agentic Evaluation" as a heading, not "arXiv" as a heading. Within each topic, order by tier (1 first). For each item: a brief paragraph (2-4 sentences) summarizing what the article, paper, or release actually says, the mechanism behind it, and why it matters for teaching, followed by the tier label and the link. Every item in the queue gets covered; nothing is reduced to a bare link. Items with `mention_count > 1` (corroborated across sources) are worth flagging as such. Research papers arrive peer-reviewed only (the arxiv and semantic_scholar scouts filter out preprints), so name the venue when the metadata has one.
4. **Close with three insight sections**, in this order, each grounded in the items above (cite them by title, never invent evidence):
   - **Trends**: 2-4 short paragraphs on patterns visible across today's items: what themes are recurring, what is accelerating or cooling, where independent sources are converging. Velocity over volume.
   - **Predictions**: 1-2 paragraphs on what today's signals suggest for the near future of AI (an 8-12 week horizon, same as the forecast watchlist). Hedge honestly: state the signal, the inference, and what would confirm or kill it. If a prediction firms up across several digests, promote it via `/trend-forecast` rather than restating it daily.
   - **Top picks**: the 3-5 highest-quality items of the run, each with its link and one sentence on why it beat the rest (tier, corroboration, methodological rigor, or direct teaching value).
5. **Save the digest** to `published/digests/YYYY-MM-DD.md` (create parent dirs if needed). This tree is git-tracked and pushed to GitHub. Use house style: direct, no hype-adjectives, name the mechanism not just the headline. Keep it scannable: this is a daily brief, not a weekly essay.
6. **Record the run and close the loop:**
   ```
   python3 scripts/db.py insert-digest --period-start <ISO date of oldest item> --period-end <today> --markdown-path published/digests/YYYY-MM-DD.md --item-count <N>
   python3 scripts/db.py mark-digested <id1> <id2> ...
   bash scripts/publish-output.sh
   ```
   Mark every item that made it into the digest, in one call. Items you deliberately excluded stay `new`. Don't mark-digested items you didn't write up. `publish-output.sh` commits and pushes `published/` when anything changed.

## Writing style

No em-dashes in anything you write here (digests, specs, notes). Use a colon, comma, or period instead. This is a standing preference for everything this pipeline produces, not just this skill.

## Completion criterion

Every item returned by `new-items` at the start of the run is either written up in the digest and marked digested, or left `new` with a reason you can state if asked. No item should just vanish.
