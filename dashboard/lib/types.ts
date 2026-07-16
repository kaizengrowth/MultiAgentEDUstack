export type Tier = 1 | 2 | 3 | 4 | 5;

export interface CuratedItem {
  id: number;
  title: string;
  canonical_url: string;
  tier: Tier;
  tier_label: string;
  topic: string | null;
  confidence: string | null;
  first_seen_at: string;
  last_seen_at: string;
  mention_count: number;
  status: "new" | "digested" | "archived";
}

export interface RawItem {
  id: number;
  scout: string;
  source_url: string;
  title: string;
  summary: string | null;
  author: string | null;
  published_at: string | null;
  raw_metadata: string;
  fetched_at: string;
}

export interface Digest {
  id: number;
  run_at: string;
  period_start: string;
  period_end: string;
  markdown_path: string;
  item_count: number;
}

export interface WikiPage {
  id: number;
  title: string;
  period_start: string;
  period_end: string;
  markdown_path: string;
  digest_count: number;
  created_at: string;
}

export interface WatchlistEntry {
  id: number;
  topic: string;
  signal_summary: string;
  confidence: "high" | "medium" | "low";
  first_flagged_at: string;
  status: "watching" | "promoted" | "expired";
}

export interface CurriculumUnit {
  id: number;
  title: string;
  competency:
    | "tool_operation"
    | "critical_evaluation"
    | "workflow_integration"
    | "building_ai_native";
  proficiency_level: 1 | 2 | 3 | 4;
  format: "durable_course" | "frontier_oneshot";
  source_curated_item_id: number | null;
  spec_path: string;
  created_at: string;
  status: "drafted" | "reviewed" | "shipped" | "archived";
}

export interface LabSpec {
  id: number;
  curriculum_unit_id: number;
  objective: string;
  spec_path: string;
  target_time_pct: number | null;
  created_at: string;
  status: string;
}

export interface EditorialReview {
  id: number;
  target_type: "curriculum_unit" | "lab_spec" | "digest";
  target_id: number;
  pedagogical_notes: string | null;
  technical_notes: string | null;
  decision: "approved" | "changes_requested" | "rejected" | null;
  reviewed_at: string | null;
}

export interface DecayFlag {
  id: number;
  curriculum_unit_id: number;
  reason: string;
  flagged_at: string;
  resolution: string | null;
}

export const TIER_LABELS: Record<Tier, string> = {
  1: "Primary research",
  2: "Lab/vendor primary source",
  3: "Named practitioner synthesis",
  4: "Aggregator/newsletter digest",
  5: "Social/community chatter",
};

export const SCOUT_LABELS: Record<string, string> = {
  arxiv: "arXiv",
  semantic_scholar: "Semantic Scholar",
  hn: "Hacker News",
  github_trending: "GitHub Trending",
  blog: "Blog / Newsletter",
  youtube: "YouTube",
  reddit: "Reddit",
  bluesky: "Bluesky",
  x: "X",
};
