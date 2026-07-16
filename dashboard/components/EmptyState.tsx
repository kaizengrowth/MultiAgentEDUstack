export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="rounded border border-dashed border-hairline bg-surface px-6 py-12 text-center">
      <p className="text-sm text-ink-secondary">{title}</p>
      {hint && (
        <p className="mt-2 font-mono text-[11px] text-ink-muted">{hint}</p>
      )}
    </div>
  );
}
