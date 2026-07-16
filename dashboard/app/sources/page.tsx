import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { SCOUT_LABELS } from "@/lib/types";
import {
  EnrichedSource,
  getEnrichedSources,
  getRecentLandings,
} from "@/lib/sources";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<EnrichedSource["status"], string> = {
  active: "pulling",
  quiet: "wired, quiet",
  cataloged: "catalog only",
};

const STATUS_CLASS: Record<EnrichedSource["status"], string> = {
  active: "text-[var(--good)] border-[var(--good)]",
  quiet: "text-[var(--warning)] border-[var(--warning)]",
  cataloged: "text-ink-muted border-hairline",
};

export default async function SourcesPage() {
  const [{ categories, sources, activeCount, catalogCount }, landings] =
    await Promise.all([getEnrichedSources(), getRecentLandings(24)]);

  const byCategory = categories.map((cat) => ({
    ...cat,
    items: sources.filter((s) => s.category === cat.id),
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sources"
        description="Credibility-tiered source catalog from the Digital Garden notepad explorer, with live pull counts as scouts land items."
        meta={`${activeCount} active · ${catalogCount} cataloged`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded border border-hairline bg-surface p-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            Catalog
          </p>
          <p className="mt-1 font-mono text-2xl text-ink">{catalogCount}</p>
        </div>
        <div className="rounded border border-hairline bg-surface p-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            Pulling now
          </p>
          <p className="mt-1 font-mono text-2xl text-ink">{activeCount}</p>
        </div>
        <div className="rounded border border-hairline bg-surface p-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            Wired, quiet
          </p>
          <p className="mt-1 font-mono text-2xl text-ink">
            {sources.filter((s) => s.status === "quiet").length}
          </p>
        </div>
        <div className="rounded border border-hairline bg-surface p-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            Catalog only
          </p>
          <p className="mt-1 font-mono text-2xl text-ink">
            {sources.filter((s) => s.status === "cataloged").length}
          </p>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            Latest landings
          </h2>
          <Link
            href="/pipeline"
            className="font-mono text-[11px] text-accent hover:underline"
          >
            pipeline health &rarr;
          </Link>
        </div>
        {landings.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="Nothing landed yet."
              hint="bash scripts/ingest.sh"
            />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-hairline rounded border border-hairline bg-surface">
            {landings.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-[11px] text-accent">
                    {item.sourceLabel}
                  </span>
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 block truncate text-sm text-ink hover:text-accent"
                  >
                    {item.title}
                  </a>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-ink-muted">
                  {item.fetched_at}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {byCategory.map((cat) => (
        <section key={cat.id}>
          <h2 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            {cat.label}
            <span className="ml-2 text-ink-secondary">
              {cat.items.filter((i) => i.status === "active").length}/
              {cat.items.length} pulling
            </span>
          </h2>
          {cat.items.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">No sources in this category.</p>
          ) : (
            <div className="mt-3 overflow-hidden rounded border border-hairline bg-surface">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-hairline font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th className="px-4 py-2 font-medium">Source</th>
                    <th className="hidden px-4 py-2 font-medium lg:table-cell">
                      Best for
                    </th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Items</th>
                    <th className="hidden px-4 py-2 font-medium md:table-cell">
                      Last pull
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {cat.items.map((source) => (
                    <tr key={source.name} className="hover:bg-surface-raised/40">
                      <td className="px-4 py-3 align-top">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-ink hover:text-accent"
                        >
                          {source.name}
                        </a>
                        {source.attribution && (
                          <p className="mt-0.5 font-mono text-[11px] text-ink-muted">
                            {source.attribution}
                          </p>
                        )}
                        {source.scout && (
                          <p className="mt-0.5 font-mono text-[10px] text-ink-muted">
                            via {SCOUT_LABELS[source.scout] || source.scout}
                          </p>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 align-top text-ink-secondary lg:table-cell">
                        {source.best_for}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex rounded border px-1.5 py-0.5 font-mono text-[11px] ${STATUS_CLASS[source.status]}`}
                        >
                          {STATUS_LABEL[source.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top font-mono text-ink-secondary">
                        {source.itemCount}
                      </td>
                      <td className="hidden px-4 py-3 align-top font-mono text-[11px] text-ink-muted md:table-cell">
                        {source.lastFetch || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      <p className="font-mono text-[11px] text-ink-muted">
        Catalog: <code>data/sources.yaml</code>. Counts refresh on each page load
        from <code>raw_items</code> as ingest runs.
      </p>
    </div>
  );
}
