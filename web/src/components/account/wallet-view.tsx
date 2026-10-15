"use client";

import { useId, useState, type FormEvent } from "react";
import { economy } from "@/config/economy";
import { useTradeIn } from "@/components/site-settings-provider";
import { formatUsd } from "@/domain/money";
import { useAuthHydrated, useCurrentUser } from "@/store/auth";
import { useSession, useSessionHydrated } from "@/store/session";
import { AuthPrompt } from "@/components/auth/auth-prompt";
import { CreditHistory } from "./credit-history";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function WalletView() {
  const hydrated = useSessionHydrated();
  const authHydrated = useAuthHydrated();
  const user = useCurrentUser();
  const balance = useSession((s) => s.balance);
  const held = useSession((s) => s.held);
  const transactions = useSession((s) => s.transactions);
  const deposit = useSession((s) => s.deposit);
  const cancelWithdrawal = useSession((s) => s.cancelWithdrawal);
  const reset = useSession((s) => s.reset);
  const tradeInEnabled = useTradeIn();

  if (!hydrated || !authHydrated) return <div className="h-64 animate-pulse rounded-card bg-surface" />;
  if (!user) return <AuthPrompt title="Sign in to see your wallet" body={tradeInEnabled ? "Your demo balance and every top-up, open and trade-in are kept with your account." : "Your demo balance and every top-up and open are kept with your account."} />;

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
      <div className="grid h-fit gap-6">
        <div className="rounded-card bg-surface p-6 ring-1 ring-line">
          <p className="text-sm font-semibold text-muted">Demo balance</p>
          <p className="mt-1 font-display text-4xl font-semibold text-foil tabular">{formatUsd(balance)}</p>
          {held > 0 && <p className="mt-1 text-sm text-muted tabular">{formatUsd(held)} held for withdrawal</p>}
          <p className="mt-6 mb-3 text-sm font-semibold">Add demo funds</p>
          <div className="grid grid-cols-2 gap-2">
            {economy.topUpAmounts.map((amount) => (
              <Button key={amount} variant="secondary" onClick={() => deposit(amount)}>
                <span className="font-display tabular">+{formatUsd(amount)}</span>
              </Button>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            No payment is taken. In production this panel hosts card and crypto deposits through the chosen payment provider, plus
            deposit limits and cool-off tools.
          </p>
        </div>

        <WithdrawPanel />

        <Button variant="ghost" size="sm" className="justify-self-start" onClick={reset}>
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
                  <p className="truncate text-sm font-semibold">
                    {t.label}
                    {t.status === "pending" && (
                      <span className="ml-2 rounded-pill border border-accent/50 px-2 py-px align-middle text-[11px] font-semibold text-accent">Pending</span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(t.at).toLocaleString("en-US")}
                    {t.status === "pending" && t.type === "withdrawal" && (
                      <>
                        {" · "}
                        <button type="button" onClick={() => cancelWithdrawal(t.id)} className="font-semibold text-accent underline-offset-4 hover:underline">
                          Cancel request
                        </button>
                      </>
                    )}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 font-display text-sm font-semibold tabular",
                    t.status === "cancelled" ? "text-subtle line-through" : t.amount > 0 ? "text-success" : t.amount < 0 ? "text-fg" : "text-subtle",
                  )}
                >
                  {t.amount > 0 ? "+" : t.amount < 0 ? "−" : ""}
                  {t.amount === 0 ? "—" : formatUsd(Math.abs(t.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
        <CreditHistory />
      </div>
    </div>
  );
}

/** Placeholder payout flow: the request waits as "pending" until staff settle it in the back office. */
function WithdrawPanel() {
  const id = useId();
  const balance = useSession((s) => s.balance);
  const requestWithdrawal = useSession((s) => s.requestWithdrawal);
  const [dollars, setDollars] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const cents = Math.round(Number(dollars.replace(/[$,\s]/g, "")) * 100);
    if (!Number.isFinite(cents) || cents <= 0) return setNotice({ tone: "error", text: "Enter an amount in dollars, like 250." });
    const res = await requestWithdrawal(cents);
    if (!res.ok) {
      return setNotice({
        tone: "error",
        text:
          res.reason === "below_minimum"
            ? `The smallest withdrawal is ${formatUsd(economy.minWithdrawal)}.`
            : res.reason === "insufficient_funds"
              ? `You can withdraw up to ${formatUsd(balance)}.`
              : "The withdrawal didn't go through. Try again in a moment.",
      });
    }
    setDollars("");
    setNotice({ tone: "ok", text: `Withdrawal of ${formatUsd(cents)} requested. It's held until our team pays it out.` });
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-card bg-surface p-6 ring-1 ring-line">
      <label htmlFor={id} className="text-sm font-semibold">
        Withdraw
      </label>
      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-semibold text-muted">$</span>
          <input
            id={id}
            inputMode="decimal"
            value={dollars}
            onChange={(e) => {
              setDollars(e.target.value);
              setNotice(null);
            }}
            placeholder="250"
            className="h-11 w-full rounded-pill border border-line bg-bg pr-4 pl-8 text-[15px] font-semibold tabular placeholder:font-normal placeholder:text-subtle focus:border-accent focus:outline-none"
          />
        </div>
        <Button type="submit" variant="secondary">
          Request
        </Button>
      </div>
      <p role="status" className={cn("mt-2 min-h-5 text-sm font-medium", notice?.tone === "error" ? "text-danger" : "text-success")}>
        {notice?.text}
      </p>
      <p className="text-xs leading-relaxed text-muted">
        Placeholder: payouts will need identity verification and go through the payment provider. For now the request waits
        until staff mark it paid in the back office.
      </p>
    </form>
  );
}
