import { query } from "@/lib/db";
import { CuratedItem } from "@/lib/types";

export async function Ticker() {
  const items = await query<CuratedItem>(
    `SELECT id, title, tier FROM curated_items ORDER BY id DESC LIMIT 12`
  );

  if (items.length === 0) {
    return (
      <div className="border-b border-hairline bg-surface px-5 py-2.5 text-sm text-ink-muted">
        Quiet for now. Run ingest when you want fresh sources on the desk.
      </div>
    );
  }

  const strip = (
    <span className="flex shrink-0 items-center gap-8 pr-8">
      {items.map((item) => (
        <span key={item.id} className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-accent" aria-hidden>
            ✦
          </span>
          <span className="text-xs font-semibold text-ink-muted">T{item.tier}</span>
          <span className="text-sm text-ink">{item.title}</span>
        </span>
      ))}
    </span>
  );

  return (
    <div className="overflow-hidden border-b border-hairline bg-surface">
      <div className="ticker-track flex w-max py-2.5">
        {strip}
        {strip}
      </div>
    </div>
  );
}
