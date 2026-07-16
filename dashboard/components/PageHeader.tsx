export function PageHeader({
  title,
  description,
  meta,
}: {
  title: string;
  description: string;
  meta?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        <p className="mt-2 text-base leading-relaxed text-ink-secondary">
          {description}
        </p>
      </div>
      {meta && (
        <p className="rounded-full border border-hairline bg-surface-raised px-3 py-1 text-sm text-ink-muted">
          {meta}
        </p>
      )}
    </div>
  );
}
