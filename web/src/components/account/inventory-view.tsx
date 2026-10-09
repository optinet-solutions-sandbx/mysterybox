"use client";

import { useState } from "react";
import type { InventoryItem, InventoryStatus } from "@/domain/types";
import { formatUsd } from "@/domain/money";
import { rarityFor, sellBackValue } from "@/domain/odds";
import { getBox, getItem } from "@/services/catalog";
import { useSession, useSessionHydrated } from "@/store/session";
import { ItemArt } from "@/components/item/item-art";
import { RarityTag } from "@/components/item/rarity-tag";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Tab = "held" | "shipping" | "sold";

const tabStatuses: Record<Tab, InventoryStatus[]> = {
  held: ["held"],
  shipping: ["shipping_pending", "shipping_processing", "shipped"],
  sold: ["sold"],
};

const statusLabel: Record<InventoryStatus, string> = {
  held: "In inventory",
  sold: "Sold back",
  shipping_pending: "Shipping requested",
  shipping_processing: "Preparing shipment",
  shipped: "Shipped",
};

export function InventoryView() {
  const hydrated = useSessionHydrated();
  const inventory = useSession((s) => s.inventory);
  const sellBack = useSession((s) => s.sellBack);
  const [tab, setTab] = useState<Tab>("held");
  const [message, setMessage] = useState<string | null>(null);

  if (!hydrated) return <div className="h-64 animate-pulse rounded-card bg-surface" />;

  const held = inventory.filter((i) => i.status === "held");
  const heldValue = held.reduce((sum, i) => sum + getItem(i.itemId).value, 0);
  const sellAllValue = held.reduce((sum, i) => sum + sellBackValue(getItem(i.itemId).value), 0);
  const visible = inventory.filter((i) => tabStatuses[tab].includes(i.status));

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Value in inventory</p>
          <p className="font-display text-4xl text-foil tabular">{formatUsd(heldValue)}</p>
        </div>
        {held.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => {
              const credited = sellBack(held.map((i) => i.uid));
              setMessage(`Sold ${held.length} items for ${formatUsd(credited)}.`);
            }}
          >
            Sell all for <span className="font-display tabular">{formatUsd(sellAllValue)}</span>
          </Button>
        )}
      </div>

      <div className="mb-6 flex gap-2" role="tablist" aria-label="Inventory">
        {(Object.keys(tabStatuses) as Tab[]).map((t) => {
          const count = inventory.filter((i) => tabStatuses[t].includes(i.status)).length;
          return (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-pill px-4 py-2 text-sm font-semibold ring-1 ring-line transition-colors",
                tab === t ? "bg-fg text-bg" : "text-muted hover:text-fg",
              )}
            >
              {t === "held" ? "Inventory" : t === "shipping" ? "Shipping" : "Sold"} <span className="font-display">{count}</span>
            </button>
          );
        })}
      </div>

      <p role="status" aria-live="polite" className="mb-4 min-h-5 text-sm text-success">
        {message}
      </p>

      {visible.length === 0 ? (
        <div className="rounded-card bg-surface px-6 py-16 text-center ring-1 ring-line">
          <p className="font-display text-3xl">Nothing here yet.</p>
          <p className="mt-2 text-muted">Items you open land here first.</p>
          <ButtonLink href="/boxes" className="mt-6">
            Browse boxes
          </ButtonLink>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((inv) => (
            <InventoryCard key={inv.uid} inv={inv} onMessage={setMessage} />
          ))}
        </ul>
      )}
    </div>
  );
}

function InventoryCard({ inv, onMessage }: { inv: InventoryItem; onMessage: (m: string) => void }) {
  const sellBack = useSession((s) => s.sellBack);
  const requestShipping = useSession((s) => s.requestShipping);
  const cancelShipping = useSession((s) => s.cancelShipping);
  const item = getItem(inv.itemId);
  const box = getBox(inv.boxId);
  const rarity = rarityFor(item.value, box?.price ?? item.value);

  return (
    <li className="flex flex-col overflow-hidden rounded-card bg-surface ring-1 ring-line">
      <ItemArt item={item} rarity={rarity} className="rounded-none" />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <RarityTag rarity={rarity} />
          <span className="text-xs text-subtle">{statusLabel[inv.status]}</span>
        </div>
        <p className="mt-3 text-xs text-muted">{item.brand}</p>
        <p className="font-medium">{item.name}</p>
        <p className="mt-1 font-display text-foil tabular">{formatUsd(item.value)}</p>
        <p className="mt-1 text-xs text-subtle">
          From {box?.name ?? "a box"} · {new Date(inv.acquiredAt).toLocaleDateString("en-US")}
        </p>
        <div className="mt-auto grid gap-2 pt-4">
          {inv.status === "held" && (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onMessage(`Sold back for ${formatUsd(sellBack([inv.uid]))}.`)}
              >
                Sell back · <span className="font-display tabular">{formatUsd(sellBackValue(item.value))}</span>
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  requestShipping(inv.uid);
                  onMessage(`Shipping requested for ${item.name}. You can cancel while it’s pending.`);
                }}
                disabled={item.category === "credit"}
              >
                Request shipping
              </Button>
            </>
          )}
          {inv.status === "shipping_pending" && (
            <Button size="sm" variant="ghost" onClick={() => cancelShipping(inv.uid)}>
              Cancel request
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
