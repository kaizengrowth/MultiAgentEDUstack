import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { TierBadge } from "@/components/TierBadge";
import { query, queryOne } from "@/lib/db";
import { CuratedItem, RawItem, SCOUT_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DispatchDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const item = await queryOne<CuratedItem>(
    "SELECT * FROM curated_items WHERE id = ?",
    [id]
  );
  if (!item) notFound();

  const sources = await query<RawItem>(
    `SELECT r.*
     FROM raw_items r
     JOIN item_merges m ON m.raw_item_id = r.id
     WHERE m.curated_item_id = ?
     ORDER BY r.fetched_at DESC`,
    [id]
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dispatches"
          className="font-mono text-[11px] uppercase tracking-wider text-ink-muted hover:text-accent"
        >
          &larr; Dispatches
        </Link>
        <PageHeader
          title={item.title}
          description={item.tier_label}
          meta={`#${item.id}`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <TierBadge tier={item.tier} label={item.tier_label} />
        <StatusBadge value={item.status} />
        {item.confidence && (
          <span className="font-mono text-[11px] text-ink-muted">
            confidence {item.confidence}
          </span>
        )}
        {item.mention_count > 1 && (
          <span className="font-mono text-[11px] text-ink-muted">
            {item.mention_count} mentions merged
          </span>
        )}
      </div>

      <dl className="grid gap-4 rounded border border-hairline bg-surface p-4 sm:grid-cols-2">
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            Canonical URL
          </dt>
          <dd className="mt-1 break-all text-sm">
            <a
              href={item.canonical_url}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              {item.canonical_url}
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            Topic
          </dt>
          <dd className="mt-1 text-sm text-ink-secondary">
            {item.topic || "unassigned (set during synthesis)"}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            First seen
          </dt>
          <dd className="mt-1 font-mono text-sm text-ink-secondary">
            {item.first_seen_at}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            Last seen
          </dt>
          <dd className="mt-1 font-mono text-sm text-ink-secondary">
            {item.last_seen_at}
          </dd>
        </div>
      </dl>

      <section>
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          Source raw items ({sources.length})
        </h2>
        {sources.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="No merge trail for this dispatch." />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-hairline rounded border border-hairline bg-surface">
            {sources.map((raw) => (
              <li key={raw.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-[11px] text-accent">
                    {SCOUT_LABELS[raw.scout] || raw.scout}
                  </span>
                  <span className="font-mono text-[11px] text-ink-muted">
                    {raw.fetched_at}
                  </span>
                </div>
                <a
                  href={raw.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-sm text-ink hover:text-accent"
                >
                  {raw.title}
                </a>
                {raw.summary && (
                  <p className="mt-1 line-clamp-3 text-sm text-ink-secondary">
                    {raw.summary}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
