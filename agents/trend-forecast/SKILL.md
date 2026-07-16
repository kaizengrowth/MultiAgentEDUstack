---
name: trend-forecast
description: Scan curated items for leading-indicator signals (velocity, not volume) and update the forecast watchlist with what's likely to matter in 8-12 weeks. Use when the user wants a trend forecast, asks what's coming, or the scheduled forecast run invokes it.
---

# Trend-Forecasting Agent

Score "how fast is this changing" rather than "how much of this is there." A topic with five mentions this week and zero last week is a stronger signal than a topic with fifty mentions steady for months. This is a *derivative*, not a snapshot — the same distinction the digest agent doesn't need to make, which is why this is a separate agent, not a step inside synthesis.

## Signals to look for, in the current curated_items and raw_items

1. **arXiv submission velocity within a narrow subfield.** Query recent `tier = 1` items grouped by topic (after synthesis-digest has assigned topics); a topic with a sudden jump in count versus its trailing average is a candidate.
2. **Corroboration velocity.** Items with `mention_count > 1` that reached that count *fast* (check `first_seen_at` vs `last_seen_at` in curated_items) are more interesting than ones that slowly accumulated mentions over months.
3. **GitHub trending repos** (`scout = 'github_trending'` in raw_items) with high `stars_today` relative to `stars_total` — a repo picking up stars fast in its first weeks, not a large-but-flat count.
4. **Workshop/CFP language.** Scan recent items' titles and summaries for "workshop," "call for papers," "shared task" — these are six-to-nine-month leading indicators per the source blog post, rarer than paper mentions but worth more when found.
5. **New terminology showing up across independent sources** — the same non-obvious phrase appearing in an arXiv abstract, a lab blog, and a practitioner newsletter within the same week or two, independently, is a stronger signal than any one mention.

## Process

1. Query the last 2-4 weeks of `curated_items` (adjust the window to whatever the scheduled cadence actually is) and look for the patterns above. Use `sqlite3` directly against `db/maes.sqlite3` for exploratory queries — this agent's job is judgment over the data, not a fixed script.
2. For each real candidate (don't force a quota — a quiet month with nothing genuinely accelerating is a valid outcome, report that honestly), record it:
   ```
   python3 scripts/db.py insert-watchlist --topic "<topic>" --signal-summary "<what specifically you saw and why it counts as velocity, not volume>" --confidence <high|medium|low>
   ```
3. Write a short markdown note to `digests/forecast-YYYY-MM-DD.md` explaining each entry in one paragraph: what the signal is, why it's a leading indicator and not just noise, and what "worth teaching this" would look like if it keeps accelerating.

## Completion criterion

Every watchlist entry states the specific signal (a number, a rate, a co-occurrence) that earned it a place here — "AI agents seem important" is not a forecast, "narrow-subfield arXiv volume in agentic evaluation went from 2/week to 9/week over three weeks, independently corroborated by two newsletters" is.
