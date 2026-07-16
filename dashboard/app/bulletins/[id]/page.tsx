import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { MarkdownBody } from "@/components/MarkdownBody";
import { PageHeader } from "@/components/PageHeader";
import { queryOne } from "@/lib/db";
import { readRepoMarkdown } from "@/lib/files";
import { Digest } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BulletinDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const digest = await queryOne<Digest>("SELECT * FROM digests WHERE id = ?", [
    id,
  ]);
  if (!digest) notFound();

  const markdown = readRepoMarkdown(digest.markdown_path);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/bulletins"
          className="font-mono text-[11px] uppercase tracking-wider text-ink-muted hover:text-accent"
        >
          &larr; Bulletins
        </Link>
        <PageHeader
          title={`Digest #${digest.id}`}
          description={`${digest.period_start} to ${digest.period_end} · ${digest.item_count} items`}
          meta={digest.run_at}
        />
      </div>

      <p className="font-mono text-[11px] text-ink-muted">
        Source: {digest.markdown_path}
      </p>

      {markdown ? (
        <div className="rounded border border-hairline bg-surface p-5">
          <MarkdownBody source={markdown} />
        </div>
      ) : (
        <EmptyState
          title="Markdown file missing on disk."
          hint="Digests are regenerable; re-run synthesis-digest if the path was cleaned."
        />
      )}
    </div>
  );
}
