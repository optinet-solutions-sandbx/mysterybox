import { cacheLife, cacheTag } from "next/cache";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseCatalog } from "@/backend/config";
import { createCatalog, setActiveCatalog, staticCatalogData, type Catalog, type CatalogData } from "./catalog";
import { catalogFromRows } from "./catalog-rows";

export { catalogFromRows } from "./catalog-rows";

/**
 * Server-side catalog loader. With Supabase it reads the live boxes, their odds and every item
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

export async function loadCatalogData(): Promise<CatalogData> {
  "use cache";
  cacheTag("catalog");
  cacheLife("hours");
  if (!isSupabaseCatalog) return staticCatalogData;
  const [itemRows, boxRows, oddsRows] = await Promise.all([
    rest("items?select=id,name,brand,category,value_cents,image_url,image_aspect,free_spins&order=value_cents"),
    rest("boxes?select=id,slug,name,tagline,category,material,badge,featured,price_cents,bonus&status=eq.live&order=sort_order,price_cents"),
    rest("box_items?select=box_id,item_id,position,weight&order=box_id,position"),
  ]);
  return catalogFromRows(itemRows, boxRows, oddsRows);
}

let built: { data: CatalogData; catalog: Catalog } | null = null;

/** The catalog for server pages; also made active so module-level reads (services/catalog) agree. */
export async function getCatalog(): Promise<Catalog> {
  const data = await loadCatalogData();
  if (built?.data !== data) built = { data, catalog: createCatalog(data) };
  setActiveCatalog(built.catalog);
  return built.catalog;
}
