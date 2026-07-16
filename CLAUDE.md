# MultiAgentEDUstack

Read `README.md` first for the architecture and what's real vs. stubbed.
Read `CONTEXT.md` for domain vocabulary and `CODING_STANDARDS.md` before writing code.
Read ADRs under `docs/adr/` that touch the area you're changing.

## Agent skills

### Issue tracker

GitHub Issues on `kaizengrowth/MultiAgentEDUstack` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical roles map 1:1 to tracker labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` plus `docs/adr/`. See `docs/agents/domain.md`.

### Engineering flow (Matt Pocock)

Idea → `/grill-with-docs` → (`/to-spec` → `/to-tickets` when multi-session) → `/implement` (drives `/tdd`) → `/code-review`. Hard bugs → `/diagnosing-bugs`. Architecture upkeep → `/improve-codebase-architecture`. Router → `/ask-matt`. Security pass → `/review-security` (Cursor). These are separate from the curriculum skills under `.claude/skills/`.

## Working in this repo

- **SQL is the source of truth.** `db/maes.sqlite3` (gitignored) is the only
  durable state; `digests/`, `curriculum/`, `labs/`, `transcripts/` are all
  regenerable output. Never hand-edit a generated digest or spec, fix the
  underlying data and regenerate.
- **Every database read/write goes through `scripts/db.py`.** Don't write
  freehand SQL in a skill or a one-off script; add a subcommand to `db.py`
  if the operation doesn't exist yet.
- **Six agent skills live in `.claude/skills/`**, not a plain `agents/`
  folder, that's the path Claude Code auto-discovers and invokes via
  `/skill-name`. If you add a seventh agent, it goes here too.
- **No em-dashes in anything this repo generates or documents.** Standing
  preference, applies to digests, specs, commit messages, everything.

## Scope boundaries, don't cross these without explicit sign-off

- `lab-generation` produces a spec, never provisions live cloud
  infrastructure. No cloud credentials are wired into this repo on purpose.
- `editorial-review` never records an `approved` decision without a human
  actually saying so in the conversation. It's `disable-model-invocation`
  for a reason, don't make it model-invoked to save a step.
- `curriculum-scaffold`, `lab-generation`, and `editorial-review` are not on
  a timer. If you're tempted to add them to `scripts/weekly.sh`, don't,
  they're judgment calls that stay manual by design.

## Adding a new scout

Follow the pattern in `scouts/base.py`: `insert_item()` is idempotent on
`(scout, source_url)`, so a new scout can just re-fetch its full target
list every run without needing its own incremental-sync logic. Add its
tier to `SCOUT_TIER` (or `BLOG_CATEGORY_TIER` if it's a blog-scout-style
category lookup) in `pipeline/dedupe.py`, or it'll default to tier 4.

## Running things by hand

```bash
bash scripts/ingest.sh                 # all scouts + dedup, no LLM
python3 scripts/db.py new-items         # see what's queued
claude -p "/synthesis-digest" --allowedTools "Bash Read Write Edit Glob Grep"
claude -p "/trend-forecast" --allowedTools "Bash Read Write Edit Glob Grep"
claude -p "/curriculum-scaffold" --allowedTools "Bash Read Write Edit"
claude -p "/lab-generation" --allowedTools "Bash Read Write Edit"
# editorial-review and decay-deprecation: run interactively, not headless,
# the former needs an actual human decision and the latter's recommendations
# are worth reading before they're acted on.
```
