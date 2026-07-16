import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StatTile } from "@/components/StatTile";
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

const STATUS_STYLE: Record<
  EnrichedSource["status"],
  { color: string; border: string; background: string }
> = {
  active: {
    color: "var(--good)",
    border: "1px solid color-mix(in oklab, var(--good) 45%, transparent)",
    background: "color-mix(in oklab, var(--good) 10%, transparent)",
  },
  quiet: {
    color: "var(--warning)",
    border: "1px solid color-mix(in oklab, var(--warning) 45%, transparent)",
    background: "color-mix(in oklab, var(--warning) 10%, transparent)",
  },
  cataloged: {
    color: "var(--ink-muted)",
    border: "1px solid var(--hairline)",
    background: "var(--surface-raised)",
  },
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
        description="Your teaching library from the Digital Garden explorer. Counts update as new material arrives."
        meta={`${activeCount} active · ${catalogCount} in catalog`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="In catalog" value={catalogCount} />
        <StatTile label="Pulling now" value={activeCount} />
        <StatTile
          label="Wired, quiet"
          value={sources.filter((s) => s.status === "quiet").length}
        />
        <StatTile
          label="Catalog only"
          value={sources.filter((s) => s.status === "cataloged").length}
        />
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
          <ul className="panel mt-3 divide-y divide-hairline">
            {landings.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-accent">
                    {item.sourceLabel}
                  </span>
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 block truncate text-base text-ink hover:text-accent"
                  >
                    {item.title}
                  </a>
                </div>
                <span className="shrink-0 text-xs text-ink-muted">
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
            <div className="panel mt-3 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-hairline text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">
                      Best for
                    </th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Items</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell">
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
                          className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={STATUS_STYLE[source.status]}
                        >
                          {STATUS_LABEL[source.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top font-mono text-ink-secondary">
                        {source.itemCount}
                      </td>
                      <td className="hidden px-4 py-3 align-top font-mono text-[11px] text-ink-muted md:table-cell">
                        {source.lastFetch || "never"}
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
