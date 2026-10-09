import { economy } from "@/config/economy";
import { boxes } from "@/data/boxes";
import { items } from "@/data/items";
import { expectedValue, rarityFor, rtp } from "@/domain/odds";
import type { Box, Category, Item, ResolvedEntry } from "@/domain/types";

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
  const ev = expectedValue(entries.map((e) => ({ value: e.item.value, weight: e.weight })));
  const byValue = [...entries].sort((a, b) => b.item.value - a.item.value);
  return {
    ev,
    rtp: rtp(ev, box.price),
    top: byValue[0],
    floor: byValue[byValue.length - 1],
  };
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
