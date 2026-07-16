import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { MarkdownBody } from "@/components/MarkdownBody";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { queryOne } from "@/lib/db";
import { readRepoMarkdown } from "@/lib/files";
import { LabSpec } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LabDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const lab = await queryOne<LabSpec>("SELECT * FROM lab_specs WHERE id = ?", [
    id,
  ]);
  if (!lab) notFound();

  const markdown = readRepoMarkdown(lab.spec_path);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/labs"
          className="font-mono text-[11px] uppercase tracking-wider text-ink-muted hover:text-accent"
        >
          &larr; Labs
        </Link>
        <PageHeader
          title={lab.objective}
          description="Lab specification (does not provision infrastructure)."
          meta={`#${lab.id}`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={lab.status} />
        <Link
          href={`/curriculum/${lab.curriculum_unit_id}`}
          className="font-mono text-[11px] text-accent hover:underline"
        >
          curriculum unit #{lab.curriculum_unit_id}
        </Link>
        {lab.target_time_pct != null && (
          <span className="font-mono text-[11px] text-ink-muted">
            ~{lab.target_time_pct}% time
          </span>
        )}
      </div>

      <p className="font-mono text-[11px] text-ink-muted">{lab.spec_path}</p>

      {markdown ? (
        <div className="rounded border border-hairline bg-surface p-5">
          <MarkdownBody source={markdown} />
        </div>
      ) : (
        <EmptyState title="Spec file missing on disk." />
      )}
    </div>
  );
}
