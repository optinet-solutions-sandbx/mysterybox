import type { Rarity } from "@/domain/types";
import { cn } from "@/lib/cn";

export const rarityLabel: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  grail: "Grail",
};

export const rarityBg: Record<Rarity, string> = {
  common: "bg-rarity-common",
  uncommon: "bg-rarity-uncommon",
  rare: "bg-rarity-rare",
  epic: "bg-rarity-epic",
  grail: "bg-rarity-grail",
};

/** A coloured dot with the tier name in the text colour (burgundy is too dark for small type on garnet). */
export function RarityTag({ rarity, className }: { rarity: Rarity; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold text-muted", className)}>
      <span aria-hidden className={cn("size-2 rounded-full", rarityBg[rarity])} />
      {rarityLabel[rarity]}
    </span>
  );
}

/** Text on each rarity's fill: dark on the light tiers, cream on burgundy. */
const chipInk: Record<Rarity, string> = {
  common: "text-[var(--onyx-wine)]",
  uncommon: "text-[var(--onyx-wine)]",
  rare: "text-[var(--onyx-wine)]",
  epic: "text-[var(--cream)]",
  grail: "text-[var(--onyx-wine)]",
};

/** Filled chip for the reveal screen, like the app's rarity badge. */
export function RarityChip({ rarity, className }: { rarity: Rarity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-lg px-2.5 text-xs font-bold tracking-wide",
        rarityBg[rarity],
        chipInk[rarity],
        className,
      )}
    >
      {rarityLabel[rarity]}
    </span>
  );
}
