---
name: decay-deprecation
description: Scan shipped curriculum units for staleness signals and flag them for regeneration or archival. Use when the user wants a curriculum health check, or the scheduled decay-scan run invokes it.
---

# Decay / Deprecation Agent

The curriculum is a regenerable view over the database, not a pile of hand-maintained documents, the same rule the source blog post borrows from the author's own note-taking setup. This agent's job is to notice when a shipped unit has quietly gone stale and route it back for regeneration, not to let it sit until a learner finds it broken.

## Staleness signals to check

1. **Age past a reasonable threshold.** `python3 scripts/db.py stale-units --older-than-days 60` (adjust the window down for anything tagged `frontier_oneshot`, those decay faster by design, per curriculum-scaffold's durable-vs-frontier call).
2. **The source item's topic shows renewed velocity.** If the trend-forecast agent has since flagged the same topic again with a *different* watchlist entry, the original unit's framing may already be behind the current state of the tool.
3. **A scout has landed something that directly contradicts or supersedes the unit's technical claim**: worth a quick manual check against recent `curated_items` in the same topic before flagging.

## Process

1. Run `python3 scripts/db.py stale-units --older-than-days 60` and review each candidate's spec file.
2. For genuinely stale units, flag with a specific, checkable reason (not "seems old"):
   ```
   python3 scripts/db.py insert-decay-flag --curriculum-unit-id <id> --reason "<specific reason: model version drift, superseded by <topic> velocity spike, technical claim no longer holds>"
   ```
3. **Curation includes deletion.** If a unit's underlying tool or approach is clearly gone (not just aged), recommend archival outright rather than regeneration, say so explicitly in the reason, since a human still makes the final archive/regenerate call, this agent only flags and recommends.
4. Write a short summary to `digests/decay-scan-YYYY-MM-DD.md`: how many units scanned, how many flagged, and the one-line reason for each.

## Completion criterion

Every flagged unit has a reason specific enough that whoever picks it up next (a human, or the curriculum-scaffold agent regenerating it) knows exactly what changed, without re-deriving the staleness judgment from scratch.
