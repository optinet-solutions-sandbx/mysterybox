import type { ResolvedEntry } from "@/domain/types";
import { formatPercent, formatUsd } from "@/domain/money";
import { Authenticity } from "@/components/item/authenticity";
import { ItemArt } from "@/components/item/item-art";
import { RarityTag } from "@/components/item/rarity-tag";

const rarityBar = {
  common: "bg-rarity-common",
  uncommon: "bg-rarity-uncommon",
  rare: "bg-rarity-rare",
  epic: "bg-rarity-epic",
  legendary: "bg-rarity-legendary",
} as const;

/** "What's inside": every piece as a card with its rarity, listed value and exact odds. */
export function InsideGrid({ entries }: { entries: ResolvedEntry[] }) {
  const rows = [...entries].sort((a, b) => b.item.value - a.item.value);
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {rows.map((e) => (
        <li key={e.item.id} className="relative overflow-hidden rounded-[18px] border border-line bg-surface">
          <span aria-hidden className={`absolute inset-x-0 top-0 z-10 h-[3px] ${rarityBar[e.rarity]}`} />
          <ItemArt item={e.item} rarity={e.rarity} showBrand={false} sizes="(min-width: 1280px) 200px, (min-width: 640px) 30vw, 48vw" />
          <div className="space-y-1 px-3.5 pt-3 pb-4">
            <div className="flex items-center justify-between gap-2">
              <RarityTag rarity={e.rarity} />
              <span className="rounded-pill border border-line px-2 py-0.5 text-[11px] font-semibold text-fg tabular">{formatPercent(e.probability * 100)}</span>
            </div>
            <p className="truncate pt-1 text-xs font-semibold tracking-wide text-muted">{e.item.brand}</p>
            <p className="line-clamp-2 min-h-10 text-sm leading-snug font-medium">{e.item.name}</p>
            <Authenticity item={e.item} />
            <p className="font-display text-lg font-semibold text-foil tabular">{formatUsd(e.item.value)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
