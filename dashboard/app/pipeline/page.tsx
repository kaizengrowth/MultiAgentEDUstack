import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { query, queryOne } from "@/lib/db";
import { SCOUT_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

type ScoutRow = {
  scout: string;
  n: number;
  last_fetch: string | null;
};

export default async function PipelinePage() {
  const [scoutRows, mergeCount, curatedCount, rawCount, decayOpen] =
    await Promise.all([
      query<ScoutRow>(
        `SELECT scout, COUNT(*) as n, MAX(fetched_at) as last_fetch
         FROM raw_items
         GROUP BY scout
         ORDER BY n DESC`
      ),
      queryOne<{ n: number }>("SELECT COUNT(*) as n FROM item_merges"),
      queryOne<{ n: number }>("SELECT COUNT(*) as n FROM curated_items"),
      queryOne<{ n: number }>("SELECT COUNT(*) as n FROM raw_items"),
      queryOne<{ n: number }>(
        "SELECT COUNT(*) as n FROM decay_flags WHERE resolution IS NULL"
      ),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pipeline"
        description="Ingest health: scout landings, merges, and the operating schedule."
        meta={`${rawCount?.n ?? 0} raw · ${curatedCount?.n ?? 0} curated`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded border border-hairline bg-surface p-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            Raw items
          </p>
          <p className="mt-1 font-mono text-2xl text-ink">{rawCount?.n ?? 0}</p>
        </div>
        <div className="rounded border border-hairline bg-surface p-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            Curated
          </p>
          <p className="mt-1 font-mono text-2xl text-ink">
            {curatedCount?.n ?? 0}
          </p>
        </div>
        <div className="rounded border border-hairline bg-surface p-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            Merges
          </p>
          <p className="mt-1 font-mono text-2xl text-ink">{mergeCount?.n ?? 0}</p>
        </div>
        <div className="rounded border border-hairline bg-surface p-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            Open decay
          </p>
          <p className="mt-1 font-mono text-2xl text-ink">{decayOpen?.n ?? 0}</p>
        </div>
      </div>

      <section>
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          Scouts
        </h2>
        {scoutRows.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No raw items landed yet."
              hint="bash scripts/ingest.sh"
            />
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded border border-hairline bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-hairline font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Scout</th>
                  <th className="px-4 py-2 font-medium">Items</th>
                  <th className="px-4 py-2 font-medium">Last fetch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {scoutRows.map((row) => (
                  <tr key={row.scout}>
                    <td className="px-4 py-2 text-ink">
                      {SCOUT_LABELS[row.scout] || row.scout}
                    </td>
                    <td className="px-4 py-2 font-mono text-ink-secondary">
                      {row.n}
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] text-ink-muted">
                      {row.last_fetch || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded border border-hairline bg-surface p-4">
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          Schedule
        </h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="font-mono text-[11px] text-ink-secondary">Ingest</dt>
            <dd className="text-ink">02:15 daily · scouts + dedup</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] text-ink-secondary">
              Synthesis
            </dt>
            <dd className="text-ink">Sunday 03:00 · digest + forecast</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] text-ink-secondary">Manual</dt>
            <dd className="text-ink-secondary">
              curriculum, labs, editorial stay off the timer
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
