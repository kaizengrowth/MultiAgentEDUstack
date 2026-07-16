import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { query } from "@/lib/db";
import { CurriculumUnit } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CurriculumPage() {
  const units = await query<CurriculumUnit>(
    "SELECT * FROM curriculum_units ORDER BY created_at DESC, id DESC"
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Curriculum"
        description="Scaffolded units from curriculum-scaffold (durable vs frontier)."
        meta={`${units.length} units`}
      />

      {units.length === 0 ? (
        <EmptyState
          title="No curriculum units drafted yet."
          hint="Run /curriculum-scaffold by hand when a topic is ready to teach."
        />
      ) : (
        <div className="overflow-hidden rounded border border-hairline bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-hairline font-mono text-[11px] uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="hidden px-4 py-2 font-medium md:table-cell">
                  Competency
                </th>
                <th className="px-4 py-2 font-medium">Format</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {units.map((unit) => (
                <tr key={unit.id} className="hover:bg-surface-raised/50">
                  <td className="px-4 py-3 align-top">
                    <Link
                      href={`/curriculum/${unit.id}`}
                      className="text-ink hover:text-accent"
                    >
                      {unit.title}
                    </Link>
                    <p className="mt-0.5 font-mono text-[11px] text-ink-muted">
                      L{unit.proficiency_level}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 align-top text-ink-secondary md:table-cell">
                    {unit.competency.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 align-top font-mono text-[11px] text-ink-secondary">
                    {unit.format.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge value={unit.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
