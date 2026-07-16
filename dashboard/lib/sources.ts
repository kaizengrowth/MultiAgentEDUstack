import fs from "fs";
import path from "path";
import { load as loadYaml } from "js-yaml";
import { query } from "@/lib/db";

export type SourceCategory = {
  id: string;
  label: string;
};

export type CatalogSource = {
  name: string;
  url: string;
  category: string;
  best_for: string;
  attribution?: string;
};

export type SourceActivity = {
  itemCount: number;
  lastFetch: string | null;
  scout: string | null;
};

export type EnrichedSource = CatalogSource &
  SourceActivity & {
    status: "active" | "quiet" | "cataloged";
  };

export type RecentLanding = {
  id: number;
  scout: string;
  title: string;
  source_url: string;
  fetched_at: string;
  sourceLabel: string;
};

type SourcesFile = {
  categories: SourceCategory[];
  items: CatalogSource[];
};

type ActivityRow = {
  scout: string;
  source_name: string | null;
  channel_url: string | null;
  meta_category: string | null;
  n: number;
  last_fetch: string | null;
};

const SOURCES_PATH = path.resolve(process.cwd(), "..", "data", "sources.yaml");

const PLATFORM_BY_NAME: Record<string, string> = {
  "Hacker News": "hn",
  "GitHub Trending": "github_trending",
  "X / Twitter": "x",
  Bluesky: "bluesky",
  "Semantic Scholar": "semantic_scholar",
};

const REDDIT_BY_NAME: Record<string, string> = {
  "r/MachineLearning": "%MachineLearning%",
  "r/LocalLLaMA": "%LocalLLaMA%",
};

export function loadSourceCatalog(): SourcesFile {
  const raw = fs.readFileSync(SOURCES_PATH, "utf8");
  const data = loadYaml(raw) as SourcesFile;
  return {
    categories: data.categories || [],
    items: data.items || [],
  };
}

function arxivCategoryFromName(name: string): string | null {
  const m = name.match(/arXiv\s+(cs\.\w+)/i);
  return m ? m[1] : null;
}

async function loadActivityRows(): Promise<ActivityRow[]> {
  return query<ActivityRow>(
    `SELECT
       scout,
       json_extract(raw_metadata, '$.source_name') as source_name,
       json_extract(raw_metadata, '$.channel_url') as channel_url,
       json_extract(raw_metadata, '$.category') as meta_category,
       COUNT(*) as n,
       MAX(fetched_at) as last_fetch
     FROM raw_items
     GROUP BY scout, source_name, channel_url, meta_category`
  );
}

async function loadRedditActivity(): Promise<
  Map<string, { n: number; last_fetch: string | null }>
> {
  const map = new Map<string, { n: number; last_fetch: string | null }>();
  for (const [name, pattern] of Object.entries(REDDIT_BY_NAME)) {
    const row = await queryOneCount(
      `SELECT COUNT(*) as n, MAX(fetched_at) as last_fetch
       FROM raw_items
       WHERE scout = 'reddit' AND source_url LIKE ?`,
      [pattern]
    );
    map.set(name, row);
  }
  return map;
}

async function queryOneCount(
  sql: string,
  params: (string | number | null)[]
): Promise<{ n: number; last_fetch: string | null }> {
  const rows = await query<{ n: number; last_fetch: string | null }>(
    sql,
    params
  );
  return {
    n: Number(rows[0]?.n || 0),
    last_fetch: rows[0]?.last_fetch ?? null,
  };
}

function sumRows(rows: ActivityRow[]): SourceActivity & { scout: string } {
  return {
    itemCount: rows.reduce((sum, r) => sum + Number(r.n || 0), 0),
    lastFetch:
      rows
        .map((r) => r.last_fetch)
        .filter(Boolean)
        .sort()
        .at(-1) || null,
    scout: rows[0]?.scout || "",
  };
}

function matchActivity(
  item: CatalogSource,
  rows: ActivityRow[],
  reddit: Map<string, { n: number; last_fetch: string | null }>
): SourceActivity {
  if (item.name in REDDIT_BY_NAME) {
    const hit = reddit.get(item.name);
    return {
      itemCount: hit?.n ?? 0,
      lastFetch: hit?.last_fetch ?? null,
      scout: "reddit",
    };
  }

  const platformScout = PLATFORM_BY_NAME[item.name];
  if (platformScout) {
    const matched = rows.filter((r) => r.scout === platformScout);
    if (!matched.length) {
      return { itemCount: 0, lastFetch: null, scout: platformScout };
    }
    return sumRows(matched);
  }

  const arxivCat = arxivCategoryFromName(item.name);
  if (arxivCat) {
    const matched = rows.filter(
      (r) => r.scout === "arxiv" && r.meta_category === arxivCat
    );
    if (!matched.length) {
      return { itemCount: 0, lastFetch: null, scout: "arxiv" };
    }
    return sumRows(matched);
  }

  const byName = rows.filter(
    (r) => r.scout === "blog" && r.source_name === item.name
  );
  if (byName.length) return sumRows(byName);

  const byChannel = rows.filter(
    (r) => r.scout === "youtube" && r.channel_url === item.url
  );
  if (byChannel.length) return sumRows(byChannel);

  return { itemCount: 0, lastFetch: null, scout: null };
}

export async function getEnrichedSources(): Promise<{
  categories: SourceCategory[];
  sources: EnrichedSource[];
  activeCount: number;
  catalogCount: number;
}> {
  const catalog = loadSourceCatalog();
  const [rows, reddit] = await Promise.all([
    loadActivityRows(),
    loadRedditActivity(),
  ]);

  const sources: EnrichedSource[] = catalog.items.map((item) => {
    const activity = matchActivity(item, rows, reddit);
    const status: EnrichedSource["status"] =
      activity.itemCount > 0
        ? "active"
        : activity.scout
          ? "quiet"
          : "cataloged";
    return { ...item, ...activity, status };
  });

  return {
    categories: catalog.categories,
    sources,
    activeCount: sources.filter((s) => s.status === "active").length,
    catalogCount: sources.length,
  };
}

export async function getRecentLandings(
  limit = 24
): Promise<RecentLanding[]> {
  const catalog = loadSourceCatalog();
  const byName = new Map(catalog.items.map((i) => [i.name, i]));
  const byUrl = new Map(catalog.items.map((i) => [i.url, i]));

  type Row = {
    id: number;
    scout: string;
    title: string;
    source_url: string;
    fetched_at: string;
    source_name: string | null;
    channel_url: string | null;
    meta_category: string | null;
  };

  const rows = await query<Row>(
    `SELECT
       id, scout, title, source_url, fetched_at,
       json_extract(raw_metadata, '$.source_name') as source_name,
       json_extract(raw_metadata, '$.channel_url') as channel_url,
       json_extract(raw_metadata, '$.category') as meta_category
     FROM raw_items
     ORDER BY fetched_at DESC, id DESC
     LIMIT ?`,
    [limit]
  );

  return rows.map((row) => {
    let sourceLabel = row.scout;
    if (row.source_name && byName.has(row.source_name)) {
      sourceLabel = row.source_name;
    } else if (row.channel_url && byUrl.has(row.channel_url)) {
      sourceLabel = byUrl.get(row.channel_url)!.name;
    } else if (row.scout === "arxiv" && row.meta_category) {
      sourceLabel = `arXiv ${row.meta_category}`;
    } else if (row.scout === "hn") {
      sourceLabel = "Hacker News";
    } else if (row.scout === "github_trending") {
      sourceLabel = "GitHub Trending";
    } else if (row.scout === "reddit") {
      if (row.source_url.includes("LocalLLaMA")) sourceLabel = "r/LocalLLaMA";
      else if (row.source_url.includes("MachineLearning"))
        sourceLabel = "r/MachineLearning";
      else sourceLabel = "Reddit";
    }
    return {
      id: row.id,
      scout: row.scout,
      title: row.title,
      source_url: row.source_url,
      fetched_at: row.fetched_at,
      sourceLabel,
    };
  });
}
