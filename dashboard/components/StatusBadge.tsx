type StatusKind = "good" | "warning" | "critical" | "neutral";

const KIND_VAR: Record<StatusKind, string> = {
  good: "var(--good)",
  warning: "var(--warning)",
  critical: "var(--critical)",
  neutral: "var(--ink-muted)",
};

const ICON: Record<StatusKind, string> = {
  good: "●", // filled circle
  warning: "▲", // triangle
  critical: "✕", // cross
  neutral: "○", // open circle
};

const DECISION_KIND: Record<string, StatusKind> = {
  approved: "good",
  changes_requested: "warning",
  rejected: "critical",
  new: "neutral",
  digested: "good",
  archived: "neutral",
  drafted: "neutral",
  reviewed: "good",
  shipped: "good",
  watching: "warning",
  promoted: "good",
  expired: "neutral",
};

export function StatusBadge({ value }: { value: string | null }) {
  if (!value) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium text-ink-muted border border-hairline">
        {ICON.neutral} pending
      </span>
    );
  }
  const kind = DECISION_KIND[value] ?? "neutral";
  const color = KIND_VAR[kind];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium"
      style={{
        color,
        border: `1px solid ${color}`,
        backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
      }}
    >
      {ICON[kind]} {value.replace(/_/g, " ")}
    </span>
  );
}
