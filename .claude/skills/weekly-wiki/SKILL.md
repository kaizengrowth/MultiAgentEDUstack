---
name: weekly-wiki
description: Compile this week's daily digests into a durable weekly wiki page. Use when the user wants the Sunday wiki rollup, asks for a weekly knowledge summary, or the scheduled weekly wiki run invokes it.
---

# Weekly Wiki Agent

Build a regenerable wiki page from the past week's daily digests. SQL remains the source of truth; the wiki markdown is a build artifact (same discipline as digests and Open Brain).

This is not a second news feed. It is a teaching-oriented weekly summary: what themes mattered, what is durable vs frontier, and what a curriculum team should remember.

## Process

1. **List this week's digests.** From the repo root:
   ```
   python3 scripts/db.py recent-digests --days 7
   ```
   Empty list: write nothing, report "no digests this week to roll into the wiki," done.
2. **Read each digest file** at the `markdown_path` returned. Optionally skim any `published/forecasts/*.md` from the last 7 days if present; do not invent forecast claims.
3. **Synthesize the wiki page** under these headings (omit a heading only if empty):
   - `# Week of YYYY-MM-DD` (use the Sunday/end date of the period)
   - `## Themes`: 3 to 7 durable topic notes. Each theme: short title, 2-4 sentences of synthesis across the week (not a paste of daily bullets), and links to the strongest source URLs.
   - `## What moved`: leading changes vs the prior week when visible from the digests (new topics, sudden corroboration, tier-1 spikes).
   - `## Teaching cues`: optional bullets: what is worth a durable lesson vs a frontier one-shot.
   - `## Digest trail`: bullet list of the daily digest paths you rolled up, with dates and item counts.
4. **Save** to `published/wiki/YYYY-MM-DD.md` (create parent dirs if needed). Use the period end / Sunday date in the filename.
5. **Record the run and publish:**
   ```
   python3 scripts/db.py insert-wiki \
     --title "Week of YYYY-MM-DD" \
     --period-start <oldest digest period_start> \
     --period-end <today or newest digest period_end> \
     --markdown-path published/wiki/YYYY-MM-DD.md \
     --digest-count <N>
   bash scripts/publish-output.sh
   ```

## Writing style

- Write for educators and nonprofit curriculum leads: clear, calm, specific.
- Prefer synthesis over reprinting every daily item.
- No em-dashes. Use a colon, comma, or period instead.
- No hype adjectives. Name mechanisms and evidence.

## Completion criterion

The wiki page exists on disk, is registered via `insert-wiki`, and a reader can tell what the week was about without opening every daily digest. If digests existed, `digest_count` matches how many you actually read.
