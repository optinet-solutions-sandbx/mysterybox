import { cacheLife, cacheTag } from "next/cache";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseCatalog } from "@/backend/config";
import type { Box, BoxMaterial, Category, Item } from "@/domain/types";
import { createCatalog, staticCatalog, staticCatalogData, type Catalog, type CatalogData } from "./catalog";

/**
 * Server-side catalog loader. With Supabase it reads the live boxes, their odds and active items
 * (public RLS, anon key) and caches them under the "catalog" tag; staff edits in the back office
 * call /api/catalog/revalidate so the site shows them at once. Without Supabase it is the
 * built-in catalog.
 */

type Row = Record<string, unknown>;

async function rest(path: string): Promise<Row[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Catalog fetch failed (${res.status}) for ${path}`);
  return (await res.json()) as Row[];
}

/** DB rows → front-end shapes. Built-in items keep their drawing, photo and aspect; new ones use the category drawing. */
export function catalogFromRows(itemRows: Row[], boxRows: Row[], oddsRows: Row[]): CatalogData {
  const items: Item[] = itemRows.map((r) => {
    const known = staticCatalog.findItem(String(r.id));
    return {
      ...(known ?? {}),
      id: String(r.id),
      name: String(r.name),
      brand: String(r.brand),
      category: r.category as Category,
      value: Number(r.value_cents),
      image: known?.image ?? ((r.image_url as string | null) || undefined),
    };
  });
  const itemIds = new Set(items.map((i) => i.id));
  const boxes: Box[] = boxRows.map((r) => ({
    id: String(r.id),
    slug: String(r.slug),
    name: String(r.name),
    tagline: String(r.tagline ?? ""),
    category: r.category as Box["category"],
    price: Number(r.price_cents),
    material: (r.material as BoxMaterial) ?? "obsidian",
    badge: (r.badge as Box["badge"]) ?? undefined,
    featured: Boolean(r.featured),
    // Free-spin tables aren't in the database yet: built-in boxes keep theirs, new boxes have none.
    bonus: staticCatalog.getBox(String(r.slug))?.bonus ?? [],
    entries: oddsRows
      .filter((o) => o.box_id === r.id && itemIds.has(String(o.item_id)))
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map((o) => ({ itemId: String(o.item_id), weight: Number(o.weight) })),
  }));
  return { items, boxes };
}

export async function loadCatalogData(): Promise<CatalogData> {
  "use cache";
  cacheTag("catalog");
  cacheLife("hours");
  if (!isSupabaseCatalog) return staticCatalogData;
  const [itemRows, boxRows, oddsRows] = await Promise.all([
    rest("items?select=id,name,brand,category,value_cents,image_url,active&order=value_cents"),
    rest("boxes?select=id,slug,name,tagline,category,material,badge,featured,price_cents&status=eq.live&order=sort_order,price_cents"),
    rest("box_items?select=box_id,item_id,position,weight&order=box_id,position"),
  ]);
  return catalogFromRows(itemRows, boxRows, oddsRows);
}

export async function getCatalog(): Promise<Catalog> {
  return createCatalog(await loadCatalogData());
}
