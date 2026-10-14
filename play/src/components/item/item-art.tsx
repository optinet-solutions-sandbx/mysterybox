import Image from "next/image";
import { useId, type CSSProperties } from "react";
import type { Category, Item, Rarity } from "@/domain/types";
import { LOGO_SRC } from "@/components/brand/logo-mark";
import { cn } from "@/lib/cn";
import { drawings, type ArtKey } from "./item-drawings";

/**
 * Size a photo so every piece covers about the same area of its tile (≈36%), whatever its
 * proportions: a thin bracelet gets the full width, a tall watch the full height, a bag sits
 * between. Percent strings are rounded so server and client render identical markup.
 */
export function fitToArea(aspect: number, { AREA = 3600, MAX_W = 84, MAX_H = 74 } = {}) {
  let w = Math.sqrt(AREA * aspect);
  let h = Math.sqrt(AREA / aspect);
  if (w > MAX_W) [w, h] = [MAX_W, MAX_W / aspect];
  if (h > MAX_H) [w, h] = [MAX_H * aspect, MAX_H];
  return { width: `${w.toFixed(1)}%`, height: `${h.toFixed(1)}%` };
}

/** The piece alone, without a plate: for the reveal, where it floats in its own light. */
export function PiecePhoto({ item, sizes, className }: { item: Item; sizes: string; className?: string }) {
  const fit = item.imageAspect ? fitToArea(item.imageAspect, { AREA: 5200, MAX_W: 94, MAX_H: 88 }) : { width: "86%", height: "86%" };
  if (!item.image) {
    return (
      <ItemArt item={item} showBrand={false} sizes={sizes} className={cn("rounded-[28px] bg-transparent", className)} />
    );
  }
  return (
    <div className={cn("relative grid aspect-square place-items-center", className)}>
      <div className="relative" style={fit}>
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes={sizes}
          priority
          className="object-contain drop-shadow-[0_24px_36px_rgb(0_0_0/0.45)]"
          draggable={false}
        />
      </div>
    </div>
  );
}

const byCategory: Record<Category, ArtKey> = {
  bags: "bag-top",
  watches: "watch",
  jewelry: "ring",
  eyewear: "sunglasses",
  beauty: "perfume",
  accessories: "scarf",
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
  sizes = "(min-width: 1024px) 240px, 45vw",
  priority = false,
}: {
  item: Item;
  rarity?: Rarity;
  className?: string;
  showBrand?: boolean;
  /** Rendered width hint so the optimiser serves a right-sized file. */
  sizes?: string;
  priority?: boolean;
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
            "radial-gradient(70% 60% at 50% 38%, color-mix(in oklab, var(--tone) 34%, transparent), transparent 70%), var(--plate)",
        }}
      />
      {item.image ? (
        <div className="relative" style={item.imageAspect ? fitToArea(item.imageAspect) : { width: "80%", height: "80%" }}>
          <Image src={item.image} alt={item.name} fill sizes={sizes} priority={priority} className="object-contain drop-shadow-[0_10px_18px_rgb(0_0_0/0.35)]" />
        </div>
      ) : (
        <svg viewBox="0 0 100 100" className="w-[64%] overflow-visible drop-shadow-[0_8px_24px_rgb(0_0_0/0.5)]" aria-label={item.name} role="img">
          <defs>
            <linearGradient id={`${id}-foil`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={{ stopColor: "var(--foil-1)" }} />
              <stop offset="0.35" style={{ stopColor: "var(--foil-2)" }} />
              <stop offset="0.55" style={{ stopColor: "var(--foil-3)" }} />
              <stop offset="0.8" style={{ stopColor: "var(--foil-4)" }} />
              <stop offset="1" style={{ stopColor: "var(--foil-5)" }} />
            </linearGradient>
          </defs>
          <g fill="none" stroke={`url(#${id}-foil)`} strokeWidth="1.6" strokeLinejoin="round">
            {art === "coin" ? (
              <>
                {drawings.coin}
                <image href={LOGO_SRC} x="32" y="38" width="36" height="23.9" />
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
