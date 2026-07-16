import { query } from "@/lib/db";
import { CuratedItem } from "@/lib/types";

export async function Ticker() {
  const items = await query<CuratedItem>(
    `SELECT id, title, tier FROM curated_items ORDER BY id DESC LIMIT 12`
  );

  if (items.length === 0) {
    return (
      <div className="border-b border-hairline bg-surface px-4 py-2 font-mono text-[11px] text-ink-muted">
        wire quiet -- no dispatches on file yet
      </div>
    );
  }

  const strip = (
    <span className="flex shrink-0 items-center gap-8 pr-8">
      {items.map((item) => (
        <span key={item.id} className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-accent">&#9656;</span>
          <span className="font-mono text-[11px] text-ink-secondary">
            T{item.tier}
          </span>
          <span className="text-[13px] text-ink">{item.title}</span>
        </span>
      ))}
    </span>
  );

  return (
    <div className="overflow-hidden border-b border-hairline bg-surface">
      <div className="ticker-track flex w-max py-2">
        {strip}
        {strip}
      </div>
    </div>
  );
}
