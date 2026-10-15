"use client";

import { Check } from "lucide-react";
import { useState, type FormEvent } from "react";
import { shipping } from "@/config/economy";
import { ItemArt } from "@/components/item/item-art";
import { button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { addressErrors, US_STATES, type UsAddress } from "@/domain/account";
import { formatUsd } from "@/domain/money";
import { shippingQuote, totalBalance } from "@/domain/wallet";
import { requestShipment, type Account, type Pull, type Shipment } from "@/store/app";
import { openAddFunds } from "@/store/ui";
import { getItem } from "@/services/catalog";

const EMPTY: UsAddress = { name: "", line1: "", line2: "", city: "", state: "", zip: "" };

/** Address, then the cost breakdown, then the confirmation with tracking. */
export function ShipSheet({ account, pulls, open, onClose, onDone }: { account: Account; pulls: Pull[]; open: boolean; onClose: () => void; onDone: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Ship to your door">
      {open && <ShipFlow account={account} pulls={pulls} onDone={onDone} onClose={onClose} />}
    </Sheet>
  );
}

function ShipFlow({ account, pulls: selected, onDone, onClose }: { account: Account; pulls: Pull[]; onDone: () => void; onClose: () => void }) {
  // Frozen at open: the parent clears its selection once the shipment is requested.
  const [pulls] = useState(selected);
  const [step, setStep] = useState<"address" | "review" | "done">("address");
  const [address, setAddress] = useState<UsAddress>(account.lastAddress ?? EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof UsAddress, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const quote = shippingQuote(pulls.map((p) => p.value));
  const set = (k: keyof UsAddress) => (e: { target: { value: string } }) => setAddress({ ...address, [k]: e.target.value });

  function toReview(e: FormEvent) {
    e.preventDefault();
    const found = addressErrors(address);
    setErrors(found);
    if (Object.keys(found).length === 0) setStep("review");
  }

  function confirm() {
    const result = requestShipment(
      pulls.map((p) => p.id),
      address,
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setShipment(result.shipment);
    setStep("done");
    onDone();
  }

  if (step === "done" && shipment) {
    return (
      <div className="text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-success/15">
          <span className="grid size-12 place-items-center rounded-full bg-success text-bg">
            <Check className="size-6" strokeWidth={3} />
          </span>
        </div>
        <p className="mt-5 font-display text-2xl">Shipment requested</p>
        <p className="mt-2 text-muted">
          We pack and dispatch within {shipping.dispatchDays} business days and email tracking when it leaves.
        </p>
        <div className="mt-6 rounded-2xl border border-line/80 bg-bg/40 p-4 text-left text-sm">
          <p className="text-muted">{shipping.carrier}</p>
          <p className="mt-1 font-semibold">
            {address.line1}, {address.city}, {address.state}
          </p>
          <p className="mt-3 text-muted">Tracking number</p>
          <p className="font-semibold tracking-wide">{shipment.tracking}</p>
        </div>
        <button type="button" onClick={onClose} className={button({ variant: "solid", size: "lg", className: "mt-6 w-full" })}>
          Done
        </button>
      </div>
    );
  }

  if (step === "review") {
    const short = quote.total - totalBalance(account.balances);
    return (
      <div className="space-y-5">
        <ul className="space-y-2">
          {pulls.map((p) => {
            const item = getItem(p.itemId);
            return (
              <li key={p.id} className="flex items-center gap-3">
                <ItemArt item={item} rarity={p.rarity} showBrand={false} sizes="48px" className="size-12 shrink-0 rounded-xl" />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {item.brand} {item.name}
                </span>
                <span className="font-price text-sm font-semibold tabular">{formatUsd(p.value)}</span>
              </li>
            );
          })}
        </ul>
        <dl className="space-y-2 rounded-2xl border border-line/80 bg-bg/40 p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Shipping, first piece</dt>
            <dd className="tabular">{formatUsd(quote.base)}</dd>
          </div>
          {quote.extra > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">
                {quote.pieces - 1} more {quote.pieces - 1 === 1 ? "piece" : "pieces"} in the same box
              </dt>
              <dd className="tabular">{formatUsd(quote.extra)}</dd>
            </div>
          )}
          {quote.insurance > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">
                Insurance on {quote.insuredPieces} {quote.insuredPieces === 1 ? "piece" : "pieces"} over {formatUsd(shipping.insuredFrom)}
              </dt>
              <dd className="tabular">{formatUsd(quote.insurance)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-line/70 pt-2 font-semibold">
            <dt>Total</dt>
            <dd className="font-price tabular">{formatUsd(quote.total)}</dd>
          </div>
        </dl>
        <p className="text-sm text-muted">
          To {address.name}, {address.line1}
          {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state} {address.zip}.{" "}
          <button type="button" onClick={() => setStep("address")} className="font-semibold text-accent">
            Change
          </button>
        </p>
        {error && <p className="text-sm text-danger">{error}</p>}
        {short > 0 ? (
          <button type="button" onClick={() => openAddFunds()} className={button({ size: "lg", className: "w-full" })}>
            Add {formatUsd(short)} to ship
          </button>
        ) : (
          <button type="button" onClick={confirm} className={button({ size: "lg", className: "w-full" })}>
            Pay {formatUsd(quote.total)} and ship
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={toReview} noValidate className="space-y-4">
      <p className="text-muted">
        Shipping {pulls.length} {pulls.length === 1 ? "piece" : "pieces"} together in one box costs {formatUsd(quote.total)}.
      </p>
      <Field label="Full name" value={address.name} onChange={set("name")} error={errors.name} autoComplete="name" />
      <Field label="Street address" value={address.line1} onChange={set("line1")} error={errors.line1} autoComplete="address-line1" />
      <Field label="Apartment, suite (optional)" value={address.line2} onChange={set("line2")} autoComplete="address-line2" />
      <Field label="City" value={address.city} onChange={set("city")} error={errors.city} autoComplete="address-level2" />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="State" value={address.state} onChange={set("state")} error={errors.state} autoComplete="address-level1">
          <option value="">Choose</option>
          {US_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
        <Field label="ZIP code" value={address.zip} onChange={set("zip")} error={errors.zip} inputMode="numeric" autoComplete="postal-code" maxLength={10} />
      </div>
      <button type="submit" className={button({ size: "lg", className: "w-full" })}>
        Review shipping
      </button>
    </form>
  );
}
