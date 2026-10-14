"use client";

import { Check, Truck } from "lucide-react";
import { useState } from "react";
import { demoClock, economy, shipping } from "@/config/economy";
import { EmptyState, RequireAccount } from "@/components/account/signed-out";
import { ItemArt } from "@/components/item/item-art";
import { RarityTag } from "@/components/item/rarity-tag";
import { SwipeToSell } from "@/components/open/swipe-to-sell";
import { button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { formatUsd } from "@/domain/money";
import { sellBackValue } from "@/domain/odds";
import { formatTimeLeft, shipmentStage, shippingQuote, vaultDeadline, type ShipmentStage } from "@/domain/wallet";
import { useNow } from "@/lib/clock";
import { cn } from "@/lib/cn";
import { sellPull, type Account, type Pull, type Shipment } from "@/store/app";
import { toast } from "@/store/ui";
import { boxBySlug, getItem } from "@/services/catalog";
import { ShipSheet } from "./ship-sheet";

type Tab = "vault" | "shipments" | "sold";

export function CollectionView() {
  return (
    <RequireAccount title="Your collection lives here" body="Pieces you keep wait in your vault, ready to ship or sell. Create an account to open your first box.">
      {(account) => <Collection account={account} />}
    </RequireAccount>
  );
}

function Collection({ account }: { account: Account }) {
  const [tab, setTab] = useState<Tab>("vault");
  const vault = account.pulls.filter((p) => p.status === "vault");
  const sold = account.pulls.filter((p) => p.status === "sold" || p.status === "auto_sold");
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "vault", label: "Vault", count: vault.length },
    { id: "shipments", label: "Shipments", count: account.shipments.length },
    { id: "sold", label: "Sold", count: sold.length },
  ];

  return (
    <div>
      <div role="tablist" aria-label="Collection" className="inline-flex rounded-pill border border-line bg-surface/60 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "h-10 rounded-pill px-4 text-sm font-medium transition-colors md:px-5",
              tab === t.id ? "bg-fg text-bg" : "text-muted hover:text-fg",
            )}
          >
            {t.label}
            <span className="ml-1.5 tabular opacity-70">{t.count}</span>
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "vault" && <VaultList account={account} pulls={vault} />}
        {tab === "shipments" && <ShipmentList account={account} />}
        {tab === "sold" && <SoldList pulls={sold} />}
      </div>
    </div>
  );
}

function VaultList({ account, pulls }: { account: Account; pulls: Pull[] }) {
  const now = useNow();
  const [selected, setSelected] = useState<string[]>([]);
  const [shipOpen, setShipOpen] = useState(false);
  const [selling, setSelling] = useState<Pull | null>(null);
  const chosen = pulls.filter((p) => selected.includes(p.id));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // The sheets keep the same place in the tree whether or not the vault is empty, so the shipping
  // confirmation survives the last piece leaving the vault.
  return (
    <>
      {pulls.length === 0 ? (
        <EmptyState
          title="Your vault is empty"
          body={`Keep a piece after you open a box and it waits here for ${economy.vaultDays} days, ready to ship or sell.`}
          action={{ href: "/", label: "Pick a box" }}
        />
      ) : (
        <VaultItems pulls={pulls} selected={selected} now={now} onToggle={toggle} onSell={setSelling} />
      )}

      {chosen.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.6rem+env(safe-area-inset-bottom))] z-30 border-t border-line/70 bg-bg px-4 py-3 lg:bottom-0">
          <div className="mx-auto flex max-w-3xl items-center gap-4">
            <div className="min-w-0 text-sm">
              <p className="font-semibold">
                {chosen.length} {chosen.length === 1 ? "piece" : "pieces"} selected
              </p>
              <p className="text-muted">Shipping {formatUsd(shippingQuote(chosen.map((p) => p.value)).total)}</p>
            </div>
            <button type="button" onClick={() => setShipOpen(true)} className={button({ className: "ml-auto" })}>
              <Truck className="size-4" />
              Ship {chosen.length === 1 ? "it" : "them"}
            </button>
          </div>
        </div>
      )}

      <ShipSheet account={account} pulls={chosen} open={shipOpen} onClose={() => setShipOpen(false)} onDone={() => setSelected([])} />
      <SellSheet pull={selling} onClose={() => setSelling(null)} />
    </>
  );
}

function VaultItems({
  pulls,
  selected,
  now,
  onToggle,
  onSell,
}: {
  pulls: Pull[];
  selected: string[];
  now: number;
  onToggle: (id: string) => void;
  onSell: (p: Pull) => void;
}) {
  return (
    <>
      <p className="mb-4 text-sm text-muted">
        Select pieces to ship them together. Anything left here for {economy.vaultDays} days sells back automatically for{" "}
        {Math.round(economy.sellBackRate * 100)}% of its value.
      </p>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {pulls.map((p) => {
          const item = getItem(p.itemId);
          const isOn = selected.includes(p.id);
          return (
            <li key={p.id} className={cn("flex gap-3 rounded-3xl border bg-surface/50 p-3 transition-colors", isOn ? "border-accent" : "border-line/80")}>
              <button
                type="button"
                role="checkbox"
                aria-checked={isOn}
                aria-label={`Select ${item.brand} ${item.name} for shipping`}
                onClick={() => onToggle(p.id)}
                className="relative shrink-0"
              >
                <ItemArt item={item} rarity={p.rarity} showBrand={false} sizes="96px" className="size-24 rounded-2xl" />
                <span className={cn("absolute top-1.5 left-1.5 grid size-6 place-items-center rounded-full border-2", isOn ? "border-accent bg-accent text-on-accent" : "border-fg/50 bg-bg/60")}>
                  {isOn && <Check className="size-3.5" strokeWidth={3} />}
                </span>
              </button>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-xs font-semibold tracking-wide text-muted">{item.brand}</p>
                <p className="truncate font-medium">{item.name}</p>
                <div className="mt-1 flex items-center gap-3">
                  <span className="font-display font-semibold tabular">{formatUsd(p.value)}</span>
                  <RarityTag rarity={p.rarity} />
                </div>
                <p className="mt-auto pt-2 text-xs text-subtle">{now ? `Sells back in ${formatTimeLeft(vaultDeadline(p.at) - now)}` : " "}</p>
              </div>
              <button type="button" onClick={() => onSell(p)} className={button({ variant: "outline", size: "sm", className: "self-center" })}>
                Sell
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function SellSheet({ pull, onClose }: { pull: Pull | null; onClose: () => void }) {
  const item = pull ? getItem(pull.itemId) : null;
  return (
    <Sheet open={pull !== null} onClose={onClose} title="Sell back">
      {pull && item && (
        <div>
          <div className="flex items-center gap-4">
            <ItemArt item={item} rarity={pull.rarity} showBrand={false} sizes="80px" className="size-20 shrink-0 rounded-2xl" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold tracking-wide text-muted">{item.brand}</p>
              <p className="truncate font-medium">{item.name}</p>
              <p className="font-display font-semibold tabular">{formatUsd(pull.value)}</p>
            </div>
          </div>
          <p className="mt-5 text-sm text-muted">The money goes to your withdrawable balance, ready to cash out or spend.</p>
          <div className="mt-4">
            <SwipeToSell
              offer={sellBackValue(pull.value)}
              onSell={() => {
                const paid = sellPull(pull.id);
                toast(`Sold. ${formatUsd(paid)} is in your withdrawable balance.`);
                onClose();
              }}
            />
          </div>
        </div>
      )}
    </Sheet>
  );
}

const STAGES: { id: ShipmentStage | "requested"; label: string }[] = [
  { id: "requested", label: "Requested" },
  { id: "preparing", label: "Packing" },
  { id: "shipped", label: "On its way" },
  { id: "delivered", label: "Delivered" },
];

function ShipmentList({ account }: { account: Account }) {
  const now = useNow();
  if (account.shipments.length === 0) {
    return (
      <EmptyState
        title="Nothing on its way yet"
        body="Choose pieces in your vault and ship them together in one box. Pieces worth $500 or more travel insured."
      />
    );
  }
  return (
    <>
      <p className="mb-4 text-sm text-muted">
        In this prototype a shipment moves to “On its way” after {demoClock.shipmentShippedAfterMs / 60_000} minutes and
        arrives after {demoClock.shipmentDeliveredAfterMs / 60_000}, so you can watch each step.
      </p>
      <ul className="space-y-4">
        {account.shipments.map((s) => (
          <ShipmentCard key={s.id} shipment={s} account={account} now={now} />
        ))}
      </ul>
    </>
  );
}

function ShipmentCard({ shipment, account, now }: { shipment: Shipment; account: Account; now: number }) {
  const stage = now ? shipmentStage(shipment.at, now) : "preparing";
  const reached = STAGES.findIndex((s) => s.id === stage);
  const pulls = account.pulls.filter((p) => shipment.pullIds.includes(p.id));
  return (
    <li className="rounded-3xl border border-line/80 bg-surface/50 p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{STAGES[reached].label}</p>
          <p className="text-sm text-muted">
            {shipping.carrier}, tracking {shipment.tracking}
          </p>
        </div>
        <p className="font-display text-sm tabular text-muted">{formatUsd(shipment.quote.total)} paid</p>
      </div>
      <ol className="mt-4 grid grid-cols-4 gap-1.5" aria-label="Shipment progress">
        {STAGES.map((s, i) => (
          <li key={s.id}>
            <span className={cn("block h-1.5 rounded-full", i <= reached ? "bg-accent" : "bg-line")} />
            <span className={cn("mt-1.5 block text-xs", i <= reached ? "text-fg" : "text-subtle")}>{s.label}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex items-center gap-2">
        {pulls.map((p) => (
          <ItemArt key={p.id} item={getItem(p.itemId)} rarity={p.rarity} showBrand={false} sizes="48px" className="size-12 rounded-xl" />
        ))}
        <p className="ml-2 min-w-0 truncate text-sm text-muted">
          To {shipment.address.city}, {shipment.address.state}
        </p>
      </div>
    </li>
  );
}

function SoldList({ pulls }: { pulls: Pull[] }) {
  if (pulls.length === 0) {
    return <EmptyState title="Nothing sold yet" body={`Swipe to sell any piece for ${Math.round(economy.sellBackRate * 100)}% of its value. The money lands in your withdrawable balance.`} />;
  }
  return (
    <ul className="divide-y divide-line/70 rounded-3xl border border-line/80 bg-surface/50 px-4">
      {pulls.map((p) => {
        const item = getItem(p.itemId);
        const box = boxBySlug(p.boxId);
        return (
          <li key={p.id} className="flex items-center gap-3 py-3">
            <ItemArt item={item} rarity={p.rarity} showBrand={false} sizes="48px" className="size-12 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {item.brand} {item.name}
              </p>
              <p className="truncate text-sm text-subtle">
                {p.status === "auto_sold" ? `Sold after ${economy.vaultDays} days` : "You sold it"}
                {box ? `, from ${box.name}` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display font-semibold tabular text-success">+{formatUsd(p.soldFor ?? 0)}</p>
              <p className="text-xs text-subtle tabular">of {formatUsd(p.value)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
