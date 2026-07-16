import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { MarkdownBody } from "@/components/MarkdownBody";
import { PageHeader } from "@/components/PageHeader";
import { queryOne } from "@/lib/db";
import { readRepoMarkdown } from "@/lib/files";
import { WikiPage } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function WikiDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const page = await queryOne<WikiPage>("SELECT * FROM wiki_pages WHERE id = ?", [
    id,
  ]);
  if (!page) notFound();

  const markdown = readRepoMarkdown(page.markdown_path);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/wiki"
          className="font-mono text-[11px] uppercase tracking-wider text-ink-muted hover:text-accent"
        >
          &larr; Wiki
        </Link>
        <PageHeader
          title={page.title}
          description={`${page.period_start} to ${page.period_end} · ${page.digest_count} digests`}
          meta={page.created_at}
        />
      </div>

      <p className="font-mono text-[11px] text-ink-muted">
        Source: {page.markdown_path}
      </p>

      {markdown ? (
        <div className="rounded border border-hairline bg-surface p-5">
          <MarkdownBody source={markdown} />
        </div>
      ) : (
        <EmptyState
          title="Markdown file missing on disk."
          hint="Wiki pages are regenerable; re-run weekly-wiki if the path was cleaned."
        />
      )}
    </div>
  );
}
