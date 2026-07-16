import { Tier } from "@/lib/types";

const TIER_VAR: Record<Tier, string> = {
  1: "var(--tier1)",
  2: "var(--tier2)",
  3: "var(--tier3)",
  4: "var(--tier4)",
  5: "var(--tier5)",
};

export function TierBadge({ tier, label }: { tier: Tier; label?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold tracking-wide"
      style={{
        color: TIER_VAR[tier],
        border: `1px solid color-mix(in oklab, ${TIER_VAR[tier]} 40%, transparent)`,
        backgroundColor: `color-mix(in oklab, ${TIER_VAR[tier]} 12%, transparent)`,
      }}
      title={label}
    >
      T{tier}
    </span>
  );
}
