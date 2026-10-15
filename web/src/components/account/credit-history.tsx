"use client";

import { useEffect, useState } from "react";
import { boxApi, type Credits, type LedgerReason } from "@/box-api";
import { formatCredit } from "@/domain/money";
import { useSession } from "@/store/session";
import { cn } from "@/lib/cn";

export const creditLabel: Record<LedgerReason, string> = {
  "box-award": "Credit from an open",
  "bonus-award": "Bonus open",
  "trade-in": "Traded in a piece",
  "box-payment": "Paid for a box",
};

/**
 * Site credit from the box system's API (myCredits): the balance and every movement, newest first.
 * The mock keeps its ledger in this browser, so the list re-reads when that ledger grows.
 */
export function CreditHistory() {
  const version = useSession((s) => s.boxApi.ledger.length);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    boxApi.myCredits().then(
      (c) => live && setCredits(c),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [version]);

  return (
    <section aria-labelledby="credit-history" className="mt-10">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 id="credit-history" className="text-lg font-semibold">
          Site credit
        </h2>
        {credits && <p className="font-display text-xl font-semibold text-foil tabular">{formatCredit(credits.balance)}</p>}
      </div>
      <p className="mb-4 text-sm text-muted">Site credit buys boxes and can&rsquo;t be withdrawn. It counts as $1 a credit.</p>
      {failed ? (
        <p className="rounded-card bg-surface px-6 py-10 text-center text-muted ring-1 ring-line">Site credit couldn&rsquo;t be loaded. Try again shortly.</p>
      ) : !credits ? (
        <div className="h-24 animate-pulse rounded-card bg-surface" />
      ) : credits.ledger.length === 0 ? (
        <p className="rounded-card bg-surface px-6 py-10 text-center text-muted ring-1 ring-line">No site credit yet.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface ring-1 ring-line">
          {credits.ledger.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{creditLabel[e.reason]}</p>
                <p className="text-xs text-muted">{new Date(e.createdAt).toLocaleString("en-US")}</p>
              </div>
              <span className={cn("shrink-0 font-display text-sm font-semibold tabular", e.delta > 0 ? "text-success" : "text-fg")}>
                {e.delta > 0 ? "+" : "−"}
                {formatCredit(Math.abs(e.delta))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
