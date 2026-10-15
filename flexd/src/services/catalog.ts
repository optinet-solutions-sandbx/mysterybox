import { economy } from "@/config/economy";
import { boxes } from "@/data/boxes";
import { itemById, items } from "@/data/items";
import { oddsByRarity, rarityFor } from "@/domain/odds";
import { RARITIES, type Box, type Cents, type Item, type Rarity, type ResolvedEntry, type Shelf } from "@/domain/types";

/**
 * The catalog seam: synchronous reads over the mock data. Swap the bodies for the platform API
 * and keep the signatures.
 */

const bySlug = new Map(boxes.map((b) => [b.slug, b]));

export function allBoxes(): Box[] {
  return boxes;
}

export function boxesOnShelf(shelf: Shelf): Box[] {
  return shelf === "all" ? boxes : boxes.filter((b) => b.shelf === shelf);
}

export function boxBySlug(slug: string): Box | undefined {
  return bySlug.get(slug);
}

export function allItems(): Item[] {
  return items;
}

export function getItem(id: string): Item {
  const item = itemById(id);
  if (!item) throw new Error(`Unknown item ${id}`);
  return item;
}

/** Entries joined with their items, most valuable first. */
export function resolveEntries(box: Box): ResolvedEntry[] {
  return box.entries
    .map((e) => {
      const item = getItem(e.itemId);
      return {
        item,
        weight: e.weight,
        probability: e.weight / economy.oddsScale,
        rarity: rarityFor(item.value, box.price),
      };
    })
    .sort((a, b) => b.item.value - a.item.value);
}

export function valueRange(box: Box): { min: Cents; max: Cents } {
  const values = box.entries.map((e) => getItem(e.itemId).value);
  return { min: Math.min(...values), max: Math.max(...values) };
}

export interface TierOdds {
  rarity: Rarity;
  probability: number;
  min: Cents;
  max: Cents;
  count: number;
}

/** The odds sheet: chance and value range per rarity tier, top tier first. Empty tiers are left out. */
export function tierOdds(box: Box): TierOdds[] {
  const entries = resolveEntries(box);
  const byTier = oddsByRarity(entries);
  return [...RARITIES]
    .reverse()
    .map((rarity) => {
      const inTier = entries.filter((e) => e.rarity === rarity);
      const values = inTier.map((e) => e.item.value);
      return {
        rarity,
        probability: byTier[rarity],
        min: Math.min(...values),
        max: Math.max(...values),
        count: inTier.length,
      };
    })
    .filter((t) => t.count > 0);
}

/** Every box that holds a piece, with the chance of pulling it there. */
export function boxesHolding(itemId: string): { box: Box; probability: number; rarity: Rarity }[] {
  const item = getItem(itemId);
  return boxes.flatMap((box) => {
    const entry = box.entries.find((e) => e.itemId === itemId);
    return entry ? [{ box, probability: entry.weight / economy.oddsScale, rarity: rarityFor(item.value, box.price) }] : [];
  });
}

/** Highest rarity a piece reaches in any box, for the Showroom filter. */
export function bestRarity(itemId: string): Rarity | undefined {
  const tiers = boxesHolding(itemId).map((h) => RARITIES.indexOf(h.rarity));
  return tiers.length ? RARITIES[Math.max(...tiers)] : undefined;
}
