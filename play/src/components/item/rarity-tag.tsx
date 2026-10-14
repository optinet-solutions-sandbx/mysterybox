import type { Rarity } from "@/domain/types";
import { cn } from "@/lib/cn";

export const rarityLabel: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  grail: "Grail",
};

export const rarityText: Record<Rarity, string> = {
  common: "text-rarity-common",
  uncommon: "text-rarity-uncommon",
  rare: "text-rarity-rare",
  epic: "text-rarity-epic",
  grail: "text-rarity-grail",
};

export const rarityBg: Record<Rarity, string> = {
  common: "bg-rarity-common",
  uncommon: "bg-rarity-uncommon",
  rare: "bg-rarity-rare",
  epic: "bg-rarity-epic",
  grail: "bg-rarity-grail",
};

export function RarityTag({ rarity, className }: { rarity: Rarity; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", rarityText[rarity], className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {rarityLabel[rarity]}
    </span>
  );
}

/** Filled chip for the reveal screen, like the app's rarity badge. */
export function RarityChip({ rarity, className }: { rarity: Rarity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-lg px-2.5 text-xs font-bold tracking-wide text-[var(--bg)]",
        rarityBg[rarity],
        className,
      )}
    >
      {rarityLabel[rarity]}
    </span>
  );
}
