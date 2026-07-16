import { Tier, TIER_LABELS } from "@/lib/types";

const TIER_VAR: Record<Tier, string> = {
  1: "var(--tier1)",
  2: "var(--tier2)",
  3: "var(--tier3)",
  4: "var(--tier4)",
  5: "var(--tier5)",
};

export function TierBarChart({ counts }: { counts: Record<Tier, number> }) {
  const max = Math.max(1, ...Object.values(counts));
  const tiers: Tier[] = [1, 2, 3, 4, 5];

  return (
    <div className="flex flex-col gap-2.5" role="img" aria-label="Dispatch count by credibility tier">
      {tiers.map((tier) => {
        const count = counts[tier] ?? 0;
        const widthPct = Math.max(2, (count / max) * 100);
        return (
          <div key={tier} className="flex items-center gap-3">
            <div className="w-6 shrink-0 text-right font-mono text-[11px] text-ink-secondary">
              T{tier}
            </div>
            <div className="relative h-4 flex-1 rounded-full bg-surface-raised">
              <div
                className="h-4 rounded-full transition-[width]"
                style={{ width: `${widthPct}%`, backgroundColor: TIER_VAR[tier] }}
              />
            </div>
            <div className="w-10 shrink-0 font-mono text-[12px] font-medium text-ink">
              {count}
            </div>
          </div>
        );
      })}
      <div className="mt-1 grid grid-cols-1 gap-x-4 gap-y-0.5 text-[11px] text-ink-muted sm:grid-cols-2">
        {tiers.map((tier) => (
          <div key={tier}>
            <span className="font-mono text-ink-secondary">T{tier}</span> {TIER_LABELS[tier]}
          </div>
        ))}
      </div>
    </div>
  );
}
