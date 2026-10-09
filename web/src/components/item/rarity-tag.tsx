import type { Rarity } from "@/domain/types";
import { cn } from "@/lib/cn";

const label: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

const color: Record<Rarity, string> = {
  common: "text-rarity-common",
  uncommon: "text-rarity-uncommon",
  rare: "text-rarity-rare",
  epic: "text-rarity-epic",
  legendary: "text-rarity-legendary",
};

export function RarityTag({ rarity, className }: { rarity: Rarity; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", color[rarity], className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label[rarity]}
    </span>
  );
}

export const rarityBorder: Record<Rarity, string> = {
  common: "border-rarity-common",
  uncommon: "border-rarity-uncommon",
  rare: "border-rarity-rare",
  epic: "border-rarity-epic",
  legendary: "border-rarity-legendary",
};
