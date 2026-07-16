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
      <div>
        <h1 className="font-mono text-lg font-semibold text-ink">{title}</h1>
        <p className="mt-1 text-sm text-ink-secondary">{description}</p>
      </div>
      {meta && (
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          {meta}
        </p>
      )}
    </div>
  );
}
