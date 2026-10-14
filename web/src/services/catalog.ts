import { economy } from "@/config/economy";
import { boxes as staticBoxes } from "@/data/boxes";
import { items as staticItems } from "@/data/items";
import { expectedValue, rarityFor, rtp } from "@/domain/odds";
import type { Box, Category, Item, ResolvedEntry } from "@/domain/types";

/**
 * Catalog read API over plain data. The data comes from the built-in modules (mock) or from
 * Supabase (services/catalog-source.ts loads it server-side and caches it). Server pages call
 * `getCatalog()`; client components use `useCatalog()` (components/catalog-provider.tsx), so both
 * render from the same data. Synchronous once loaded, so pages prerender.
 */

export interface CatalogData {
  items: Item[];
  boxes: Box[];
}

export interface Catalog {
  items: Item[];
  boxes: Box[];
  listBoxes(): Box[];
  listFeaturedBoxes(): Box[];
  getBox(slug: string): Box | undefined;
  getItem(id: string): Item;
  findItem(id: string): Item | undefined;
  /** Entries joined with items, in authored order (the order the roll ranges use). */
  resolveEntries(box: Box): ResolvedEntry[];
  boxStats(box: Box): { ev: number; rtp: number; top: ResolvedEntry; floor: ResolvedEntry };
  /** Most valuable items of one category, for hero/showcase use. */
  topItemsIn(category: Category, limit?: number): Item[];
  /** Distinct non-credit items worth showing off (landing marquee etc.). */
  listShowcaseItems(limit?: number): Item[];
}

export function createCatalog({ items, boxes }: CatalogData): Catalog {
  const itemById = new Map(items.map((i) => [i.id, i]));
  const boxBySlug = new Map(boxes.map((b) => [b.slug, b]));

  const findItem = (id: string) => itemById.get(id);
  const getItem = (id: string) => {
    const item = itemById.get(id);
    if (!item) throw new Error(`Unknown item ${id}`);
    return item;
  };
  const resolveEntries = (box: Box): ResolvedEntry[] =>
    box.entries.map((e) => {
      const item = getItem(e.itemId);
      return { item, weight: e.weight, probability: e.weight / economy.oddsScale, rarity: rarityFor(item.value, box.price) };
    });

  return {
    items,
    boxes,
    listBoxes: () => boxes,
    listFeaturedBoxes: () => boxes.filter((b) => b.featured),
    getBox: (slug) => boxBySlug.get(slug),
    getItem,
    findItem,
    resolveEntries,
    boxStats(box) {
      const entries = resolveEntries(box);
      const ev = expectedValue(entries.map((e) => ({ value: e.item.value, weight: e.weight })));
      const byValue = [...entries].sort((a, b) => b.item.value - a.item.value);
      return { ev, rtp: rtp(ev, box.price), top: byValue[0], floor: byValue[byValue.length - 1] };
    },
    topItemsIn: (category, limit = 5) =>
      items
        .filter((i) => i.category === category)
        .sort((a, b) => b.value - a.value)
        .slice(0, limit),
    listShowcaseItems: (limit = 18) =>
      items
        .filter((i) => i.category !== "credit" && i.value >= 80_000)
        .sort((a, b) => b.value - a.value)
        .slice(0, limit),
  };
}

export const staticCatalogData: CatalogData = { items: staticItems, boxes: staticBoxes };

/** The built-in catalog. Mock-only code (the browser session, demo players, tests) reads it directly. */
export const staticCatalog = createCatalog(staticCatalogData);

let active: Catalog = staticCatalog;

/** The catalog the page was rendered with (set by CatalogProvider); stores use it outside React. */
export function activeCatalog(): Catalog {
  return active;
}

export function setActiveCatalog(catalog: Catalog) {
  active = catalog;
}

export const { listBoxes, listFeaturedBoxes, getBox, getItem, resolveEntries, boxStats, topItemsIn, listShowcaseItems } = staticCatalog;

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
