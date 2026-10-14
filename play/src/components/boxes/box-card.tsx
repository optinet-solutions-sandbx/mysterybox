import Link from "next/link";
import { Box3D } from "@/components/box3d/box-3d";
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
      className="group relative flex flex-col overflow-hidden rounded-[28px] border border-line/80 bg-[var(--card)] transition-[border-color,transform] duration-300 ease-snap hover:-translate-y-1 hover:border-accent/50"
    >
      <div className="relative -mb-6 grid h-44 place-items-center overflow-hidden md:h-52">
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--glow)_28%,transparent),transparent)]" />
        <Box3D material={box.material} width={130} beam={false} viewX={-16} viewY={-30} className="pointer-events-none scale-90 md:scale-100" />
      </div>
      <div className="relative flex flex-1 flex-col p-4 pt-0 md:p-5 md:pt-0">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate font-display text-base md:text-lg">{box.name}</h3>
          <span className="shrink-0 font-display text-base font-semibold text-foil tabular md:text-lg">{formatUsd(box.price)}</span>
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
              className="size-11 rounded-full border-2 border-[var(--reel-edge)]"
            />
          ))}
        </div>
      </div>
    </Link>
  );
}
