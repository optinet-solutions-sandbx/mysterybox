"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { economy } from "@/config/economy";
import { randomHex, sha256Hex } from "@/domain/fair";
import { sellBackValue } from "@/domain/odds";
import type { Box, Cents, InventoryItem, ResolvedEntry, Transaction, TransactionType } from "@/domain/types";
import { getItem } from "@/services/catalog";
import { drawFromBox, type Seeds } from "@/services/play";

/**
 * Mock player session, persisted to localStorage. Stands in for the platform's
 * wallet / inventory / fairness APIs; components only talk to these actions.
 */

export type OpenOutcome =
  | { ok: true; inventoryItem: InventoryItem; entry: ResolvedEntry }
  | { ok: false; reason: "insufficient_funds" | "not_ready" };

interface SessionState {
  balance: Cents;
  inventory: InventoryItem[];
  transactions: Transaction[];
  seeds: Seeds | null;
  /** Seeds retired by rotation, newest first; their server seed is now public. */
  revealedSeeds: Seeds[];
  ageConfirmed: boolean;

  deposit(amount: Cents): void;
  openBox(box: Box): Promise<OpenOutcome>;
  sellBack(uids: string[]): Cents;
  requestShipping(uid: string): void;
  cancelShipping(uid: string): void;
  setClientSeed(clientSeed: string): void;
  rotateSeeds(): Promise<void>;
  ensureSeeds(): Promise<void>;
  confirmAge(): void;
  reset(): void;
}

const MAX_TRANSACTIONS = 200;

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
        set((s) => ({
          balance: s.balance + amount,
          transactions: [tx("deposit", amount, "Demo top-up"), ...s.transactions].slice(0, MAX_TRANSACTIONS),
        }));
      },

      async openBox(box) {
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

      sellBack(uids) {
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
        const inv = get().inventory.find((i) => i.uid === uid);
        if (!inv || inv.status !== "held") return;
        set((s) => ({
          inventory: s.inventory.map((i) => (i.uid === uid ? { ...i, status: "shipping_pending" } : i)),
          transactions: [tx("shipping_request", 0, `Shipping requested: ${getItem(inv.itemId).name}`), ...s.transactions].slice(0, MAX_TRANSACTIONS),
        }));
      },

      cancelShipping(uid) {
        // Only while pending — once operations pick it up it goes through support (per vendor demo).
        const inv = get().inventory.find((i) => i.uid === uid);
        if (!inv || inv.status !== "shipping_pending") return;
        set((s) => ({
          inventory: s.inventory.map((i) => (i.uid === uid ? { ...i, status: "held" } : i)),
          transactions: [tx("shipping_cancel", 0, `Shipping cancelled: ${getItem(inv.itemId).name}`), ...s.transactions].slice(0, MAX_TRANSACTIONS),
        }));
      },

      setClientSeed(clientSeed) {
        const seeds = get().seeds;
        if (!seeds || !clientSeed.trim()) return;
        set({ seeds: { ...seeds, clientSeed: clientSeed.trim() } });
      },

      async rotateSeeds() {
        const current = get().seeds;
        const next = await freshSeeds(current?.clientSeed);
        set((s) => ({
          seeds: next,
          revealedSeeds: current ? [current, ...s.revealedSeeds].slice(0, 10) : s.revealedSeeds,
        }));
      },

      async ensureSeeds() {
        if (!get().seeds) set({ seeds: await freshSeeds() });
      },

      confirmAge() {
        set({ ageConfirmed: true });
      },

      reset() {
        set({ ...initial, ageConfirmed: get().ageConfirmed });
        void get().ensureSeeds();
      },
    }),
    {
      name: "mock-session",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Rehydrated explicitly by <SessionHydrator /> so server and first client render match.
      skipHydration: true,
      partialize: ({ balance, inventory, transactions, seeds, revealedSeeds, ageConfirmed }) => ({
        balance,
        inventory,
        transactions,
        seeds,
        revealedSeeds,
        ageConfirmed,
      }),
    },
  ),
);

/** False on the server and until localStorage has been read; gate balance/inventory UI on it. */
export function useSessionHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useSession.persist.onFinishHydration(onChange),
    () => useSession.persist.hasHydrated(),
    () => false,
  );
}
