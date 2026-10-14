/** Money is always integer cents. Format only at the edge (see domain/money.ts). */
export type Cents = number;

/**
 * A category id. Product categories come from the brand pack (public/brands/<id>/brand.json);
 * "credit" (site credit outcomes) is built in, and boxes may also be "mixed".
 */
export type Category = string;

/** Rarity is relative to the box price (see rarityFor), not an absolute value tier. */
export const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"] as const;
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

/** Box leather/finish, one per tier. */
export type BoxMaterial = "navy" | "obsidian" | "sapphire" | "ivory" | "gold";

export interface Item {
  id: string;
  name: string;
  brand: string;
  category: Category;
  /** Listed value the box economy and sell-back are computed from. */
  value: Cents;
  /** Licensed cut-out product photo. Without it the UI renders the `art` drawing. */
  image?: string;
  /** Width/height of the trimmed photo; used to give every piece the same visual size. */
  imageAspect?: number;
  art?: ItemArtKey;
  /** Credit items only: free spins this outcome carries (the backend kit's bonus rows). */
  freeSpins?: number;
}

export interface BoxEntry {
  itemId: string;
  /** Integer weight; all entries of a box sum to economy.oddsScale. */
  weight: number;
}

/** One row of a box's free-spin table: what a free spin pays, in credit, and its chance in percent. */
export interface BonusRow {
  credits: number;
  percent: number;
}

export interface Box {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  /** A brand-pack category, or "mixed" for boxes that span several. */
  category: Category;
  price: Cents;
  entries: BoxEntry[];
  badge?: "new" | "hot" | "limited";
  featured?: boolean;
  material: BoxMaterial;
  /** Free-spin table (empty when no outcome carries free spins). */
  bonus: BonusRow[];
}

/** A box entry joined with its item and derived display data. */
export interface ResolvedEntry {
  item: Item;
  weight: number;
  probability: number;
  rarity: Rarity;
}

/** Everything needed to re-verify one draw (provably-fair style). */
export interface Draw {
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  /** Integer in [0, economy.oddsScale). */
  roll: number;
}

export type InventoryStatus =
  | "held"
  | "sold"
  | "shipping_pending"
  | "shipping_processing"
  | "shipped"
  /** Traded in for site credit (the backend kit's trade-in). */
  | "traded";

export interface InventoryItem {
  uid: string;
  itemId: string;
  boxId: string;
  acquiredAt: string;
  status: InventoryStatus;
  draw: Draw;
  /** The box API open this piece came from (absent for pieces from before the API). */
  openId?: string;
}

export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "adjustment"
  | "box_open"
  | "sell_back"
  | "shipping_request"
  | "shipping_cancel";

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Signed: credits are positive, debits negative. Zero for non-monetary events. */
  amount: Cents;
  at: string;
  label: string;
  /** Deposits and withdrawals can wait on the payment provider; absent means completed. */
  status?: "pending" | "completed" | "cancelled";
}
