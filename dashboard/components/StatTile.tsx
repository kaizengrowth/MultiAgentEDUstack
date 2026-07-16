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
    <div className="stat-tile px-4 py-4">
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </div>
      <div className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">
        {value}
      </div>
      {sublabel && (
        <div className="mt-1 text-sm text-ink-secondary">{sublabel}</div>
      )}
    </div>
  );
}
