"use client";

import type { Box, BoxEntry, Category, Item } from "@/domain/types";
import { boxFromRow, itemFromRow } from "@/services/catalog-rows";
import type { BoxStatus } from "./contract";
import { accessToken, check, rpc, sb } from "./supabase-client";

/**
 * Catalog management on Supabase (staff only; RLS enforces it). After every change the site's
 * cached catalog is revalidated so players see the same items, prices and odds staff saved.
 */

type Row = Record<string, unknown>;

export interface ItemDraft {
  id: string;
  name: string;
  brand: string;
  category: Category;
  value: number;
  imageUrl: string;
  /** Width / height of the photo (set by the upload, which trims transparent edges). */
  imageAspect: number | null;
  /** Credit items only. */
  freeSpins: number;
  active: boolean;
}

export interface AdminBox extends Box {
  status: BoxStatus;
}

export async function revalidateCatalog() {
  await fetch("/api/catalog/revalidate", { method: "POST", headers: { authorization: `Bearer ${await accessToken()}` } });
}

export async function loadItemsAdmin(): Promise<(Item & { active: boolean })[]> {
  const rows = check<Row[]>(await sb().from("items").select("*").order("value_cents"));
  return rows.map((r) => ({ ...itemFromRow(r), active: Boolean(r.active) }));
}

/** An item as an editable draft. */
export function itemDraftOf(item: Item & { active: boolean }): ItemDraft {
  return {
    id: item.id,
    name: item.name,
    brand: item.brand,
    category: item.category,
    value: item.value,
    imageUrl: item.image ?? "",
    imageAspect: item.imageAspect ?? null,
    freeSpins: item.freeSpins ?? 0,
    active: item.active,
  };
}

export async function saveItem(draft: ItemDraft, isNew: boolean) {
  const row = {
    name: draft.name.trim(),
    brand: draft.brand.trim(),
    category: draft.category,
    value_cents: Math.round(draft.value),
    image_url: draft.imageUrl.trim() || null,
    image_aspect: draft.imageUrl.trim() && draft.imageAspect ? Math.round(draft.imageAspect * 1000) / 1000 : null,
    free_spins: draft.category === "credit" ? Math.max(0, Math.round(draft.freeSpins)) : 0,
    active: draft.active,
  };
  if (isNew) check(await sb().from("items").insert({ id: draft.id, ...row }));
  else check(await sb().from("items").update(row).eq("id", draft.id));
  await revalidateCatalog();
}

/** Every box including drafts and retired ones (staff RLS), with its odds in draw order. */
export async function loadBoxesAdmin(): Promise<AdminBox[]> {
  const [boxes, odds] = await Promise.all([
    sb().from("boxes").select("*").order("sort_order").then((r) => check<Row[]>(r)),
    sb().from("box_items").select("box_id,item_id,position,weight").order("position").then((r) => check<Row[]>(r)),
  ]);
  return boxes.map((r) => ({ ...boxFromRow(r, odds), status: r.status as BoxStatus }));
}

/**
 * Saves a box. Price and odds can only change while the box is a draft (the database freezes the
 * odds of a live box); publishing is a separate step that re-checks the weights.
 */
export async function saveBox(box: AdminBox, isNew: boolean, entries: BoxEntry[] | null, sortOrder = 0) {
  const details = {
    name: box.name.trim(),
    tagline: box.tagline.trim(),
    category: box.category,
    material: box.material,
    badge: box.badge ?? null,
    featured: box.featured ?? false,
    // Price and free-spin table are frozen while live (the database refuses a change).
    ...(entries ? { price_cents: Math.round(box.price), bonus: box.bonus } : {}),
  };
  if (isNew) check(await sb().from("boxes").insert({ id: box.id, slug: box.slug, status: "draft", sort_order: sortOrder, ...details }));
  else check(await sb().from("boxes").update(details).eq("id", box.id));
  if (entries) {
    check(await sb().from("box_items").delete().eq("box_id", box.id));
    if (entries.length) {
      check(await sb().from("box_items").insert(entries.map((e, position) => ({ box_id: box.id, item_id: e.itemId, position, weight: e.weight }))));
    }
  }
  await revalidateCatalog();
}

/**
 * Uploads a prepared product photo (lib/product-photo) to the public "catalog" bucket and returns
 * its URL. Each upload gets a new name, so a replaced photo never shows a cached old one.
 */
export async function uploadItemPhoto(itemId: string, photo: Blob): Promise<string> {
  const ext = photo.type === "image/webp" ? "webp" : "png";
  const path = `items/${itemId || "new"}-${Date.now().toString(36)}.${ext}`;
  const bucket = sb().storage.from("catalog");
  const { error } = await bucket.upload(path, photo, { contentType: photo.type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(error.message);
  return bucket.getPublicUrl(path).data.publicUrl;
}

export async function setBoxStatus(boxId: string, status: BoxStatus) {
  await rpc("admin_set_box_status", { p_box_id: boxId, p_status: status });
  await revalidateCatalog();
}

export interface SettingRow {
  key: string;
  value: unknown;
  updatedAt: string;
}

export async function loadSettings(): Promise<SettingRow[]> {
  const rows = check<Row[]>(await sb().from("settings").select("*").order("key"));
  return rows.map((r) => ({ key: String(r.key), value: r.value, updatedAt: String(r.updated_at) }));
}

export async function saveSetting(key: string, value: unknown, userId: string) {
  check(await sb().from("settings").update({ value, updated_at: new Date().toISOString(), updated_by: userId }).eq("key", key));
}
