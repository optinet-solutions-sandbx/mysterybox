import type { BonusRow, Box, BoxMaterial, Item } from "@/domain/types";
import { staticCatalog, type CatalogData } from "./catalog";

/**
 * Database rows → front-end shapes, shared by the site (services/catalog-source) and the back
 * office (backend/remote-catalog). The database is the source of truth; the built-in catalogue
 * only supplies a piece's line drawing and its third-party reference photo, which stays behind
 * NEXT_PUBLIC_REFERENCE_IMAGES (config/media).
 */

type Row = Record<string, unknown>;

export function itemFromRow(r: Row): Item {
  const known = staticCatalog.findItem(String(r.id));
  const url = (r.image_url as string | null) || undefined;
  const image = url && !url.startsWith("/reference/") ? url : known?.image;
  const aspect = r.image_aspect == null ? known?.imageAspect : Number(r.image_aspect);
  const spins = Number(r.free_spins ?? 0);
  return {
    id: String(r.id),
    name: String(r.name),
    brand: String(r.brand),
    category: String(r.category),
    value: Number(r.value_cents),
    ...(image ? { image } : {}),
    ...(image && aspect ? { imageAspect: aspect } : {}),
    ...(known?.art ? { art: known.art } : {}),
    ...(spins > 0 ? { freeSpins: spins } : {}),
  };
}

function bonusFrom(value: unknown): BonusRow[] {
  return Array.isArray(value) ? value.map((b) => ({ credits: Number(b.credits), percent: Number(b.percent) })) : [];
}

/** A box with its odds in draw order. `oddsRows` may hold every box's rows. */
export function boxFromRow(r: Row, oddsRows: Row[], itemIds?: Set<string>): Box {
  return {
    id: String(r.id),
    slug: String(r.slug),
    name: String(r.name),
    tagline: String(r.tagline ?? ""),
    category: String(r.category),
    price: Number(r.price_cents),
    material: (r.material as BoxMaterial) ?? "obsidian",
    badge: (r.badge as Box["badge"]) ?? undefined,
    featured: Boolean(r.featured),
    bonus: bonusFrom(r.bonus),
    entries: oddsRows
      .filter((o) => o.box_id === r.id && (!itemIds || itemIds.has(String(o.item_id))))
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map((o) => ({ itemId: String(o.item_id), weight: Number(o.weight) })),
  };
}

export function catalogFromRows(itemRows: Row[], boxRows: Row[], oddsRows: Row[]): CatalogData {
  const items = itemRows.map(itemFromRow);
  const itemIds = new Set(items.map((i) => i.id));
  return { items, boxes: boxRows.map((r) => boxFromRow(r, oddsRows, itemIds)) };
}
