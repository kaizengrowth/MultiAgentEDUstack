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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-mono text-lg font-semibold text-ink">Overview</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          What the wire desk has on file, right now.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Dispatches" value={data.curatedCount} sublabel="curated stories" />
        <StatTile label="Raw items" value={data.rawCount} sublabel="pre-dedup" />
        <StatTile label="Bulletins" value={data.digestCount} sublabel="digests filed" />
        <StatTile label="Curriculum" value={data.curriculumCount} sublabel="units drafted" />
        <StatTile
          label="Awaiting review"
          value={data.pendingReviewCount}
          sublabel="editorial queue"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded border border-hairline bg-surface p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            Dispatches by tier
          </h2>
          <div className="mt-3">
            <TierBarChart counts={data.tierCounts} />
          </div>
        </div>

        <div className="rounded border border-hairline bg-surface p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            Ingest activity, last 14 days
          </h2>
          <div className="mt-3">
            <ActivitySparkline points={data.points} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded border border-hairline bg-surface p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
              Recent dispatches
            </h2>
            <Link href="/dispatches" className="text-[11px] text-accent hover:underline">
              view all &rarr;
            </Link>
          </div>
          <ul className="mt-3 flex flex-col divide-y divide-hairline">
            {data.recent.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-2">
                <TierBadge tier={item.tier} label={item.tier_label} />
                <Link
                  href={`/dispatches/${item.id}`}
                  className="flex-1 truncate text-sm text-ink hover:text-accent"
                >
                  {item.title}
                </Link>
                {item.mention_count > 1 && (
                  <span className="shrink-0 font-mono text-[10px] text-ink-muted">
                    &times;{item.mention_count}
                  </span>
                )}
              </li>
            ))}
            {data.recent.length === 0 && (
              <li className="py-6 text-center text-sm text-ink-muted">
                The queue is empty. Run <code className="font-mono">scripts/ingest.sh</code>.
              </li>
            )}
          </ul>
        </div>

        <div className="rounded border border-hairline bg-surface p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            Schedule
          </h2>
          <dl className="mt-3 flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-mono text-[11px] text-ink-secondary">Ingest</dt>
              <dd className="text-ink">02:15 daily &middot; all scouts + dedup</dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] text-ink-secondary">Synthesis</dt>
              <dd className="text-ink">Sunday 03:00 &middot; digest + forecast</dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] text-ink-secondary">Manual</dt>
              <dd className="text-ink-secondary">
                curriculum-scaffold, lab-generation, editorial-review
              </dd>
            </div>
          </dl>
          <Link
            href="/pipeline"
            className="mt-4 inline-block text-[11px] text-accent hover:underline"
          >
            pipeline health &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
