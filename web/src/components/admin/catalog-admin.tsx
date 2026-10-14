"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Boxes, Package, Plus, Settings2, Trash2 } from "lucide-react";
import { isSupabase } from "@/backend/config";
import { can, type BoxStatus } from "@/backend/contract";
import {
  loadBoxesAdmin,
  loadItemsAdmin,
  loadSettings,
  saveBox,
  saveItem,
  saveSetting,
  setBoxStatus,
  type AdminBox,
  type ItemDraft,
  type SettingRow,
} from "@/backend/remote-catalog";
import { economy } from "@/config/economy";
import { formatUsd } from "@/domain/money";
import { expectedValue, priceForRtp } from "@/domain/odds";
import { CATEGORIES, type BoxEntry, type BoxMaterial, type Category, type Item } from "@/domain/types";
import { categoryLabels } from "@/services/catalog";
import { useCatalog } from "@/components/catalog-provider";
import { ItemArt } from "@/components/item/item-art";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/store/auth";
import { cn } from "@/lib/cn";
import { PageTitle, Panel, formatCount, formatPct } from "./ui";

/**
 * Items, box configuration and economy settings. With Supabase these save to the database and
 * revalidate the site's catalog; on the browser mock they show the built-in catalog read-only.
 */

const boxesCrumbs = [
  { label: "Dashboard", href: "/admin" },
  { label: "Boxes", href: "/admin/boxes" },
];
const dollars = (cents: number) => (cents / 100).toFixed(2);
const toCents = (v: string) => Math.round(Number(v.replace(/[$,\s]/g, "")) * 100);
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export function MockNotice({ children }: { children: ReactNode }) {
  if (isSupabase) return null;
  return (
    <p className="mb-6 rounded-2xl border border-dashed border-accent/50 bg-accent-soft px-5 py-3 text-sm leading-relaxed">
      <span className="font-semibold">Read-only until the database is connected.</span> {children}
    </p>
  );
}

const input = "h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm font-medium focus:border-accent focus:outline-none";

function Labeled({ label, children, className }: { label: string; children: (id: string) => ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-muted">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

// Items --------------------------------------------------------------------------------------------

export function ItemsView() {
  const router = useRouter();
  const catalog = useCatalog();
  const staff = useCurrentUser();
  const [items, setItems] = useState<(Item & { active: boolean })[] | null>(isSupabase ? null : catalog.items.map((i) => ({ ...i, active: true })));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [editing, setEditing] = useState<ItemDraft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const editable = isSupabase && can(staff?.role, "catalog.manage");

  const reload = useCallback(async () => {
    if (isSupabase) setItems(await loadItemsAdmin());
  }, []);
  useEffect(() => {
    if (!isSupabase) return;
    loadItemsAdmin()
      .then(setItems)
      .catch((e) => setMessage({ tone: "error", text: String(e?.message ?? e) }));
  }, []);

  const inBoxes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of catalog.boxes) for (const e of b.entries) counts.set(e.itemId, (counts.get(e.itemId) ?? 0) + 1);
    return counts;
  }, [catalog.boxes]);

  const shown = (items ?? []).filter(
    (i) => (category === "all" || i.category === category) && `${i.brand} ${i.name} ${i.id}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  async function save(draft: ItemDraft) {
    if (!draft.name.trim() || !draft.brand.trim() || !(draft.value > 0)) {
      setMessage({ tone: "error", text: "Give the item a name, a brand and a value above $0." });
      return;
    }
    try {
      await saveItem(draft, isNew);
      setEditing(null);
      setMessage({ tone: "ok", text: `${draft.brand} ${draft.name} saved. The site shows it now.` });
      await reload();
      router.refresh();
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error ? e.message : "Couldn't save the item." });
    }
  }

  return (
    <>
      <PageTitle
        crumbs={boxesCrumbs}
        icon={Package}
        title="Items"
        intro="Every piece a box can contain: name, brand, category and the listed value that drives odds, returns and sell-back."
        actions={
          editable && (
            <Button
              onClick={() => {
                setIsNew(true);
                setEditing({ id: "", name: "", brand: "", category: "bags", value: 0, imageUrl: "", active: true });
              }}
            >
              <Plus className="size-4" /> Add item
            </Button>
          )
        }
      />
      <MockNotice>This is the built-in catalog. Once Supabase is connected, staff add and edit items here and the site shows them straight away.</MockNotice>
      {message && (
        <p role="status" className={cn("mb-4 text-sm font-semibold", message.tone === "error" ? "text-danger" : "text-success")}>
          {message.text}
        </p>
      )}
      {editing && <ItemForm draft={editing} isNew={isNew} onCancel={() => setEditing(null)} onSave={save} />}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input aria-label="Search items" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search brand, name or ID" className={cn(input, "max-w-72 rounded-pill")} />
        <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value as Category | "all")} className={cn(input, "w-auto rounded-pill")}>
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {categoryLabels[c]}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted sm:ml-auto">{formatCount(shown.length)} items</p>
      </div>

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm tabular">
            <thead className="text-left text-[11px] font-semibold tracking-wide text-muted uppercase">
              <tr className="border-b border-line">
                <th className="px-4 py-3 font-semibold">Item</th>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 text-right font-semibold">Value</th>
                <th className="px-4 py-3 text-right font-semibold">In live boxes</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items === null && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted">
                    Loading items…
                  </td>
                </tr>
              )}
              {shown.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <ItemArt item={catalog.findItem(i.id) ?? i} rarity="common" showBrand={false} sizes="40px" className="size-10 shrink-0 rounded-lg" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted">{i.brand}</p>
                        <p className="truncate font-semibold">{i.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted">{i.id}</td>
                  <td className="px-4 py-2.5">{categoryLabels[i.category]}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{formatUsd(i.value)}</td>
                  <td className="px-4 py-2.5 text-right">{inBoxes.get(i.id) ?? 0}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn("text-xs font-semibold", i.active ? "text-success" : "text-muted")}>{i.active ? "Active" : "Retired"}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {editable && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsNew(false);
                          setEditing({ id: i.id, name: i.name, brand: i.brand, category: i.category, value: i.value, imageUrl: i.image ?? "", active: i.active });
                        }}
                        className="text-sm font-semibold text-accent"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function ItemForm({ draft, isNew, onSave, onCancel }: { draft: ItemDraft; isNew: boolean; onSave: (d: ItemDraft) => void; onCancel: () => void }) {
  const [d, setD] = useState(draft);
  const [value, setValue] = useState(draft.value ? dollars(draft.value) : "");
  const id = isNew ? slugify(`${d.brand} ${d.name}`) : d.id;
  function submit(e: FormEvent) {
    e.preventDefault();
    onSave({ ...d, id, value: toCents(value) });
  }
  return (
    <Panel title={isNew ? "Add an item" : `Edit ${draft.brand} ${draft.name}`} className="mb-6">
      <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <Labeled label="Brand">{(i) => <input id={i} className={input} value={d.brand} onChange={(e) => setD({ ...d, brand: e.target.value })} />}</Labeled>
        <Labeled label="Name">{(i) => <input id={i} className={input} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />}</Labeled>
        <Labeled label="Category">
          {(i) => (
            <select id={i} className={input} value={d.category} onChange={(e) => setD({ ...d, category: e.target.value as Category })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabels[c]}
                </option>
              ))}
            </select>
          )}
        </Labeled>
        <Labeled label="Listed value (USD)">{(i) => <input id={i} inputMode="decimal" className={input} value={value} onChange={(e) => setValue(e.target.value)} placeholder="1250.00" />}</Labeled>
        <Labeled label="Photo URL (optional)" className="lg:col-span-2">
          {(i) => <input id={i} className={input} value={d.imageUrl} onChange={(e) => setD({ ...d, imageUrl: e.target.value })} placeholder="https://… (transparent PNG or WebP)" />}
        </Labeled>
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} className="size-4 accent-accent" />
            Active (can go into boxes)
          </label>
          <span className="font-mono text-xs text-muted">ID: {id || "—"}</span>
          <span className="flex gap-2 sm:ml-auto">
            <Button type="submit">{isNew ? "Add item" : "Save changes"}</Button>
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          </span>
        </div>
        {!isNew && (
          <p className="text-xs leading-relaxed text-muted sm:col-span-2 lg:col-span-3">
            Changing a value changes the return of every box that contains this item. Check Boxes & odds after saving.
          </p>
        )}
      </form>
    </Panel>
  );
}

// Box configuration --------------------------------------------------------------------------------

const MATERIALS: BoxMaterial[] = ["obsidian", "navy", "sapphire", "ivory", "gold"];
const BOX_CATEGORIES = ["mixed", ...CATEGORIES.filter((c) => c !== "credit")] as const;

export function BoxConfigView() {
  const params = useSearchParams();
  const router = useRouter();
  const catalog = useCatalog();
  const staff = useCurrentUser();
  const boxId = params.get("id");
  const creating = params.get("new") === "1";
  const editable = isSupabase && can(staff?.role, "catalog.manage");

  const [boxes, setBoxes] = useState<AdminBox[] | null>(isSupabase ? null : catalog.boxes.map((b) => ({ ...b, status: "live" as BoxStatus })));
  const [items, setItems] = useState<(Item & { active: boolean })[]>(isSupabase ? [] : catalog.items.map((i) => ({ ...i, active: true })));
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const reload = useCallback(async () => {
    if (!isSupabase) return;
    const [b, i] = await Promise.all([loadBoxesAdmin(), loadItemsAdmin()]);
    setBoxes(b);
    setItems(i);
  }, []);
  useEffect(() => {
    if (!isSupabase) return;
    Promise.all([loadBoxesAdmin(), loadItemsAdmin()])
      .then(([b, i]) => {
        setBoxes(b);
        setItems(i);
      })
      .catch((e) => setMessage({ tone: "error", text: String(e?.message ?? e) }));
  }, []);

  const original = creating
    ? ({ id: "", slug: "", name: "", tagline: "", category: "mixed", price: 0, material: "obsidian", featured: false, entries: [], status: "draft" } satisfies AdminBox)
    : (boxes?.find((b) => b.id === boxId) ?? null);

  if (!boxes) return <div className="h-[60vh] animate-pulse rounded-2xl bg-surface" />;
  if (!original) {
    return (
      <>
        <PageTitle crumbs={boxesCrumbs} icon={Boxes} title="Box not found" />
        <Link href="/admin/boxes" className="font-semibold text-accent">
          Back to boxes
        </Link>
      </>
    );
  }

  return (
    <BoxEditor
      key={original.id || "new"}
      original={original}
      creating={creating}
      items={items}
      editable={editable}
      message={message}
      onMessage={setMessage}
      onSaved={async (id) => {
        await reload();
        router.replace(`/admin/boxes/configure?id=${id}`);
        router.refresh();
      }}
    />
  );
}

function BoxEditor({
  original,
  creating,
  items,
  editable,
  message,
  onMessage,
  onSaved,
}: {
  original: AdminBox;
  creating: boolean;
  items: (Item & { active: boolean })[];
  editable: boolean;
  message: { tone: "ok" | "error"; text: string } | null;
  onMessage: (m: { tone: "ok" | "error"; text: string } | null) => void;
  onSaved: (id: string) => Promise<void>;
}) {
  const [box, setBox] = useState<AdminBox>(original);
  const [price, setPrice] = useState(original.price ? dollars(original.price) : "");
  const [entries, setEntries] = useState<BoxEntry[]>(original.entries);
  const [busy, setBusy] = useState(false);
  const draft = box.status === "draft";
  const oddsEditable = editable && draft;
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const total = entries.reduce((s, e) => s + (Number.isFinite(e.weight) ? e.weight : 0), 0);
  const priceCents = toCents(price) || 0;
  const ev = expectedValue(entries.map((e) => ({ value: itemById.get(e.itemId)?.value ?? 0, weight: e.weight })));
  const configuredRtp = priceCents > 0 && total === economy.oddsScale ? ev / priceCents : null;
  const usedIds = new Set(entries.map((e) => e.itemId));
  const addable = items.filter((i) => i.active && !usedIds.has(i.id)).sort((a, b) => a.value - b.value);

  async function save(publishAfter = false) {
    if (!box.name.trim()) return onMessage({ tone: "error", text: "Give the box a name." });
    if (!(priceCents > 0)) return onMessage({ tone: "error", text: "Set a price above $0." });
    const id = creating ? slugify(box.name) : box.id;
    setBusy(true);
    try {
      await saveBox({ ...box, id, slug: creating ? id : box.slug, price: priceCents }, creating, draft ? entries : null);
      if (publishAfter) await setBoxStatus(id, "live");
      onMessage({ tone: "ok", text: publishAfter ? `${box.name} is live. The site shows its new odds now.` : `${box.name} saved as a draft.` });
      await onSaved(id);
    } catch (e) {
      const text = e instanceof Error ? e.message : String(e);
      onMessage({ tone: "error", text: text.includes("odds_do_not_sum") ? `The weights must add up to exactly ${formatCount(economy.oddsScale)} before the box can go live.` : text });
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status: BoxStatus) {
    setBusy(true);
    try {
      await setBoxStatus(box.id, status);
      onMessage({ tone: "ok", text: status === "draft" ? "Back to draft: the box is off the site and its price and odds can be edited." : status === "live" ? "Published." : "Retired." });
      await onSaved(box.id);
    } catch (e) {
      onMessage({ tone: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  const statusTone = { draft: "text-accent", live: "text-success", retired: "text-muted" }[box.status];

  return (
    <>
      <PageTitle
        crumbs={boxesCrumbs}
        icon={Settings2}
        title={creating ? "New box" : box.name}
        intro={
          creating ? (
            "New boxes start as drafts: set the details and odds, then publish."
          ) : (
            <>
              Status: <span className={cn("font-semibold capitalize", statusTone)}>{box.status}</span>. Price and odds can only change while a box is a draft, so
              what players see always matches what the draw uses.
            </>
          )
        }
        actions={
          editable &&
          !creating && (
            <div className="flex flex-wrap gap-2">
              {box.status === "live" && (
                <Button variant="secondary" disabled={busy} onClick={() => changeStatus("draft")}>
                  Unpublish to edit
                </Button>
              )}
              {box.status !== "retired" && (
                <Button variant="secondary" disabled={busy} onClick={() => changeStatus("retired")}>
                  Retire
                </Button>
              )}
              {box.status === "retired" && (
                <Button variant="secondary" disabled={busy} onClick={() => changeStatus("draft")}>
                  Restore as draft
                </Button>
              )}
            </div>
          )
        }
      />
      <MockNotice>These are the built-in boxes. Once Supabase is connected, staff create boxes, set prices and odds, and publish them here.</MockNotice>
      {message && (
        <p role="status" className={cn("mb-4 text-sm font-semibold", message.tone === "error" ? "text-danger" : "text-success")}>
          {message.text}
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title="Odds (back-office weights)">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm tabular">
              <thead className="text-left text-[11px] font-semibold tracking-wide text-muted uppercase">
                <tr className="border-b border-line">
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Item</th>
                  <th className="px-4 py-3 text-right font-semibold">Value</th>
                  <th className="px-4 py-3 text-right font-semibold">Weight</th>
                  <th className="px-4 py-3 text-right font-semibold">Odds</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {entries.map((e, n) => {
                  const item = itemById.get(e.itemId);
                  return (
                    <tr key={e.itemId}>
                      <td className="px-4 py-2 text-muted">{n + 1}</td>
                      <td className="px-4 py-2">
                        <span className="text-xs text-muted">{item?.brand}</span> <span className="font-semibold">{item?.name ?? e.itemId}</span>
                      </td>
                      <td className="px-4 py-2 text-right">{formatUsd(item?.value ?? 0)}</td>
                      <td className="px-4 py-2 text-right">
                        <input
                          aria-label={`Weight for ${item?.name ?? e.itemId}`}
                          inputMode="numeric"
                          disabled={!oddsEditable}
                          value={e.weight}
                          onChange={(ev2) => setEntries(entries.map((x, i) => (i === n ? { ...x, weight: Math.max(0, Math.floor(Number(ev2.target.value.replace(/\D/g, "")) || 0)) } : x)))}
                          className="h-8 w-24 rounded-lg border border-line bg-surface px-2 text-right disabled:opacity-60"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">{((e.weight / economy.oddsScale) * 100).toFixed(3)}%</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        {oddsEditable && (
                          <span className="inline-flex gap-1">
                            <button type="button" aria-label="Move up" disabled={n === 0} onClick={() => setEntries(swap(entries, n, n - 1))} className="grid size-7 place-items-center rounded-md border border-line disabled:opacity-30">
                              <ArrowUp className="size-3.5" />
                            </button>
                            <button type="button" aria-label="Move down" disabled={n === entries.length - 1} onClick={() => setEntries(swap(entries, n, n + 1))} className="grid size-7 place-items-center rounded-md border border-line disabled:opacity-30">
                              <ArrowDown className="size-3.5" />
                            </button>
                            <button type="button" aria-label="Remove" onClick={() => setEntries(entries.filter((_, i) => i !== n))} className="grid size-7 place-items-center rounded-md border border-line text-danger">
                              <Trash2 className="size-3.5" />
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted">
                      No items yet. Add the first one below.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t border-line font-semibold">
                <tr>
                  <td colSpan={3} className="px-4 py-3">
                    Total
                  </td>
                  <td className={cn("px-4 py-3 text-right", total === economy.oddsScale ? "text-success" : "text-danger")}>
                    {formatCount(total)} / {formatCount(economy.oddsScale)}
                  </td>
                  <td className="px-4 py-3 text-right">{((total / economy.oddsScale) * 100).toFixed(3)}%</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          {oddsEditable && (
            <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3">
              <select
                aria-label="Add an item"
                value=""
                onChange={(e) => e.target.value && setEntries([...entries, { itemId: e.target.value, weight: 1_000 }])}
                className={cn(input, "w-auto max-w-full")}
              >
                <option value="">Add an item…</option>
                {addable.map((i) => (
                  <option key={i.id} value={i.id}>
                    {formatUsd(i.value)} · {i.brand} {i.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted">The draw walks items in this order; keep it stable once a box is live.</p>
            </div>
          )}
          {!oddsEditable && !creating && (
            <p className="border-t border-line px-4 py-3 text-xs text-muted">{editable ? "Unpublish the box to edit its odds." : "Odds as configured in the database."}</p>
          )}
        </Panel>

        <aside className="grid gap-6">
          <Panel title="Details">
            <div className="grid gap-4 p-4">
              <Labeled label="Name">{(i) => <input id={i} disabled={!editable} className={input} value={box.name} onChange={(e) => setBox({ ...box, name: e.target.value })} />}</Labeled>
              <Labeled label="Tagline">{(i) => <input id={i} disabled={!editable} className={input} value={box.tagline} onChange={(e) => setBox({ ...box, tagline: e.target.value })} />}</Labeled>
              <div className="grid grid-cols-2 gap-3">
                <Labeled label="Category">
                  {(i) => (
                    <select id={i} disabled={!editable} className={input} value={box.category} onChange={(e) => setBox({ ...box, category: e.target.value as AdminBox["category"] })}>
                      {BOX_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {categoryLabels[c]}
                        </option>
                      ))}
                    </select>
                  )}
                </Labeled>
                <Labeled label="Finish">
                  {(i) => (
                    <select id={i} disabled={!editable} className={input} value={box.material} onChange={(e) => setBox({ ...box, material: e.target.value as BoxMaterial })}>
                      {MATERIALS.map((m) => (
                        <option key={m} value={m} className="capitalize">
                          {m}
                        </option>
                      ))}
                    </select>
                  )}
                </Labeled>
              </div>
              <Labeled label="Price (USD)">
                {(i) => <input id={i} inputMode="decimal" disabled={!oddsEditable && !creating} className={input} value={price} onChange={(e) => setPrice(e.target.value)} />}
              </Labeled>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" disabled={!editable} checked={box.featured ?? false} onChange={(e) => setBox({ ...box, featured: e.target.checked })} className="size-4 accent-accent" />
                Featured on the home page
              </label>
            </div>
          </Panel>

          <Panel title="Return">
            <dl className="grid gap-2 p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Expected value</dt>
                <dd className="font-semibold tabular">{formatUsd(Math.round(ev))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Configured return</dt>
                <dd className={cn("font-semibold tabular", configuredRtp !== null && configuredRtp > economy.targetRtp + 1e-9 && "text-danger")}>{formatPct(configuredRtp)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Price at {Math.round(economy.targetRtp * 100)}% target</dt>
                <dd className="font-semibold tabular">{total === economy.oddsScale ? formatUsd(priceForRtp(ev)) : "—"}</dd>
              </div>
            </dl>
            {oddsEditable && total === economy.oddsScale && (
              <button type="button" onClick={() => setPrice(dollars(priceForRtp(ev)))} className="mx-4 mb-4 text-sm font-semibold text-accent">
                Use the target price
              </button>
            )}
          </Panel>

          {editable && (
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => save(false)}>
                {creating ? "Create draft" : "Save"}
              </Button>
              {(draft || creating) && (
                <Button variant="secondary" disabled={busy || total !== economy.oddsScale} onClick={() => save(true)}>
                  Save and publish
                </Button>
              )}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function swap<T>(list: T[], a: number, b: number): T[] {
  const next = [...list];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

// Configuration ------------------------------------------------------------------------------------

const SETTINGS: { key: string; label: string; help: string; kind: "cents" | "mode" | "fixed" }[] = [
  { key: "payments_mode", label: "Payments mode", help: "demo: deposits complete at once. live: they wait for the payment provider.", kind: "mode" },
  { key: "min_withdrawal_cents", label: "Smallest withdrawal", help: "Players can't request less than this.", kind: "cents" },
  { key: "max_deposit_cents", label: "Largest single deposit", help: "Per request.", kind: "cents" },
  { key: "starting_balance_cents", label: "Starting balance", help: "Credited to every new account. Keep $0 for real money.", kind: "cents" },
  { key: "sell_back_rate", label: "Sell-back rate", help: "Shown to players across the site, so it changes with a release (docs/07-compliance-ux.md).", kind: "fixed" },
];

export function SettingsView() {
  const staff = useCurrentUser();
  const [rows, setRows] = useState<SettingRow[] | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const editable = isSupabase && can(staff?.role, "settings.edit");

  useEffect(() => {
    if (isSupabase) void loadSettings().then(setRows).catch((e) => setMessage({ tone: "error", text: String(e?.message ?? e) }));
  }, []);

  const valueOf = (key: string): unknown =>
    isSupabase
      ? rows?.find((r) => r.key === key)?.value
      : ({ payments_mode: "demo", min_withdrawal_cents: economy.minWithdrawal, max_deposit_cents: 1_000_000, starting_balance_cents: economy.startingBalance, sell_back_rate: economy.sellBackRate } as Record<string, unknown>)[key];

  return (
    <>
      <PageTitle crumbs={[{ label: "Dashboard", href: "/admin" }]} icon={Settings2} title="Configuration" intro="Economy and payment settings. Changes apply at once and are recorded with who made them." />
      <MockNotice>These are the browser mock&rsquo;s values (config/economy.ts). With Supabase, super admins change them here.</MockNotice>
      {message && (
        <p role="status" className={cn("mb-4 text-sm font-semibold", message.tone === "error" ? "text-danger" : "text-success")}>
          {message.text}
        </p>
      )}
      <Panel>
        <ul className="divide-y divide-line">
          {SETTINGS.map((s) => (
            <SettingRowEditor
              key={s.key}
              setting={s}
              value={valueOf(s.key)}
              editable={editable && s.kind !== "fixed" && (rows !== null || !isSupabase)}
              onSave={async (value) => {
                try {
                  await saveSetting(s.key, value, staff!.id);
                  setRows(await loadSettings());
                  setMessage({ tone: "ok", text: `${s.label} saved.` });
                } catch (e) {
                  setMessage({ tone: "error", text: e instanceof Error ? e.message : String(e) });
                }
              }}
            />
          ))}
        </ul>
      </Panel>
    </>
  );
}

function SettingRowEditor({
  setting,
  value,
  editable,
  onSave,
}: {
  setting: (typeof SETTINGS)[number];
  value: unknown;
  editable: boolean;
  onSave: (value: unknown) => Promise<void>;
}) {
  const shown = setting.kind === "cents" ? formatUsd(Number(value ?? 0)) : setting.kind === "fixed" ? `${Math.round(Number(value ?? 0) * 100)}%` : String(value ?? "—");
  const [draft, setDraft] = useState<string | null>(null);
  const id = useId();
  return (
    <li className="flex flex-wrap items-center gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="font-semibold">
          {setting.label}
        </label>
        <p className="text-xs text-muted">{setting.help}</p>
      </div>
      {draft === null ? (
        <>
          <span className="font-semibold tabular">{shown}</span>
          {editable && (
            <Button size="sm" variant="secondary" onClick={() => setDraft(setting.kind === "cents" ? dollars(Number(value ?? 0)) : String(value ?? ""))}>
              Change
            </Button>
          )}
        </>
      ) : (
        <form
          className="flex items-center gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            await onSave(setting.kind === "cents" ? toCents(draft) : draft);
            setDraft(null);
          }}
        >
          {setting.kind === "mode" ? (
            <select id={id} value={draft} onChange={(e) => setDraft(e.target.value)} className={cn(input, "w-auto")}>
              <option value="demo">demo</option>
              <option value="live">live</option>
            </select>
          ) : (
            <input id={id} inputMode="decimal" value={draft} onChange={(e) => setDraft(e.target.value)} className={cn(input, "w-32")} />
          )}
          <Button size="sm" type="submit">
            Save
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setDraft(null)}>
            Cancel
          </Button>
        </form>
      )}
    </li>
  );
}
