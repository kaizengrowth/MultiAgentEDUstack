# ADR-0001: SQL is the source of truth

## Status

Accepted

## Context

The curriculum pipeline produces digests, wiki pages, curriculum units, lab specs, and transcripts as markdown. Those files are easy to hand-edit, which would fork "truth" away from the SQLite store agents and scouts already write to.

## Decision

`db/maes.sqlite3` (schema in `db/schema.sql`) is the only durable structured state. Generated markdown under `published/` (digests, forecasts, wiki, curriculum, labs, decay) is a regenerable teaching view, also synced to GitHub for sharing. Agents read and write the database through `scripts/db.py`, not freehand SQL and not by editing generated files as the primary store.

## Consequences

- Fix data in SQLite (via `db.py`), then regenerate output under `published/`.
- Skills and scripts that need new queries extend `db.py` instead of embedding SQL.
- `scripts/publish-output.sh` commits and pushes `published/` after generation so GitHub stays current.
- Legacy root dirs (`digests/`, `wiki/`, `curriculum/`, `labs/`, `transcripts/`) remain gitignored if present locally.
