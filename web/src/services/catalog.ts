import { economy } from "@/config/economy";
import { boxes } from "@/data/boxes";
import { items } from "@/data/items";
import { rarityFor } from "@/domain/odds";
import type { BonusRow, Box, Category, Item, Rarity, ResolvedEntry } from "@/domain/types";
import { boxMaths, type BoxMaths, type OutcomeKind } from "@/engine/maths";

export type { OutcomeKind } from "@/engine/maths";

/**
 * Catalog read API. Today it reads static mock modules; swap the bodies for the real
 * platform API without changing callers. Kept synchronous so pages prerender.
 */

const itemById = new Map(items.map((i) => [i.id, i]));
const boxBySlug = new Map(boxes.map((b) => [b.slug, b]));

export function listBoxes(): Box[] {
  return boxes;
}

export function listFeaturedBoxes(): Box[] {
  return boxes.filter((b) => b.featured);
}

export function getBox(slug: string): Box | undefined {
  return boxBySlug.get(slug);
}

export function getItem(id: string): Item {
  const item = itemById.get(id);
  if (!item) throw new Error(`Unknown item ${id}`);
  return item;
}

/** Entries joined with items, in authored order (the order the roll ranges use). */
export function resolveEntries(box: Box): ResolvedEntry[] {
  return box.entries.map((e) => {
    const item = getItem(e.itemId);
    return {
      item,
      weight: e.weight,
      probability: e.weight / economy.oddsScale,
      rarity: rarityFor(item.value, box.price),
    };
  });
}

export function boxStats(box: Box) {
  const entries = resolveEntries(box);
  const { maths } = catalogBox(box);
  const byValue = [...entries].sort((a, b) => b.item.value - a.item.value);
  return {
    ev: maths.payFaceCents,
    rtp: maths.returnFace,
    top: byValue[0],
    floor: byValue[byValue.length - 1],
  };
}

/** One row of a box's odds table in the backend kit's format (`Outcome` in their API). */
export interface CatalogOutcome {
  id: string;
  label: string;
  rarity: Rarity;
  kind: OutcomeKind;
  credits: number;
  freeSpins: number;
  /** Listed value of a piece; null for credit (credit counts at 1 credit = $1). */
  valueCents: number | null;
  /** Chance in percent; a box's rows sum to 100. */
  percent: number;
}

/** A box as the backend kit's API describes it, minus the hashes (see box-api). */
export interface CatalogBox {
  slug: string;
  name: string;
  tagline: string;
  priceCents: number;
  outcomes: CatalogOutcome[];
  bonus: BonusRow[];
  maths: BoxMaths;
}

/** Our entries as the kit's outcomes, in authored order (the order the bands walk). */
export function boxOutcomes(box: Box): CatalogOutcome[] {
  return box.entries.map((e) => {
    const item = getItem(e.itemId);
    const credit = item.category === "credit";
    return {
      id: item.id,
      label: credit ? item.name : `${item.brand} ${item.name}`,
      rarity: rarityFor(item.value, box.price),
      kind: credit ? (item.freeSpins ? "bonus" : "credit") : "item",
      credits: credit ? item.value / 100 : 0,
      freeSpins: item.freeSpins ?? 0,
      valueCents: credit ? null : item.value,
      percent: e.weight / (economy.oddsScale / 100),
    };
  });
}

const catalogCache = new Map<string, CatalogBox>();

/** Synchronous, so Server Components can prerender from it; the live flow goes through box-api. */
export function catalogBox(box: Box): CatalogBox {
  const cached = catalogCache.get(box.slug);
  if (cached) return cached;
  const outcomes = boxOutcomes(box);
  const result = {
    slug: box.slug,
    name: box.name,
    tagline: box.tagline,
    priceCents: box.price,
    outcomes,
    bonus: box.bonus,
    maths: boxMaths({ priceCents: box.price, outcomes, bonus: box.bonus }),
  };
  catalogCache.set(box.slug, result);
  return result;
}

const unknownPiece: Item = { id: "unknown", name: "Site credit", brand: "Credit", category: "credit", value: 0 };

/** Photo or drawing for an outcome id. Unknown ids (e.g. from a live API) get the credit coin, never a throw. */
export function outcomeArt(id: string): Item {
  return itemById.get(id) ?? unknownPiece;
}

/** Most valuable items of one category, for hero/showcase use. */
export function topItemsIn(category: Category, limit = 5): Item[] {
  return items
    .filter((i) => i.category === category)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/** Distinct non-credit items worth showing off (landing marquee etc.). */
export function listShowcaseItems(limit = 18): Item[] {
  return items
    .filter((i) => i.category !== "credit" && i.value >= 80_000)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export const categoryLabels: Record<Category | "mixed", string> = {
  bags: "Bags",
  watches: "Watches",
  jewelry: "Jewelry",
  eyewear: "Eyewear",
  beauty: "Beauty",
  accessories: "Accessories",
  credit: "Credit",
  mixed: "Mixed",
};
