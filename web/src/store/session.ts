"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { economy } from "@/config/economy";
import { randomHex, sha256Hex } from "@/domain/fair";
import { sellBackValue } from "@/domain/odds";
import type { Box, Cents, InventoryItem, ResolvedEntry, Transaction, TransactionType } from "@/domain/types";
import { isSupabase } from "@/backend/config";
import { BackendError } from "@/backend/contract";
import { loadMe, remotePlayer, seedsFromRpc } from "@/backend/remote-player";
import { activeCatalog, getItem } from "@/services/catalog";
import { drawFromBox, type Seeds } from "@/services/play";

/**
 * Mock player session, persisted to localStorage. Stands in for the platform's
 * wallet / inventory / fairness APIs; components only talk to these actions.
 */

export type WithdrawalOutcome = { ok: true } | { ok: false; reason: "insufficient_funds" | "below_minimum" | "error" };

export type OpenOutcome =
  | { ok: true; inventoryItem: InventoryItem; entry: ResolvedEntry }
  | { ok: false; reason: "insufficient_funds" | "not_ready" };

interface SessionState {
  balance: Cents;
  /** Reserved by pending withdrawals (moved out of balance until settled). */
  held: Cents;
  inventory: InventoryItem[];
  transactions: Transaction[];
  seeds: Seeds | null;
  /** Seeds retired by rotation, newest first; their server seed is now public. */
  revealedSeeds: Seeds[];
  ageConfirmed: boolean;

  deposit(amount: Cents): void;
  /** Placeholder for payouts: reserves the amount as a pending withdrawal until the back office settles it. */
  requestWithdrawal(amount: Cents): Promise<WithdrawalOutcome>;
  cancelWithdrawal(id: string): void;
  openBox(box: Box): Promise<OpenOutcome>;
  sellBack(uids: string[]): Promise<Cents>;
  requestShipping(uid: string): void;
  cancelShipping(uid: string): void;
  setClientSeed(clientSeed: string): void;
  rotateSeeds(): Promise<void>;
  ensureSeeds(): Promise<void>;
  confirmAge(): void;
  reset(): void;
}

const MAX_TRANSACTIONS = 200;

/** Supabase mode: re-reads the signed-in player's wallet, inventory, ledger and seeds. */
export async function refreshRemote() {
  const me = await loadMe();
  if (me) useSession.setState(me.snapshot);
}

const report = (e: unknown) => console.error("[backend]", e);

function tx(type: TransactionType, amount: Cents, label: string): Transaction {
  return { id: crypto.randomUUID(), type, amount, label, at: new Date().toISOString() };
}

async function freshSeeds(clientSeed?: string): Promise<Seeds> {
  const serverSeed = randomHex(32);
  return {
    serverSeed,
    serverSeedHash: await sha256Hex(serverSeed),
    clientSeed: clientSeed ?? randomHex(8),
    nonce: 0,
  };
}

const initial = {
  balance: economy.startingBalance,
  held: 0,
  inventory: [] as InventoryItem[],
  transactions: [] as Transaction[],
  seeds: null as Seeds | null,
  revealedSeeds: [] as Seeds[],
  ageConfirmed: false,
};

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      ...initial,

      deposit(amount) {
        if (isSupabase) {
          void remotePlayer.deposit(amount).then(refreshRemote).catch(report);
          return;
        }
        set((s) => ({
          balance: s.balance + amount,
          transactions: [tx("deposit", amount, "Demo top-up"), ...s.transactions].slice(0, MAX_TRANSACTIONS),
        }));
      },

      async requestWithdrawal(amount) {
        if (isSupabase) {
          try {
            await remotePlayer.requestWithdrawal(amount);
            await refreshRemote();
            return { ok: true };
          } catch (e) {
            const code = e instanceof BackendError ? e.code : "unknown";
            if (code === "amount_below_minimum") return { ok: false, reason: "below_minimum" };
            if (code === "insufficient_funds") return { ok: false, reason: "insufficient_funds" };
            report(e);
            return { ok: false, reason: "error" };
          }
        }
        const { balance } = get();
        if (amount < economy.minWithdrawal) return { ok: false, reason: "below_minimum" };
        if (amount > balance) return { ok: false, reason: "insufficient_funds" };
        set((s) => ({
          balance: s.balance - amount,
          held: s.held + amount,
          transactions: [{ ...tx("withdrawal", -amount, "Withdrawal requested"), status: "pending" as const }, ...s.transactions].slice(
            0,
            MAX_TRANSACTIONS,
          ),
        }));
        return { ok: true };
      },

      cancelWithdrawal(id) {
        if (isSupabase) {
          void remotePlayer.cancelWithdrawal(id).then(refreshRemote).catch(report);
          return;
        }
        const t = get().transactions.find((x) => x.id === id && x.type === "withdrawal" && x.status === "pending");
        if (!t) return;
        set((s) => ({
          balance: s.balance - t.amount,
          held: s.held + t.amount,
          transactions: s.transactions.map((x) => (x.id === id ? { ...x, status: "cancelled" as const, label: "Withdrawal cancelled" } : x)),
        }));
      },

      async openBox(box) {
        if (isSupabase) {
          try {
            const r = await remotePlayer.openBox(box);
            const itemId = String(r.item_id);
            const entry = activeCatalog().resolveEntries(box).find((e) => e.item.id === itemId);
            if (!entry) throw new Error("The drawn item is not in the loaded catalog: " + itemId);
            const inventoryItem: InventoryItem = {
              uid: String(r.inventory_item_id),
              itemId,
              boxId: box.id,
              acquiredAt: new Date().toISOString(),
              status: "held",
              draw: { serverSeedHash: String(r.server_seed_hash), clientSeed: String(r.client_seed), nonce: Number(r.nonce), roll: Number(r.roll) },
            };
            set((s) => ({
              balance: Number(r.balance_cents),
              inventory: [inventoryItem, ...s.inventory],
              seeds: s.seeds ? { ...s.seeds, nonce: Number(r.nonce) + 1 } : s.seeds,
            }));
            void refreshRemote().catch(report);
            return { ok: true, inventoryItem, entry };
          } catch (e) {
            if (e instanceof BackendError && e.code === "insufficient_funds") return { ok: false, reason: "insufficient_funds" };
            report(e);
            return { ok: false, reason: "not_ready" };
          }
        }
        const { balance, seeds } = get();
        if (!seeds) return { ok: false, reason: "not_ready" };
        if (balance < box.price) return { ok: false, reason: "insufficient_funds" };

        // Charge and reserve the nonce synchronously so rapid clicks never reuse one.
        set({ balance: balance - box.price, seeds: { ...seeds, nonce: seeds.nonce + 1 } });
        const { entry, draw } = await drawFromBox(box, seeds);

        const inventoryItem: InventoryItem = {
          uid: crypto.randomUUID(),
          itemId: entry.item.id,
          boxId: box.id,
          acquiredAt: new Date().toISOString(),
          status: "held",
          draw,
        };
        set((s) => ({
          inventory: [inventoryItem, ...s.inventory],
          transactions: [tx("box_open", -box.price, `Opened ${box.name}`), ...s.transactions].slice(0, MAX_TRANSACTIONS),
        }));
        return { ok: true, inventoryItem, entry };
      },

      async sellBack(uids) {
        if (isSupabase) {
          const r = await remotePlayer.sellBack(uids);
          await refreshRemote();
          return Number(r.credited_cents);
        }
        const wanted = new Set(uids);
        let credited = 0;
        const sold: string[] = [];
        const inventory = get().inventory.map((inv) => {
          if (!wanted.has(inv.uid) || inv.status !== "held") return inv;
          const item = getItem(inv.itemId);
          credited += sellBackValue(item.value);
          sold.push(item.name);
          return { ...inv, status: "sold" as const };
        });
        if (sold.length === 0) return 0;
        const label = sold.length === 1 ? `Sold back ${sold[0]}` : `Sold back ${sold.length} items`;
        set((s) => ({
          inventory,
          balance: s.balance + credited,
          transactions: [tx("sell_back", credited, label), ...s.transactions].slice(0, MAX_TRANSACTIONS),
        }));
        return credited;
      },

      requestShipping(uid) {
        if (isSupabase) {
          void remotePlayer.requestShipping(uid).then(refreshRemote).catch(report);
          return;
        }
        const inv = get().inventory.find((i) => i.uid === uid);
        if (!inv || inv.status !== "held") return;
        set((s) => ({
          inventory: s.inventory.map((i) => (i.uid === uid ? { ...i, status: "shipping_pending" } : i)),
          transactions: [tx("shipping_request", 0, `Shipping requested: ${getItem(inv.itemId).name}`), ...s.transactions].slice(0, MAX_TRANSACTIONS),
        }));
      },

      cancelShipping(uid) {
        if (isSupabase) {
          void remotePlayer.cancelShipping(uid).then(refreshRemote).catch(report);
          return;
        }
        // Only while pending — once operations pick it up it goes through support (per vendor demo).
        const inv = get().inventory.find((i) => i.uid === uid);
        if (!inv || inv.status !== "shipping_pending") return;
        set((s) => ({
          inventory: s.inventory.map((i) => (i.uid === uid ? { ...i, status: "held" } : i)),
          transactions: [tx("shipping_cancel", 0, `Shipping cancelled: ${getItem(inv.itemId).name}`), ...s.transactions].slice(0, MAX_TRANSACTIONS),
        }));
      },

      setClientSeed(clientSeed) {
        if (isSupabase) {
          void remotePlayer.setClientSeed(clientSeed).then((r) => set(seedsFromRpc(r))).catch(report);
          return;
        }
        const seeds = get().seeds;
        if (!seeds || !clientSeed.trim()) return;
        set({ seeds: { ...seeds, clientSeed: clientSeed.trim() } });
      },

      async rotateSeeds() {
        if (isSupabase) {
          set(seedsFromRpc(await remotePlayer.rotateSeeds()));
          return;
        }
        const current = get().seeds;
        const next = await freshSeeds(current?.clientSeed);
        set((s) => ({
          seeds: next,
          revealedSeeds: current ? [current, ...s.revealedSeeds].slice(0, 10) : s.revealedSeeds,
        }));
      },

      async ensureSeeds() {
        // Supabase: the server commits seeds; they arrive with the player's data at sign-in.
        if (isSupabase) return;
        if (!get().seeds) set({ seeds: await freshSeeds() });
      },

      confirmAge() {
        set({ ageConfirmed: true });
      },

      reset() {
        if (isSupabase) return;
        set({ ...initial, ageConfirmed: get().ageConfirmed });
        void get().ensureSeeds();
      },
    }),
    {
      name: "mock-session",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // Rehydrated explicitly by <SessionHydrator /> so server and first client render match.
      skipHydration: true,
      migrate: (persisted) => ({ held: 0, ...(persisted as object) }),
      partialize: ({ balance, held, inventory, transactions, seeds, revealedSeeds, ageConfirmed }) => ({
        balance,
        held,
        inventory,
        transactions,
        seeds,
        revealedSeeds,
        ageConfirmed,
      }),
    },
  ),
);

/** The per-account part of the session (everything but the device's age confirmation). */
export type SessionSnapshot = Pick<SessionState, "balance" | "held" | "inventory" | "transactions" | "seeds" | "revealedSeeds">;

export function snapshotOf(s: SessionSnapshot): SessionSnapshot {
  return { balance: s.balance, held: s.held, inventory: s.inventory, transactions: s.transactions, seeds: s.seeds, revealedSeeds: s.revealedSeeds };
}

/** A new account's wallet: the demo starting balance and nothing else. */
export function freshSnapshot(): SessionSnapshot {
  return { balance: initial.balance, held: 0, inventory: [], transactions: [], seeds: null, revealedSeeds: [] };
}

/** False on the server and until localStorage has been read; gate balance/inventory UI on it. */
export function useSessionHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useSession.persist.onFinishHydration(onChange),
    () => useSession.persist.hasHydrated(),
    () => false,
  );
}
