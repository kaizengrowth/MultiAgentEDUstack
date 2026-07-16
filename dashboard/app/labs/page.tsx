import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type LabRow = {
  id: number;
  curriculum_unit_id: number;
  objective: string;
  spec_path: string;
  target_time_pct: number | null;
  created_at: string;
  status: string;
  unit_title: string | null;
};

export default async function LabsPage() {
  const labs = await query<LabRow>(
    `SELECT l.*, u.title as unit_title
     FROM lab_specs l
     LEFT JOIN curriculum_units u ON u.id = l.curriculum_unit_id
     ORDER BY l.created_at DESC, l.id DESC`
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Labs"
        description="Hands-on lab specs (spec only; no live cloud provisioning)."
        meta={`${labs.length} specs`}
      />

      {labs.length === 0 ? (
        <EmptyState
          title="No lab specs on file."
          hint="Run /lab-generation against a curriculum unit when ready."
        />
      ) : (
        <ul className="divide-y divide-hairline rounded border border-hairline bg-surface">
          {labs.map((lab) => (
            <li key={lab.id} className="px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/labs/${lab.id}`}
                    className="text-sm text-ink hover:text-accent"
                  >
                    {lab.objective}
                  </Link>
                  {lab.unit_title && (
                    <p className="mt-1 text-sm text-ink-secondary">
                      Unit:{" "}
                      <Link
                        href={`/curriculum/${lab.curriculum_unit_id}`}
                        className="text-accent hover:underline"
                      >
                        {lab.unit_title}
                      </Link>
                    </p>
                  )}
                </div>
                <StatusBadge value={lab.status} />
              </div>
              <p className="mt-2 font-mono text-[11px] text-ink-muted">
                {lab.created_at}
                {lab.target_time_pct != null
                  ? ` · ~${lab.target_time_pct}% time estimate`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
