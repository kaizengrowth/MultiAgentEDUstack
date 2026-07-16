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
      <div className="text-sm font-medium text-ink-muted">{label}</div>
      <div className="mt-1 font-display text-3xl text-ink">{value}</div>
      {sublabel && (
        <div className="mt-1 text-sm leading-snug text-ink-secondary">{sublabel}</div>
      )}
    </div>
  );
}
