import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { MarkdownBody } from "@/components/MarkdownBody";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { query, queryOne } from "@/lib/db";
import { readRepoMarkdown } from "@/lib/files";
import { CurriculumUnit, LabSpec } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CurriculumDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const unit = await queryOne<CurriculumUnit>(
    "SELECT * FROM curriculum_units WHERE id = ?",
    [id]
  );
  if (!unit) notFound();

  const labs = await query<LabSpec>(
    "SELECT * FROM lab_specs WHERE curriculum_unit_id = ? ORDER BY id DESC",
    [id]
  );
  const markdown = readRepoMarkdown(unit.spec_path);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/curriculum"
          className="font-mono text-[11px] uppercase tracking-wider text-ink-muted hover:text-accent"
        >
          &larr; Curriculum
        </Link>
        <PageHeader
          title={unit.title}
          description={`${unit.competency.replace(/_/g, " ")} · proficiency L${unit.proficiency_level}`}
          meta={`#${unit.id}`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={unit.status} />
        <span className="font-mono text-[11px] text-ink-muted">
          {unit.format.replace(/_/g, " ")}
        </span>
        <span className="font-mono text-[11px] text-ink-muted">
          created {unit.created_at}
        </span>
        {unit.source_curated_item_id && (
          <Link
            href={`/dispatches/${unit.source_curated_item_id}`}
            className="font-mono text-[11px] text-accent hover:underline"
          >
            source dispatch #{unit.source_curated_item_id}
          </Link>
        )}
      </div>

      <section>
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          Spec
        </h2>
        <p className="mt-1 font-mono text-[11px] text-ink-muted">
          {unit.spec_path}
        </p>
        {markdown ? (
          <div className="mt-3 rounded border border-hairline bg-surface p-5">
            <MarkdownBody source={markdown} />
          </div>
        ) : (
          <div className="mt-3">
            <EmptyState title="Spec file missing on disk." />
          </div>
        )}
      </section>

      <section>
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          Linked labs ({labs.length})
        </h2>
        {labs.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">No lab specs yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-hairline rounded border border-hairline bg-surface">
            {labs.map((lab) => (
              <li key={lab.id} className="px-4 py-3">
                <Link
                  href={`/labs/${lab.id}`}
                  className="text-sm text-ink hover:text-accent"
                >
                  {lab.objective}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
