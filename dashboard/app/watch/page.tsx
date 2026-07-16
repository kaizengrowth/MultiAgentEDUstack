import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { query } from "@/lib/db";
import { WatchlistEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function WatchPage() {
  const entries = await query<WatchlistEntry>(
    "SELECT * FROM forecast_watchlist ORDER BY first_flagged_at DESC, id DESC"
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Watch"
        description="Leading-indicator topics from trend-forecast (velocity, not volume)."
        meta={`${entries.length} on watchlist`}
      />

      {entries.length === 0 ? (
        <EmptyState
          title="Watchlist is empty."
          hint='Run: claude -p "/trend-forecast" --allowedTools "Bash Read Write Edit Glob Grep"'
        />
      ) : (
        <ul className="divide-y divide-hairline rounded border border-hairline bg-surface">
          {entries.map((entry) => (
            <li key={entry.id} className="px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-medium text-ink">{entry.topic}</h2>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-ink-muted">
                    {entry.confidence}
                  </span>
                  <StatusBadge value={entry.status} />
                </div>
              </div>
              <p className="mt-2 text-sm text-ink-secondary">
                {entry.signal_summary}
              </p>
              <p className="mt-2 font-mono text-[11px] text-ink-muted">
                flagged {entry.first_flagged_at}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
