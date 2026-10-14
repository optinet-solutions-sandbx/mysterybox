"use client";

import type { Box, BoxEntry, Category, Item } from "@/domain/types";
import type { BoxStatus } from "./contract";
import { staticCatalog } from "@/services/catalog";
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
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    brand: String(r.brand),
    category: r.category as Category,
    value: Number(r.value_cents),
    image: (r.image_url as string | null) ?? undefined,
    active: Boolean(r.active),
  }));
}

export async function saveItem(draft: ItemDraft, isNew: boolean) {
  const row = {
    name: draft.name.trim(),
    brand: draft.brand.trim(),
    category: draft.category,
    value_cents: Math.round(draft.value),
    image_url: draft.imageUrl.trim() || null,
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
  return boxes.map((r) => ({
    id: String(r.id),
    slug: String(r.slug),
    name: String(r.name),
    tagline: String(r.tagline ?? ""),
    category: r.category as Box["category"],
    price: Number(r.price_cents),
    material: r.material as Box["material"],
    badge: (r.badge as Box["badge"]) ?? undefined,
    featured: Boolean(r.featured),
    status: r.status as BoxStatus,
    bonus: staticCatalog.getBox(String(r.slug))?.bonus ?? [],
    entries: odds.filter((o) => o.box_id === r.id).map((o) => ({ itemId: String(o.item_id), weight: Number(o.weight) })),
  }));
}

/**
 * Saves a box. Price and odds can only change while the box is a draft (the database freezes the
 * odds of a live box); publishing is a separate step that re-checks the weights.
 */
export async function saveBox(box: AdminBox, isNew: boolean, entries: BoxEntry[] | null) {
  const details = {
    name: box.name.trim(),
    tagline: box.tagline.trim(),
    category: box.category,
    material: box.material,
    badge: box.badge ?? null,
    featured: box.featured ?? false,
    price_cents: Math.round(box.price),
  };
  if (isNew) check(await sb().from("boxes").insert({ id: box.id, slug: box.slug, status: "draft", ...details }));
  else check(await sb().from("boxes").update(details).eq("id", box.id));
  if (entries) {
    check(await sb().from("box_items").delete().eq("box_id", box.id));
    if (entries.length) {
      check(await sb().from("box_items").insert(entries.map((e, position) => ({ box_id: box.id, item_id: e.itemId, position, weight: e.weight }))));
    }
  }
  await revalidateCatalog();
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
