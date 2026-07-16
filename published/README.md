# Published pipeline output

Git-tracked markdown views produced by the MultiAgentEDUstack pipeline.
SQLite (`db/maes.sqlite3`) remains the structured source of truth; these files
are regenerable teaching artifacts, kept here so they sync to GitHub.

## Layout

```
published/
  digests/YYYY-MM-DD.md       daily article digest
  forecasts/YYYY-MM-DD.md     trend-forecast note
  wiki/YYYY-MM-DD.md          weekly wiki (period end / Sunday date)
  curriculum/YYYY-MM-DD/      curriculum unit specs created that day
  labs/YYYY-MM-DD/            lab specs created that day
  decay/YYYY-MM-DD.md         decay-scan summaries (when run)
```

Paths recorded in the database (`markdown_path`, `spec_path`) point here.
After scheduled or manual generation, `scripts/publish-output.sh` commits and
pushes changes under `published/`.
