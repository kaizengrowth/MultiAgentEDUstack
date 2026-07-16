export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="rounded-panel border border-dashed border-hairline bg-surface-raised/60 px-6 py-14 text-center">
      <p className="text-base text-ink-secondary">{title}</p>
      {hint && <p className="mt-2 text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}
