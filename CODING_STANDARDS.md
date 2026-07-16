# Coding standards

Agent-readable rules for this repo. `/code-review` Standards axis reads this file. Documented standards here override the Fowler smell baseline.

## Source of truth

- SQL is durable structured state. `db/maes.sqlite3` is gitignored. Regenerable markdown lives under `published/` (category/date) and is pushed via `scripts/publish-output.sh`; regenerate from the DB rather than hand-editing.
- Schema lives in `db/schema.sql`. Prefer additive migrations; document hard trade-offs as ADRs under `docs/adr/`.

## Database access

- Every database read or write goes through `scripts/db.py`. Do not embed freehand SQL in skills, one-off scripts, or dashboard code paths that bypass the CLI.
- Exception: the dashboard reads SQLite directly through `dashboard/lib/db.ts` (read-only by design, see `.cursor/BUGBOT.md`). Read-only SELECTs in dashboard pages are fine; any dashboard write path is not.
- If an operation does not exist yet, add a subcommand to `db.py` (and a test under `tests/`) before using it.

## Agents and skills

- Curriculum pipeline skills live in `.claude/skills/` and are invoked as `/skill-name`. Engineering skills (Matt Pocock pack) are separate; do not duplicate them into `.claude/skills/`.
- `editorial-review` never records an `approved` decision without a human stating it in the conversation.
- `lab-generation` produces a lab spec only. Never provision live cloud infrastructure or wire cloud credentials into this repo without explicit human sign-off.
- Do not add `curriculum-scaffold`, `lab-generation`, or `editorial-review` to `scripts/weekly.sh` or systemd timers.

## Scouts and pipeline

- New scouts follow `scouts/base.py`. `insert_item()` is idempotent on `(scout, source_url)`.
- Register scout tiers in `SCOUT_TIER` or `BLOG_CATEGORY_TIER` in `pipeline/dedupe.py`; unlisted scouts default to tier 4.

## Testing

- Prefer behaviour tests at agreed seams (`/tdd`). Mock only in tests; never stub or fake data in dev or prod paths.
- Major behaviour changes get tests under `tests/` (Python) or the dashboard's test setup when that exists.

## Style and prose

- No em-dashes in anything this repo generates or documents (digests, specs, commit messages, ADRs, agent output).
- Prefer small, deep modules with clear seams over pass-through wrappers.
- Keep files focused; refactor when a file grows past roughly 200–300 lines.
- Match existing naming and import patterns in the area you touch. Do not introduce a new framework or pattern without exhausting the current one and removing the old path.

## Dashboard (Next.js)

- `node_modules/` and `.next/` are gitignored. Commit source and lockfile only.
- Prefer simple React patterns already used in `dashboard/`. Do not add speculative abstraction.
- CI runs `tsc` and `next build` (see `.github/workflows/ci.yml`). Keep the production build green; do not rely on a live `db/maes.sqlite3` being present in CI.

## PR reviews

- Cursor Bugbot uses `.cursor/BUGBOT.md`. Keep it aligned with these standards.
- Setup steps for Bugbot + required checks: `docs/agents/ci-cd.md`.

## Secrets

- Never commit `.env` or credentials. Use `.env.example` as the template for required keys.
