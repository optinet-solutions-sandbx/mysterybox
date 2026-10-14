/** Money is always integer cents. Format only at the edge (see domain/money.ts). */
export type Cents = number;

export const CATEGORIES = ["bags", "watches", "jewelry", "eyewear", "beauty", "accessories"] as const;
export type Category = (typeof CATEGORIES)[number];

/** Rarity is relative to the box price (see rarityFor), so every box has a full ladder. */
export const RARITIES = ["common", "uncommon", "rare", "epic", "grail"] as const;
export type Rarity = (typeof RARITIES)[number];

/** Engraved placeholder drawing used when an item has no product photo. */
export type ItemArtKey =
  | "watch"
  | "smartwatch"
  | "bag-flap"
  | "bag-top"
  | "bag-tote"
  | "bag-pouch"
  | "sneaker"
  | "ring"
  | "bracelet"
  | "pendant"
  | "phone"
  | "laptop"
  | "headphones"
  | "earbuds"
  | "controller"
  | "perfume"
  | "sunglasses"
  | "belt"
  | "scarf"
  | "card"
  | "coin";

/** Box leather/finish. */
export type BoxMaterial = "navy" | "obsidian" | "sapphire" | "ivory" | "gold" | "plum";

export interface Item {
  id: string;
  name: string;
  brand: string;
  category: Category;
  /** Listed value; the box price and the sell-back offer are computed from it. */
  value: Cents;
  /** Cut-out product photo. Without it the UI renders the `art` drawing. */
  image?: string;
  /** Width/height of the trimmed photo; gives every piece the same visual size. */
  imageAspect?: number;
  art?: ItemArtKey;
}

export interface BoxEntry {
  itemId: string;
  /** Integer weight; all entries of a box sum to economy.oddsScale. */
  weight: number;
}

/** The category switch on the Boxes screen. */
export const SHELVES = ["all", "bags", "watches", "jewelry", "beauty", "eyewear"] as const;
export type Shelf = (typeof SHELVES)[number];

export interface Box {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  shelf: Exclude<Shelf, "all">;
  price: Cents;
  entries: BoxEntry[];
  material: BoxMaterial;
  /** A limited drop is only on sale until the end of the current week (see domain/drops.ts). */
  drop?: boolean;
}

/** A box entry joined with its item and derived display data. */
export interface ResolvedEntry {
  item: Item;
  weight: number;
  probability: number;
  rarity: Rarity;
}
