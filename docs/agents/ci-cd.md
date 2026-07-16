# CI/CD and PR auto-review

## GitHub Actions (in repo)

Workflows: `.github/workflows/ci.yml` (tests and build) and
`.github/workflows/claude-review.yml` (automated review).

| Job | When | What |
| --- | --- | --- |
| Python tests | every PR + push to `main` | `pytest` via `requirements-dev.txt` |
| Dashboard build | every PR + push to `main` | `tsc --noEmit` + `next build` against a schema-only SQLite |
| Dashboard artifact | push to `main` only | uploads `.next/standalone` as a 14-day artifact |
| PR code review | every non-draft PR commit | `anthropics/claude-code-action@v1` reviews the diff against `CODING_STANDARDS.md` and `.cursor/BUGBOT.md`, posts inline + sticky summary comments |
| Security review | every non-draft PR commit | `anthropics/claude-code-security-review` scans the diff, comments findings on the PR |
| Push review | direct push to `main` | Claude reviews the pushed range; opens a `needs-triage` issue only if it finds a boundary violation, correctness bug, leaked credential, or weakened test |

The review jobs skip silently until a credential secret exists. Two options:

```bash
# Option A: run on a Claude Pro/Max subscription (no per-run API billing).
claude setup-token   # interactive; prints a long-lived OAuth token
gh secret set CLAUDE_CODE_OAUTH_TOKEN --repo kaizengrowth/MultiAgentEDUstack

# Option B: Console API key, billed per use.
gh secret set ANTHROPIC_API_KEY --repo kaizengrowth/MultiAgentEDUstack
```

PR code review and push review accept either secret. The security-review
job accepts only `ANTHROPIC_API_KEY` and stays skipped on
subscription-only auth. Subscription runs draw from the same usage
limits as interactive Claude Code sessions.

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
