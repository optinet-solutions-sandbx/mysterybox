"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { freshSnapshot, type SessionSnapshot } from "./session";

/**
 * Every browser account's wallet, inventory and history, keyed by email. `useSession` is the
 * signed-in account's working copy; <AccountSessionSync /> swaps it on sign-in/out and mirrors it
 * back here, so the back office can read every account created in this browser.
 * (Supabase replaces this with per-user rows: wallets, transactions, inventory_items.)
 */
interface LedgersState {
  byEmail: Record<string, SessionSnapshot>;
  save(email: string, snapshot: SessionSnapshot): void;
  remove(emails: string[]): void;
  /** Back office: settle a pending withdrawal on an account that isn't signed in. */
  settleWithdrawal(email: string, transactionId: string, outcome: "completed" | "cancelled"): boolean;
}

export const useLedgers = create<LedgersState>()(
  persist(
    (set, get) => ({
      byEmail: {},
      save(email, snapshot) {
        set((s) => ({ byEmail: { ...s.byEmail, [email]: snapshot } }));
      },
      remove(emails) {
        const drop = new Set(emails);
        set((s) => ({ byEmail: Object.fromEntries(Object.entries(s.byEmail).filter(([email]) => !drop.has(email))) }));
      },
      settleWithdrawal(email, transactionId, outcome) {
        const snap = get().byEmail[email];
        const t = snap?.transactions.find((x) => x.id === transactionId && x.type === "withdrawal" && x.status === "pending");
        if (!snap || !t) return false;
        const amount = -t.amount;
        const next: SessionSnapshot = {
          ...snap,
          held: snap.held - amount,
          balance: outcome === "cancelled" ? snap.balance + amount : snap.balance,
          transactions: snap.transactions.map((x) =>
            x.id === transactionId
              ? { ...x, status: outcome, label: outcome === "completed" ? "Withdrawal paid" : "Withdrawal cancelled" }
              : x,
          ),
        };
        set((s) => ({ byEmail: { ...s.byEmail, [email]: next } }));
        return true;
      },
    }),
    {
      name: "grailnoir-ledgers",
      version: 2,
      // v2 added the box API's per-account tables; older snapshots get empty ones.
      migrate: (persisted) => {
        const byEmail = (persisted as { byEmail?: Record<string, Partial<SessionSnapshot>> }).byEmail ?? {};
        return { byEmail: Object.fromEntries(Object.entries(byEmail).map(([email, snap]) => [email, { ...freshSnapshot(), ...snap }])) } as LedgersState;
      },
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
