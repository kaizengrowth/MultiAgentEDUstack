import { query, queryOne } from "@/lib/db";
import { StatTile } from "@/components/StatTile";
import { TierBarChart } from "@/components/TierBarChart";
import { ActivitySparkline } from "@/components/ActivitySparkline";
import { TierBadge } from "@/components/TierBadge";
import { CuratedItem, Tier } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getOverviewData() {
  const [curatedCount, rawCount, digestCount, curriculumCount, pendingReviewCount] =
    await Promise.all([
      queryOne<{ n: number }>("SELECT COUNT(*) as n FROM curated_items"),
      queryOne<{ n: number }>("SELECT COUNT(*) as n FROM raw_items"),
      queryOne<{ n: number }>("SELECT COUNT(*) as n FROM digests"),
      queryOne<{ n: number }>("SELECT COUNT(*) as n FROM curriculum_units"),
      queryOne<{ n: number }>(
        `SELECT COUNT(*) as n FROM curriculum_units cu
         LEFT JOIN editorial_reviews er ON er.target_type = 'curriculum_unit' AND er.target_id = cu.id
         WHERE er.id IS NULL AND cu.status = 'drafted'`
      ),
    ]);

  const tierRows = await query<{ tier: Tier; n: number }>(
    "SELECT tier, COUNT(*) as n FROM curated_items GROUP BY tier"
  );
  const tierCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<Tier, number>;
  tierRows.forEach((r) => (tierCounts[r.tier] = r.n));

  const dailyRows = await query<{ day: string; n: number }>(
    `SELECT date(fetched_at) as day, COUNT(*) as n
     FROM raw_items
     WHERE fetched_at >= date('now', '-13 days')
     GROUP BY day ORDER BY day ASC`
  );
  const dayMap = new Map(dailyRows.map((r) => [r.day, r.n]));
  const points = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const key = d.toISOString().slice(0, 10);
    return { date: key, count: dayMap.get(key) ?? 0 };
  });

  const recent = await query<CuratedItem>(
    "SELECT * FROM curated_items ORDER BY id DESC LIMIT 8"
  );

  return {
    curatedCount: curatedCount?.n ?? 0,
    rawCount: rawCount?.n ?? 0,
    digestCount: digestCount?.n ?? 0,
    curriculumCount: curriculumCount?.n ?? 0,
    pendingReviewCount: pendingReviewCount?.n ?? 0,
    tierCounts,
    points,
    recent,
  };
}

export default async function OverviewPage() {
  const data = await getOverviewData();

  return (
    <div className="flex flex-col gap-8">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          Overview
        </h1>
        <p className="mt-2 text-base leading-relaxed text-ink-secondary">
          A clear view of what your team has gathered, curated, and ready to turn
          into teaching.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Dispatches" value={data.curatedCount} sublabel="curated stories" />
        <StatTile label="Raw items" value={data.rawCount} sublabel="before dedup" />
        <StatTile label="Bulletins" value={data.digestCount} sublabel="weekly digests" />
        <StatTile label="Curriculum" value={data.curriculumCount} sublabel="units drafted" />
        <StatTile
          label="Awaiting review"
          value={data.pendingReviewCount}
          sublabel="editorial queue"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
            Dispatches by credibility tier
          </h2>
          <div className="mt-4">
            <TierBarChart counts={data.tierCounts} />
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
            Gathering activity, last 14 days
          </h2>
          <div className="mt-4">
            <ActivitySparkline points={data.points} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Recent dispatches
            </h2>
            <Link
              href="/dispatches"
              className="text-sm font-medium text-accent hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="mt-3 flex flex-col divide-y divide-hairline">
            {data.recent.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <TierBadge tier={item.tier} label={item.tier_label} />
                <Link
                  href={`/dispatches/${item.id}`}
                  className="flex-1 truncate text-base text-ink hover:text-accent"
                >
                  {item.title}
                </Link>
                {item.mention_count > 1 && (
                  <span className="shrink-0 text-xs text-ink-muted">
                    &times;{item.mention_count}
                  </span>
                )}
              </li>
            ))}
            {data.recent.length === 0 && (
              <li className="py-8 text-center text-sm text-ink-muted">
                Nothing curated yet. Start with{" "}
                <code className="rounded bg-surface-raised px-1.5 py-0.5 text-ink">
                  scripts/ingest.sh
                </code>
                .
              </li>
            )}
          </ul>
        </div>

        <div className="panel p-5">
          <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
            Cadence
          </h2>
          <dl className="mt-4 flex flex-col gap-4 text-sm">
            <div>
              <dt className="font-medium text-ink">Daily gather</dt>
              <dd className="mt-0.5 text-ink-secondary">
                02:15 · scouts and dedup
              </dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Weekly synthesis</dt>
              <dd className="mt-0.5 text-ink-secondary">
                Sunday 03:00 · digest and forecast
              </dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Human judgment</dt>
              <dd className="mt-0.5 text-ink-secondary">
                Curriculum, labs, and editorial stay on purpose, not on a timer
              </dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-col gap-2">
            <Link
              href="/sources"
              className="text-sm font-medium text-accent hover:underline"
            >
              Browse sources
            </Link>
            <Link
              href="/pipeline"
              className="text-sm font-medium text-accent hover:underline"
            >
              Pipeline health
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
