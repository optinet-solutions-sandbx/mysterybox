import Link from "next/link";
import { ViewTransition } from "react";
import { Chest } from "@/components/chest/chest";
import { FORWARD } from "@/components/shell/page-transition";
import { ItemArt } from "@/components/item/item-art";
import { formatUsd, formatUsdCompact } from "@/domain/money";
import type { Box } from "@/domain/types";
import { resolveEntries, valueRange } from "@/services/catalog";

/** Catalog card: the box itself, its price, its value range and its three best pieces. */
export function BoxCard({ box }: { box: Box }) {
  const { min, max } = valueRange(box);
  const top = resolveEntries(box).slice(0, 3);
  return (
    <Link
      href={`/box/${box.slug}`}
      transitionTypes={FORWARD}
      className="group relative flex flex-col overflow-hidden rounded-[28px] border border-line/80 bg-[var(--card)] transition-[border-color,transform] duration-300 ease-snap hover:-translate-y-1 hover:border-accent/50"
    >
      <div className="relative -mb-4 h-40 overflow-hidden px-3 pt-2 md:h-48">
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--glow)_28%,transparent),transparent)]" />
        <ViewTransition name={`chest-${box.slug}`} share="morph" default="none">
          <Chest finish={box.material} still sizes="(min-width: 1024px) 260px, 45vw" className="pointer-events-none size-full" label={`${box.name} box`} />
        </ViewTransition>
      </div>
      <div className="relative flex flex-1 flex-col p-4 pt-0 md:p-5 md:pt-0">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate font-display text-base md:text-lg">{box.name}</h3>
          <span className="shrink-0 font-price text-base font-bold text-accent tabular md:text-lg">{formatUsd(box.price)}</span>
        </div>
        <p className="mt-1 text-sm text-muted">
          {formatUsdCompact(min)} to {formatUsdCompact(max)}
        </p>
        <div className="mt-3 flex -space-x-3">
          {top.map((e) => (
            <ItemArt
              key={e.item.id}
              item={e.item}
              rarity={e.rarity}
              showBrand={false}
              sizes="44px"
              className="size-11 rounded-full border-2 border-accent shadow-[0_4px_10px_-4px_var(--shadow-strong)]"
            />
          ))}
        </div>
      </div>
    </Link>
  );
}
