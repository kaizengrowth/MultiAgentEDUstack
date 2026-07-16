import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { query } from "@/lib/db";
import { WikiPage } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function WikiIndexPage() {
  const pages = await query<WikiPage>(
    "SELECT * FROM wiki_pages ORDER BY created_at DESC, id DESC"
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Wiki"
        description="Sunday rollups of the week's daily digests, filed by weekly-wiki."
        meta={`${pages.length} pages`}
      />

      {pages.length === 0 ? (
        <EmptyState
          title="No wiki pages yet."
          hint={'Run: bash scripts/weekly.sh (or claude -p "/weekly-wiki" ...)'}
        />
      ) : (
        <ul className="divide-y divide-hairline rounded border border-hairline bg-surface">
          {pages.map((page) => (
            <li
              key={page.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <Link
                  href={`/wiki/${page.id}`}
                  className="text-sm text-ink hover:text-accent"
                >
                  {page.title}
                </Link>
                <p className="mt-0.5 font-mono text-[11px] text-ink-muted">
                  {page.period_start} &rarr; {page.period_end} &middot;{" "}
                  {page.digest_count} digests
                </p>
              </div>
              <span className="font-mono text-[11px] text-ink-secondary">
                {page.created_at}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
