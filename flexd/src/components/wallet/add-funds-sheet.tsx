"use client";

import { useState, useSyncExternalStore } from "react";
import { economy } from "@/config/economy";
import { button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { inAppBrowser } from "@/domain/account";
import { formatUsd } from "@/domain/money";
import { cn } from "@/lib/cn";
import { addFunds, useCurrentAccount } from "@/store/app";
import { openAddFunds, toast, useUi } from "@/store/ui";

const APP_NAME = { tiktok: "TikTok", instagram: "Instagram", facebook: "Facebook" } as const;
const noop = () => () => {};

export function useInAppBrowser() {
  return useSyncExternalStore(noop, () => inAppBrowser(navigator.userAgent), () => null);
}

export function AddFundsSheet() {
  const open = useUi((s) => s.addFunds);
  const account = useCurrentAccount();
  return (
    <Sheet open={open && !!account} onClose={() => openAddFunds(false)} title="Add funds">
      <AddFundsForm />
    </Sheet>
  );
}

function AddFundsForm() {
  const inApp = useInAppBrowser();
  const methods = inApp ? (["Card"] as const) : (["Apple Pay", "Google Pay", "Card"] as const);
  const [amount, setAmount] = useState<number>(economy.addFundsAmounts[1]);
  const [custom, setCustom] = useState("");
  const [method, setMethod] = useState<string>(methods[0]);
  const [busy, setBusy] = useState(false);

  const cents = custom ? Math.round(Number(custom) * 100) : amount;
  const valid = Number.isFinite(cents) && cents >= 500 && cents <= 1_000_000;

  function submit() {
    if (!valid) return;
    setBusy(true);
    // Stand-in for the payment provider's confirmation.
    setTimeout(() => {
      addFunds(cents, method);
      setBusy(false);
      openAddFunds(false);
      toast(`Added ${formatUsd(cents)} to your credit.`);
    }, 900);
  }

  return (
    <div className="space-y-6">
      <p className="text-muted">Added funds go to your Credit balance and buy boxes. Nothing is charged in this prototype.</p>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-muted">Amount</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {economy.addFundsAmounts.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={!custom && amount === a}
              onClick={() => {
                setAmount(a);
                setCustom("");
              }}
              className={cn(
                "h-12 rounded-2xl border font-price font-semibold tabular transition-colors",
                !custom && amount === a ? "border-accent bg-accent-soft text-fg" : "border-line text-muted hover:text-fg",
              )}
            >
              {formatUsd(a)}
            </button>
          ))}
        </div>
        <label className="mt-3 flex h-12 items-center gap-2 rounded-2xl border border-line bg-bg/60 px-4 focus-within:border-accent">
          <span className="text-muted">$</span>
          <input
            inputMode="decimal"
            placeholder="Other amount"
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/[^\d.]/g, ""))}
            className="w-full bg-transparent outline-none placeholder:text-subtle"
            aria-label="Other amount in dollars"
          />
        </label>
        {custom && !valid && <p className="mt-1.5 text-sm text-danger">Choose between $5 and $10,000.</p>}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-muted">Pay with</legend>
        <div className="grid gap-2">
          {methods.map((m) => (
            <label
              key={m}
              className={cn(
                "flex h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 transition-colors",
                method === m ? "border-accent bg-accent-soft" : "border-line",
              )}
            >
              <input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} className="accent-[var(--gold)]" />
              {m === "Card" ? "Card ending 4242" : m}
            </label>
          ))}
        </div>
        {inApp && (
          <p className="mt-3 text-sm text-muted">
            You&apos;re in {APP_NAME[inApp]}&apos;s browser, so cards work here. For Apple Pay or Google Pay, open this page in
            Safari or Chrome.
          </p>
        )}
      </fieldset>

      <button type="button" onClick={submit} disabled={!valid || busy} className={button({ size: "lg", className: "w-full" })}>
        {busy ? "Confirming…" : `Add ${valid ? formatUsd(cents) : "funds"}`}
      </button>
    </div>
  );
}
