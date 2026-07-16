# CI/CD and PR auto-review

## GitHub Actions (in repo)

Workflow: `.github/workflows/ci.yml`

| Job | When | What |
| --- | --- | --- |
| Python tests | every PR + push to `main` | `pytest` via `requirements-dev.txt` |
| Dashboard build | every PR + push to `main` | `tsc --noEmit` + `next build` against a schema-only SQLite |
| Dashboard artifact | push to `main` only | uploads `.next/standalone` as a 14-day artifact |

Dependabot: `.github/dependabot.yml` (Actions, pip, dashboard npm).

There is no hosted deploy target in this repo yet. "CD" today means publishing the dashboard standalone build artifact from `main`. Wire a host (Vercel, Fly, systemd unit, etc.) later and replace or extend the artifact job.

## Cursor Bugbot (PR auto-review)

Bugbot is not a workflow file; it is the Cursor GitHub app. Enable it once:

1. Open [cursor.com/dashboard](https://cursor.com/dashboard) → Integrations → connect GitHub.
2. Install/authorize the Cursor GitHub app on `kaizengrowth/MultiAgentEDUstack`.
3. In the Bugbot section, enable this repository (auto-review on each PR update).
4. Optional: GitHub → Settings → Branches → protect `main`, require status checks:
   - `Python tests` / `Dashboard build` (from Actions)
   - `Cursor Bugbot` (from Bugbot)
5. Manual re-run on a PR: comment `cursor review` or `bugbot run`.

Project rules live in `.cursor/BUGBOT.md` (committed). They encode the same boundaries as `CODING_STANDARDS.md`.

## Local review skills (not the PR pipeline)

These run in Cursor chat, not on GitHub:

- `/review-bugbot` — Bugbot-style pass on the local diff
- `/review-security` — security-review subagent on the local diff
- `/code-review` — Matt Pocock Standards + Spec axes

Use them before opening a PR; Bugbot covers the GitHub side after push.
