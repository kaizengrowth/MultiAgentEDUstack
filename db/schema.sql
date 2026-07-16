-- MultiAgentEDUstack storage schema.
-- SQL is the source of truth; digests, forecasts, and curriculum units are
-- regenerable views over `items`, the same discipline as the OB1/Open Brain
-- "wiki is a build artifact" rule.

PRAGMA foreign_keys = ON;

-- Raw items landed by scouts, before credibility scoring / dedup.
CREATE TABLE IF NOT EXISTS raw_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scout TEXT NOT NULL,                 -- e.g. 'arxiv', 'hn', 'github_trending', 'youtube'
    source_url TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    author TEXT,
    published_at TEXT,                   -- ISO8601 if known
    raw_metadata TEXT,                   -- JSON blob, scout-specific fields
    fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (scout, source_url)
);

-- Curated items after the credibility/dedup pass. One row per distinct
-- story; raw_items that describe the same story point at the same curated_item.
CREATE TABLE IF NOT EXISTS curated_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    canonical_url TEXT NOT NULL UNIQUE,
    tier INTEGER NOT NULL,               -- 1 (primary research) .. 5 (social chatter)
    tier_label TEXT NOT NULL,
    topic TEXT,                          -- assigned during synthesis, nullable until then
    confidence TEXT,                     -- 'high' | 'medium' | 'low'
    first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    mention_count INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'new'   -- 'new' | 'digested' | 'archived'
);

-- Which raw_items merged into which curated_item (the dedup audit trail).
CREATE TABLE IF NOT EXISTS item_merges (
    raw_item_id INTEGER NOT NULL REFERENCES raw_items(id),
    curated_item_id INTEGER NOT NULL REFERENCES curated_items(id),
    PRIMARY KEY (raw_item_id, curated_item_id)
);

-- One row per daily digest run (Synthesis / Digest agent output).
CREATE TABLE IF NOT EXISTS digests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_at TEXT NOT NULL DEFAULT (datetime('now')),
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    markdown_path TEXT NOT NULL,
    item_count INTEGER NOT NULL
);

-- Trend-forecasting watchlist entries (leading-indicator candidates).
CREATE TABLE IF NOT EXISTS forecast_watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    signal_summary TEXT NOT NULL,        -- why this is flagged (velocity, CFP, star growth, etc.)
    confidence TEXT NOT NULL,            -- 'high' | 'medium' | 'low'
    first_flagged_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'watching' -- 'watching' | 'promoted' | 'expired'
);

-- Curriculum units produced by the Curriculum Scaffolding agent.
CREATE TABLE IF NOT EXISTS curriculum_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    competency TEXT NOT NULL,            -- tool_operation | critical_evaluation | workflow_integration | building_ai_native
    proficiency_level INTEGER NOT NULL,  -- 1..4
    format TEXT NOT NULL,                -- 'durable_course' | 'frontier_oneshot'
    source_curated_item_id INTEGER REFERENCES curated_items(id),
    spec_path TEXT NOT NULL,             -- markdown file with the learning objective + scaffold
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'drafted' -- 'drafted' | 'reviewed' | 'shipped' | 'archived'
);

-- Lab specs produced by the Lab Generation agent (spec only; this repo does
-- not provision live cloud infrastructure, see README).
CREATE TABLE IF NOT EXISTS lab_specs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curriculum_unit_id INTEGER NOT NULL REFERENCES curriculum_units(id),
    objective TEXT NOT NULL,
    spec_path TEXT NOT NULL,
    target_time_pct INTEGER,             -- self-reported estimate at draft time
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'drafted'
);

-- Editorial review outcomes (human-gated; see agents/editorial-review).
CREATE TABLE IF NOT EXISTS editorial_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_type TEXT NOT NULL,           -- 'curriculum_unit' | 'lab_spec' | 'digest'
    target_id INTEGER NOT NULL,
    pedagogical_notes TEXT,
    technical_notes TEXT,
    decision TEXT,                       -- 'approved' | 'changes_requested' | 'rejected'
    reviewed_at TEXT
);

-- Solo-practitioner behavior-change telemetry. Scoped down from the
-- enterprise design in the blog post (no toolchain-wide instrumentation
-- available here): tracks whether a surfaced item actually got used.
CREATE TABLE IF NOT EXISTS telemetry_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curated_item_id INTEGER REFERENCES curated_items(id),
    event_type TEXT NOT NULL,            -- 'surfaced' | 'opened' | 'cited_in_post' | 'promoted_to_curriculum'
    detail TEXT,
    occurred_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Decay / deprecation tracking for shipped curriculum.
CREATE TABLE IF NOT EXISTS decay_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curriculum_unit_id INTEGER NOT NULL REFERENCES curriculum_units(id),
    reason TEXT NOT NULL,
    flagged_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolution TEXT                      -- 'regenerated' | 'archived' | null while open
);

-- Weekly wiki pages: regenerable rollups of daily digests (Sunday build).
CREATE TABLE IF NOT EXISTS wiki_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    markdown_path TEXT NOT NULL,
    digest_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_raw_items_scout ON raw_items(scout);
CREATE INDEX IF NOT EXISTS idx_curated_items_tier ON curated_items(tier);
CREATE INDEX IF NOT EXISTS idx_curated_items_status ON curated_items(status);
CREATE INDEX IF NOT EXISTS idx_digests_run_at ON digests(run_at);
