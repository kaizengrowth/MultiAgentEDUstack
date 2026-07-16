# Bugbot review rules — MultiAgentEDUstack

Project-specific guidance for automated PR review. Prefer findings that would break the pipeline, leak credentials, or violate hard scope boundaries.

## Hard boundaries

- Lab generation must stay spec-only. Flag any PR that provisions cloud infrastructure, adds cloud credentials, or wires billed APIs into skills/timers.
- Editorial approval is human-gated. Flag auto-approve paths, skipping human confirmation, or flipping `editorial-review` to model-invoked approval.
- Do not put `curriculum-scaffold`, `lab-generation`, or `editorial-review` on systemd timers or `scripts/weekly.sh`.

## Data and SQL

- SQL (`db/maes.sqlite3` via `db/schema.sql`) is the source of truth. Flag hand-edits to generated `published/` markdown as the primary fix path; regenerate from data instead.
- Every DB read/write should go through `scripts/db.py`. Flag freehand SQL in skills, one-off scripts, or dashboard write paths that bypass the CLI.
- Scouts must stay idempotent on `(scout, source_url)` via `scouts/base.py`. New scouts need a tier in `pipeline/dedupe.py` or they default to tier 4.

## Security

- Never commit `.env`, API tokens, OAuth secrets, or cloud credentials. `.env.example` is the only template.
- Flag SSRF / unvalidated URL fetches in scouts, command injection in shell wrappers, and path traversal when reading markdown under `published/`.
- Dashboard is read-only over SQLite. Flag any new write API or remote code execution surface.

## Testing and quality

- Prefer behaviour tests at public seams (`tests/`). Flag mocks/stubs in non-test runtime paths.
- Major scout, dedupe, or `db.py` behaviour changes should include tests.
- No em-dashes in generated docs, digests, specs, or commit-oriented prose this repo produces.

## Vocabulary

Use terms from `CONTEXT.md` (scout, raw item, curated item, digest, forecast watchlist, curriculum unit, lab spec, editorial review, decay flag). See also `CODING_STANDARDS.md` and `docs/adr/`.
