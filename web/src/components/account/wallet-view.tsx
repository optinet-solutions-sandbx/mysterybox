"use client";

import { economy } from "@/config/economy";
import { formatUsd } from "@/domain/money";
import { useSession, useSessionHydrated } from "@/store/session";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function WalletView() {
  const hydrated = useSessionHydrated();
  const balance = useSession((s) => s.balance);
  const transactions = useSession((s) => s.transactions);
  const deposit = useSession((s) => s.deposit);
  const reset = useSession((s) => s.reset);

  if (!hydrated) return <div className="h-64 animate-pulse rounded-card bg-surface" />;

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
      <div className="h-fit rounded-card bg-surface p-6 ring-1 ring-line">
        <p className="text-sm text-muted">Demo balance</p>
        <p className="mt-1 font-display text-4xl text-foil tabular">{formatUsd(balance)}</p>
        <p className="mt-6 mb-3 text-xs font-semibold tracking-wide text-subtle uppercase">Add demo funds</p>
        <div className="grid grid-cols-2 gap-2">
          {economy.topUpAmounts.map((amount) => (
            <Button key={amount} variant="secondary" onClick={() => deposit(amount)}>
              <span className="font-display tabular">+{formatUsd(amount)}</span>
            </Button>
          ))}
        </div>
        <p className="mt-4 text-xs text-subtle">
          No payment is taken. In production this panel hosts card and crypto deposits through the chosen payment
          provider, plus deposit limits and cool-off tools.
        </p>
        <Button variant="ghost" size="sm" className="mt-4" onClick={reset}>
          Reset demo session
        </Button>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Activity</h2>
        {transactions.length === 0 ? (
          <p className="rounded-card bg-surface px-6 py-10 text-center text-muted ring-1 ring-line">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface ring-1 ring-line">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-subtle">{new Date(t.at).toLocaleString("en-US")}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 font-display text-sm tabular",
                    t.amount > 0 ? "text-success" : t.amount < 0 ? "text-fg" : "text-subtle",
                  )}
                >
                  {t.amount > 0 ? "+" : t.amount < 0 ? "−" : ""}
                  {t.amount === 0 ? "—" : formatUsd(Math.abs(t.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
