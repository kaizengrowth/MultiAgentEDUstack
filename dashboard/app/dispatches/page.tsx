import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { TierBadge } from "@/components/TierBadge";
import { query } from "@/lib/db";
import { CuratedItem, Tier } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = { tier?: string; status?: string; q?: string };

export default async function DispatchesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const tierFilter = searchParams.tier ? Number(searchParams.tier) : null;
  const statusFilter = searchParams.status || null;
  const q = (searchParams.q || "").trim();

  const clauses: string[] = [];
  const params: (string | number | null)[] = [];
  if (tierFilter && tierFilter >= 1 && tierFilter <= 5) {
    clauses.push("tier = ?");
    params.push(tierFilter);
  }
  if (statusFilter) {
    clauses.push("status = ?");
    params.push(statusFilter);
  }
  if (q) {
    clauses.push("(title LIKE ? OR IFNULL(topic, '') LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const items = await query<CuratedItem>(
    `SELECT * FROM curated_items ${where} ORDER BY last_seen_at DESC, id DESC LIMIT 500`,
    params
  );

  const filterHref = (next: SearchParams) => {
    const sp = new URLSearchParams();
    const merged = { ...searchParams, ...next };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) sp.set(k, v);
    });
    const qs = sp.toString();
    return qs ? `/dispatches?${qs}` : "/dispatches";
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dispatches"
        description="Curated stories after credibility scoring and dedup."
        meta={`${items.length} on wire`}
      />

      <form className="flex flex-wrap items-end gap-3" action="/dispatches" method="get">
        <label className="flex flex-col gap-1 text-[11px] font-mono uppercase tracking-wider text-ink-muted">
          Search
          <input
            name="q"
            defaultValue={q}
            placeholder="title or topic"
            className="rounded border border-hairline bg-surface px-3 py-1.5 font-sans text-sm text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-mono uppercase tracking-wider text-ink-muted">
          Tier
          <select
            name="tier"
            defaultValue={tierFilter ?? ""}
            className="rounded border border-hairline bg-surface px-3 py-1.5 font-sans text-sm text-ink"
          >
            <option value="">All</option>
            {([1, 2, 3, 4, 5] as Tier[]).map((t) => (
              <option key={t} value={t}>
                T{t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-mono uppercase tracking-wider text-ink-muted">
          Status
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className="rounded border border-hairline bg-surface px-3 py-1.5 font-sans text-sm text-ink"
          >
            <option value="">All</option>
            <option value="new">new</option>
            <option value="digested">digested</option>
            <option value="archived">archived</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded border border-accent bg-accent/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-accent"
        >
          Filter
        </button>
        {(q || tierFilter || statusFilter) && (
          <Link
            href="/dispatches"
            className="px-2 py-1.5 font-mono text-[11px] text-ink-muted hover:text-ink"
          >
            clear
          </Link>
        )}
      </form>

      {items.length === 0 ? (
        <EmptyState
          title="No dispatches match these filters."
          hint="Run bash scripts/ingest.sh to land new items."
        />
      ) : (
        <div className="overflow-hidden rounded border border-hairline bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-hairline font-mono text-[11px] uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Tier</th>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="hidden px-4 py-2 font-medium md:table-cell">Topic</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="hidden px-4 py-2 font-medium lg:table-cell">Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-surface-raised/50">
                  <td className="px-4 py-2 align-top">
                    <TierBadge tier={item.tier} label={item.tier_label} />
                  </td>
                  <td className="px-4 py-2 align-top">
                    <Link
                      href={`/dispatches/${item.id}`}
                      className="text-ink hover:text-accent"
                    >
                      {item.title}
                    </Link>
                    {item.mention_count > 1 && (
                      <span className="ml-2 font-mono text-[10px] text-ink-muted">
                        &times;{item.mention_count}
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-2 align-top text-ink-secondary md:table-cell">
                    {item.topic || (
                      <span className="text-ink-muted">unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-2 align-top">
                    <StatusBadge value={item.status} />
                  </td>
                  <td className="hidden px-4 py-2 align-top font-mono text-[11px] text-ink-muted lg:table-cell">
                    {item.last_seen_at?.slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="font-mono text-[11px] text-ink-muted">
        Showing up to 500. Refine with{" "}
        <Link href={filterHref({ tier: "1" })} className="text-accent hover:underline">
          T1
        </Link>{" "}
        /{" "}
        <Link href={filterHref({ status: "new" })} className="text-accent hover:underline">
          new
        </Link>
        .
      </p>
    </div>
  );
}
