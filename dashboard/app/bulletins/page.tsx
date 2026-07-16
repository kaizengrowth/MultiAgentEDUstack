import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { query } from "@/lib/db";
import { Digest } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BulletinsPage() {
  const digests = await query<Digest>(
    "SELECT * FROM digests ORDER BY run_at DESC, id DESC"
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bulletins"
        description="Daily article digests filed by synthesis-digest. The Sunday rollup lives under Wiki."
        meta={`${digests.length} filed`}
      />

      {digests.length === 0 ? (
        <EmptyState
          title="No bulletins on file yet."
          hint="Run: bash scripts/daily-digest.sh"
        />
      ) : (
        <ul className="divide-y divide-hairline rounded border border-hairline bg-surface">
          {digests.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <Link
                  href={`/bulletins/${d.id}`}
                  className="text-sm text-ink hover:text-accent"
                >
                  Digest #{d.id}
                </Link>
                <p className="mt-0.5 font-mono text-[11px] text-ink-muted">
                  {d.period_start} &rarr; {d.period_end} &middot; {d.item_count}{" "}
                  items
                </p>
              </div>
              <span className="font-mono text-[11px] text-ink-secondary">
                {d.run_at}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
