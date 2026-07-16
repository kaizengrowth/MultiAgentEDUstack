type StatusKind = "good" | "warning" | "critical" | "neutral";

const KIND_VAR: Record<StatusKind, string> = {
  good: "var(--good)",
  warning: "var(--warning)",
  critical: "var(--critical)",
  neutral: "var(--ink-muted)",
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
      <span className="inline-flex items-center rounded-full border border-hairline px-2.5 py-0.5 text-xs font-medium text-ink-muted">
        pending
      </span>
    );
  }
  const kind = DECISION_KIND[value] ?? "neutral";
  const color = KIND_VAR[kind];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        color,
        border: `1px solid color-mix(in oklab, ${color} 45%, transparent)`,
        backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
      }}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}
