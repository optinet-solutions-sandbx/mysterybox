"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { economy } from "@/config/economy";
import { ItemArt } from "@/components/item/item-art";
import { RarityTag } from "@/components/item/rarity-tag";
import { FORWARD } from "@/components/shell/page-transition";
import { button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { formatDisplayedOdds, formatOneIn, formatUsd } from "@/domain/money";
import { sellBackValue } from "@/domain/odds";
import { CATEGORIES, type Category, type Item } from "@/domain/types";
import { cn } from "@/lib/cn";
import { allItems, bestRarity, boxesHolding } from "@/services/catalog";

const CATEGORY_LABEL: Record<Category, string> = {
  bags: "Bags",
  watches: "Watches",
  jewelry: "Jewelry",
  eyewear: "Eyewear",
  beauty: "Beauty",
  accessories: "Accessories",
};

const SORTS = {
  "value-desc": { label: "Highest value", fn: (a: Item, b: Item) => b.value - a.value },
  "value-asc": { label: "Lowest value", fn: (a: Item, b: Item) => a.value - b.value },
  brand: { label: "Brand A to Z", fn: (a: Item, b: Item) => a.brand.localeCompare(b.brand) || b.value - a.value },
} as const;

type SortKey = keyof typeof SORTS;

/** Every piece across every box, as in the app's Showroom tab. */
export function ShowroomView() {
  const [category, setCategory] = useState<Category | "all">("all");
  const [sort, setSort] = useState<SortKey>("value-desc");
  const [selected, setSelected] = useState<Item | null>(null);

  const pieces = useMemo(
    () => allItems().filter((i) => category === "all" || i.category === category).sort(SORTS[sort].fn),
    [category, sort],
  );

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div role="tablist" aria-label="Category" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {(["all", ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                "h-10 shrink-0 rounded-pill border px-4 text-sm font-medium transition-colors",
                category === c ? "border-transparent bg-primary text-on-primary" : "border-line text-muted hover:text-fg",
              )}
            >
              {c === "all" ? "All" : CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm text-muted">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-10 rounded-pill border border-line bg-surface px-4 text-fg outline-none focus:border-accent"
          >
            {Object.entries(SORTS).map(([k, s]) => (
              <option key={k} value={k}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-4 text-sm text-subtle" aria-live="polite">
        {pieces.length} {pieces.length === 1 ? "piece" : "pieces"}
      </p>

      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-5">
        {pieces.map((item, i) => {
          const rarity = bestRarity(item.id);
          const count = boxesHolding(item.id).length;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelected(item)}
                className="group w-full overflow-hidden rounded-3xl border border-line/80 bg-surface/50 text-left transition-[border-color,transform] duration-300 ease-snap hover:-translate-y-0.5 hover:border-accent/50"
              >
                <ItemArt item={item} rarity={rarity} showBrand={false} sizes="(min-width: 1024px) 220px, 45vw" priority={i < 4} />
                <div className="p-3">
                  <p className="truncate text-xs font-semibold tracking-wide text-muted">{item.brand}</p>
                  <p className="line-clamp-2 min-h-[2lh] text-sm font-medium">{item.name}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-semibold tabular">{formatUsd(item.value)}</span>
                    <span className="text-xs text-subtle">
                      {count} {count === 1 ? "box" : "boxes"}
                    </span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <PieceSheet item={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function PieceSheet({ item, onClose }: { item: Item | null; onClose: () => void }) {
  return (
    <Sheet open={item !== null} onClose={onClose} title={item ? item.brand : ""}>
      {item && (
        <div>
          <ItemArt item={item} rarity={bestRarity(item.id)} showBrand={false} sizes="400px" className="rounded-3xl" />
          <h3 className="mt-4 font-display text-2xl">{item.name}</h3>
          <div className="mt-2 flex items-baseline justify-between gap-4">
            <span className="font-display text-2xl font-bold text-accent tabular">{formatUsd(item.value)}</span>
            <span className="text-sm text-muted">
              Sells back for {formatUsd(sellBackValue(item.value))} ({Math.round(economy.sellBackRate * 100)}%)
            </span>
          </div>
          <h4 className="mt-6 text-sm font-medium text-muted">Found in</h4>
          <ul className="mt-2 divide-y divide-line/70">
            {boxesHolding(item.id).map(({ box, probability, rarity }) => (
              <li key={box.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{box.name}</p>
                  <p className="flex items-center gap-3 text-sm text-subtle">
                    <span className="tabular">{formatUsd(box.price)} a box</span>
                    <RarityTag rarity={rarity} />
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display font-semibold tabular">{formatDisplayedOdds(probability)}</p>
                  <p className="text-xs text-subtle">{formatOneIn(probability)}</p>
                </div>
                <Link href={`/box/${box.slug}`} transitionTypes={FORWARD} onClick={onClose} className={button({ variant: "outline", size: "sm" })}>
                  View
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Sheet>
  );
}
