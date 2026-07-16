export function StatTile({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
}) {
  return (
    <div className="rounded border border-hairline bg-surface px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
        {label}
      </div>
      <div className="mt-1 font-mono text-2xl font-semibold text-ink">{value}</div>
      {sublabel && (
        <div className="mt-0.5 text-[11px] text-ink-secondary">{sublabel}</div>
      )}
    </div>
  );
}
