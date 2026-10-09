import Image from "next/image";
import { useId, type CSSProperties } from "react";
import type { Category, Item, Rarity } from "@/domain/types";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";
import { drawings, type ArtKey } from "./item-drawings";

const byCategory: Record<Category, ArtKey> = {
  bags: "bag-top",
  watches: "watch",
  jewelry: "ring",
  eyewear: "sunglasses",
  beauty: "perfume",
  accessories: "scarf",
  credit: "coin",
};

/**
 * Item visual. Uses `item.image` (licensed cut-out photo) when present; otherwise a gold
 * engraved drawing on a spotlit navy plate, tinted by rarity.
 */
export function ItemArt({
  item,
  rarity,
  className,
  showBrand = true,
}: {
  item: Item;
  rarity?: Rarity;
  className?: string;
  showBrand?: boolean;
}) {
  const id = useId();
  const tone = rarity ? `var(--rarity-${rarity})` : "var(--glow)";
  const style = { "--tone": tone, "--art-fill": "rgb(194 164 110 / 0.07)" } as CSSProperties;
  const art = item.art ?? byCategory[item.category];

  return (
    <div
      style={style}
      className={cn("relative isolate grid aspect-square place-items-center overflow-hidden bg-surface", className)}
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70% 60% at 50% 38%, color-mix(in oklab, var(--tone) 34%, transparent), transparent 70%), linear-gradient(180deg, #13214a, #0b1430)",
        }}
      />
      {item.image ? (
        <Image src={item.image} alt={item.name} fill sizes="320px" className="object-contain p-[10%]" />
      ) : (
        <svg viewBox="0 0 100 100" className="w-[64%] overflow-visible drop-shadow-[0_8px_24px_rgb(0_0_0/0.5)]" aria-label={item.name} role="img">
          <defs>
            <linearGradient id={`${id}-foil`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#8a6d3f" />
              <stop offset="0.35" stopColor="#efdcae" />
              <stop offset="0.55" stopColor="#c2a46e" />
              <stop offset="0.8" stopColor="#f5e7c3" />
              <stop offset="1" stopColor="#a7884d" />
            </linearGradient>
          </defs>
          <g fill="none" stroke={`url(#${id}-foil)`} strokeWidth="1.6" strokeLinejoin="round">
            {art === "coin" ? (
              <>
                {drawings.coin}
                <text
                  x="50"
                  y="58"
                  textAnchor="middle"
                  fill={`url(#${id}-foil)`}
                  stroke="none"
                  style={{ font: "500 22px var(--font-display)" }}
                >
                  {brand.monogram}
                </text>
              </>
            ) : (
              drawings[art]
            )}
          </g>
        </svg>
      )}
      {showBrand && (
        <span className="absolute bottom-[7%] max-w-[86%] truncate font-display text-[10px] tracking-[0.22em] text-accent/80">
          {item.brand}
        </span>
      )}
    </div>
  );
}
