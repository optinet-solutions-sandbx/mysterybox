import { economy } from "@/config/economy";
import { boxes } from "@/data/boxes";
import { items } from "@/data/items";
import { rarityFor } from "@/domain/odds";
import type { BonusRow, Box, Category, Item, Rarity, ResolvedEntry } from "@/domain/types";
import { boxMaths, type BoxMaths, type OutcomeKind } from "@/engine/maths";

export type { OutcomeKind } from "@/engine/maths";

/**
 * Catalog read API. Every function reads the active catalog: the built-in data (data/items,
 * data/boxes) or, with NEXT_PUBLIC_CATALOG=supabase, the database copy that staff edit in the back
 * office. Server pages `await getCatalog()` (services/catalog-source), client components
 * `useCatalog()` (components/catalog-provider), other code calls these functions. Kept synchronous
 * so pages prerender.
 */

export function listBoxes(): Box[] {
  return active.listBoxes();
}

export function listFeaturedBoxes(): Box[] {
  return active.listFeaturedBoxes();
}

export function getBox(slug: string): Box | undefined {
  return active.getBox(slug);
}

export function getItem(id: string): Item {
  return active.getItem(id);
}

/** Entries joined with items, in authored order (the order the roll ranges use). */
export function resolveEntries(box: Box): ResolvedEntry[] {
  return active.resolveEntries(box);
}

export function boxStats(box: Box): BoxStats {
  return active.boxStats(box);
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
  return active.boxOutcomes(box);
}

/** Synchronous, so Server Components can prerender from it; the live flow goes through box-api. */
export function catalogBox(box: Box): CatalogBox {
  return active.catalogBox(box);
}

/** Photo or drawing for an outcome id. Unknown ids (e.g. from a live API) get the credit coin, never a throw. */
export function outcomeArt(id: string): Item {
  return active.outcomeArt(id);
}

/** Most valuable items of one category, for hero/showcase use. */
export function topItemsIn(category: Category, limit = 5): Item[] {
  return active.topItemsIn(category, limit);
}

/** The most valuable pieces (no credit), for the landing marquee etc. */
export function listShowcaseItems(limit = 18): Item[] {
  return active.listShowcaseItems(limit);
}

// Catalog over plain data -------------------------------------------------------------------------
// Returns use the box system's maths (engine/maths), so free spins count the same everywhere.

export interface CatalogData {
  items: Item[];
  boxes: Box[];
}

export interface BoxStats {
  ev: number;
  rtp: number;
  top: ResolvedEntry;
  floor: ResolvedEntry;
}

export interface Catalog {
  items: Item[];
  boxes: Box[];
  listBoxes(): Box[];
  listFeaturedBoxes(): Box[];
  getBox(slug: string): Box | undefined;
  getItem(id: string): Item;
  findItem(id: string): Item | undefined;
  resolveEntries(box: Box): ResolvedEntry[];
  boxStats(box: Box): BoxStats;
  boxOutcomes(box: Box): CatalogOutcome[];
  catalogBox(box: Box): CatalogBox;
  outcomeArt(id: string): Item;
  topItemsIn(category: Category, limit?: number): Item[];
  listShowcaseItems(limit?: number): Item[];
}

const unknownPiece: Item = { id: "unknown", name: "Site credit", brand: "Credit", category: "credit", value: 0 };

export function createCatalog(data: CatalogData): Catalog {
  const byId = new Map(data.items.map((i) => [i.id, i]));
  const bySlug = new Map(data.boxes.map((b) => [b.slug, b]));
  // Keyed by the box object, so an edited copy (back-office draft) is never served a stale table.
  const tables = new WeakMap<Box, CatalogBox>();

  const getItem = (id: string) => {
    const item = byId.get(id);
    if (!item) throw new Error(`Unknown item ${id}`);
    return item;
  };
  const resolveEntries = (box: Box): ResolvedEntry[] =>
    box.entries.map((e) => {
      const item = getItem(e.itemId);
      return { item, weight: e.weight, probability: e.weight / economy.oddsScale, rarity: rarityFor(item.value, box.price) };
    });
  const boxOutcomes = (box: Box): CatalogOutcome[] =>
    box.entries.map((e) => {
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
  const catalogBox = (box: Box): CatalogBox => {
    const cached = tables.get(box);
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
    tables.set(box, result);
    return result;
  };
  const byValue = (xs: Item[]) => [...xs].sort((a, b) => b.value - a.value);

  return {
    items: data.items,
    boxes: data.boxes,
    listBoxes: () => data.boxes,
    listFeaturedBoxes: () => data.boxes.filter((b) => b.featured),
    getBox: (slug) => bySlug.get(slug),
    getItem,
    findItem: (id) => byId.get(id),
    resolveEntries,
    boxStats: (box) => {
      const entries = resolveEntries(box);
      const { maths } = catalogBox(box);
      const ranked = [...entries].sort((a, b) => b.item.value - a.item.value);
      return { ev: maths.payFaceCents, rtp: maths.returnFace, top: ranked[0], floor: ranked[ranked.length - 1] };
    },
    boxOutcomes,
    catalogBox,
    outcomeArt: (id) => byId.get(id) ?? unknownPiece,
    topItemsIn: (category, limit = 5) => byValue(data.items.filter((i) => i.category === category)).slice(0, limit),
    listShowcaseItems: (limit = 18) => byValue(data.items.filter((i) => i.category !== "credit")).slice(0, limit),
  };
}

export const staticCatalogData: CatalogData = { items, boxes };
export const staticCatalog = createCatalog(staticCatalogData);

let active: Catalog = staticCatalog;

/** The catalog the page was rendered with; code outside React reads it through the functions above. */
export function activeCatalog(): Catalog {
  return active;
}

export function setActiveCatalog(catalog: Catalog) {
  active = catalog;
}
