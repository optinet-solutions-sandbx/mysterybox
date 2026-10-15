"use client";

import { ArrowDownLeft, ArrowUpRight, Box, Crown, Landmark, Plus, Tag, Truck } from "lucide-react";
import { useState } from "react";
import { economy } from "@/config/economy";
import { RequireAccount } from "@/components/account/signed-out";
import { button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { formatBalance, formatUsd } from "@/domain/money";
import { cashOutError, payoutCompleted, totalBalance } from "@/domain/wallet";
import { useNow } from "@/lib/clock";
import { cn } from "@/lib/cn";
import { cashOut, type Account, type Tx, type TxKind } from "@/store/app";
import { openAddFunds, toast } from "@/store/ui";

export function WalletView() {
  return (
    <RequireAccount title="Your wallet" body="Add funds to open boxes, and cash out what you make selling pieces back. Create an account to start.">
      {(account) => <Wallet account={account} />}
    </RequireAccount>
  );
}

function Wallet({ account }: { account: Account }) {
  const [cashOutOpen, setCashOutOpen] = useState(false);
  const { credit, withdrawable } = account.balances;
  const canCashOut = withdrawable >= economy.minWithdrawal;

  return (
    <div>
      <section aria-label="Balances" className="rounded-[32px] border border-line/80 bg-[var(--card)] p-5 md:p-8">
        <p className="text-sm text-muted">Total balance</p>
        <p className="mt-1 font-display text-4xl font-semibold tabular md:text-5xl">{formatBalance(totalBalance(account.balances))}</p>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-3xl bg-bg/40 p-4">
            <p className="font-semibold">Credit</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular">{formatBalance(credit)}</p>
            <p className="mt-2 text-sm text-muted">Money you added and rewards. Spends on boxes and shipping, first.</p>
          </div>
          <div className="rounded-3xl bg-bg/40 p-4">
            <p className="font-semibold">Withdrawable</p>
            <p className="mt-1 font-display text-2xl font-bold text-accent tabular">{formatBalance(withdrawable)}</p>
            <p className="mt-2 text-sm text-muted">From pieces you sold back. Cash it out, or spend it once your credit runs out.</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:flex">
          <button type="button" onClick={() => openAddFunds()} className={button({ size: "lg" })}>
            <Plus className="size-4" />
            Add funds
          </button>
          <button type="button" onClick={() => setCashOutOpen(true)} disabled={!canCashOut} className={button({ variant: "outline", size: "lg" })}>
            <Landmark className="size-4" />
            Cash out
          </button>
        </div>
        {!canCashOut && (
          <p className="mt-3 text-sm text-subtle">
            Cash-outs start at {formatUsd(economy.minWithdrawal)} of withdrawable balance. Sell a piece back to get there.
          </p>
        )}
      </section>

      <section aria-labelledby="history" className="mt-10">
        <h2 id="history" className="font-punch text-2xl">
          History
        </h2>
        <History txs={account.txs} />
      </section>

      <Sheet open={cashOutOpen} onClose={() => setCashOutOpen(false)} title="Cash out">
        {cashOutOpen && <CashOutForm withdrawable={withdrawable} onDone={() => setCashOutOpen(false)} />}
      </Sheet>
    </div>
  );
}

const ICON: Record<TxKind, typeof Box> = {
  demo: Plus,
  deposit: ArrowDownLeft,
  referral: Crown,
  box: Box,
  sale: Tag,
  auto_sale: Tag,
  shipping: Truck,
  cash_out: ArrowUpRight,
};

function History({ txs }: { txs: Tx[] }) {
  const now = useNow();
  const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return (
    <ul className="mt-4 divide-y divide-line/70 rounded-3xl border border-line/80 bg-surface/50 px-4">
      {txs.map((t) => {
        const Icon = ICON[t.kind];
        const amount = t.credit + t.withdrawable;
        const pending = t.kind === "cash_out" && now !== 0 && !payoutCompleted(t.at, now);
        const balance = t.credit && t.withdrawable ? "Credit and withdrawable" : t.withdrawable ? "Withdrawable" : "Credit";
        return (
          <li key={t.id} className="flex items-center gap-3 py-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
              <Icon className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-medium">{t.label}</p>
              <p className="flex gap-3 truncate text-sm text-subtle">
                <span>{now ? date.format(new Date(t.at)) : ""}</span>
                <span>{balance}</span>
              </p>
            </div>
            <div className="text-right">
              <p className={cn("font-display font-semibold tabular", amount > 0 ? "text-success" : "text-fg")}>
                {amount > 0 ? "+" : amount < 0 ? "−" : ""}
                {formatUsd(Math.abs(amount))}
              </p>
              {t.kind === "cash_out" && (
                <p className={cn("text-xs font-semibold", pending ? "text-accent" : "text-subtle")}>{pending ? "Pending" : "Sent"}</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const PAYOUTS = [
  { id: "Venmo", timing: "Usually 1 to 5 business days" },
  { id: "bank transfer", label: "Bank transfer", timing: "2 to 5 business days" },
  { id: "same-day bank transfer", label: "Same-day bank transfer", timing: "Within 24 hours on weekdays" },
];

function CashOutForm({ withdrawable, onDone }: { withdrawable: number; onDone: () => void }) {
  const [value, setValue] = useState((withdrawable / 100).toFixed(2));
  const [method, setMethod] = useState(PAYOUTS[0].id);
  const [error, setError] = useState<string | null>(null);
  const cents = Math.round(Number(value) * 100);

  function submit() {
    const problem = cashOut(cents, method);
    if (problem) {
      setError(problem);
      return;
    }
    toast(`${formatUsd(cents)} is on its way to your ${method}.`);
    onDone();
  }

  return (
    <div className="space-y-5">
      <p className="text-muted">You can cash out up to {formatUsd(withdrawable)}. Credit you added stays for boxes.</p>
      <div>
        <label className="flex h-14 items-center gap-2 rounded-2xl border border-line bg-bg/60 px-4 focus-within:border-accent">
          <span className="text-muted">$</span>
          <input
            inputMode="decimal"
            aria-label="Amount in dollars"
            value={value}
            onChange={(e) => {
              setValue(e.target.value.replace(/[^\d.]/g, ""));
              setError(null);
            }}
            className="w-full bg-transparent font-display text-xl font-semibold outline-none tabular"
          />
          <button type="button" onClick={() => setValue((withdrawable / 100).toFixed(2))} className="rounded-pill border border-line px-3 py-1 text-xs font-semibold">
            Max
          </button>
        </label>
        {(error ?? cashOutError(withdrawable, cents)) && value !== "" && (
          <p className="mt-1.5 text-sm text-danger">{error ?? cashOutError(withdrawable, cents)}</p>
        )}
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium text-muted">Send to</legend>
        {PAYOUTS.map((p) => (
          <label
            key={p.id}
            className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors", method === p.id ? "border-accent bg-accent-soft" : "border-line")}
          >
            <input type="radio" name="payout" checked={method === p.id} onChange={() => setMethod(p.id)} className="accent-[var(--gold)]" />
            <span>
              <span className="block font-medium">{p.label ?? p.id}</span>
              <span className="block text-sm text-subtle">{p.timing}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <button type="button" onClick={submit} disabled={cashOutError(withdrawable, cents) !== null} className={button({ size: "lg", className: "w-full" })}>
        Cash out {cashOutError(withdrawable, cents) ? "" : formatUsd(cents)}
      </button>
    </div>
  );
}
