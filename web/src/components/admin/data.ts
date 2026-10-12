"use client";

import { useMemo, useSyncExternalStore } from "react";
import { create } from "zustand";
import { economy } from "@/config/economy";
import { buildDemoPlayers } from "@/data/demo-players";
import { boxes } from "@/data/boxes";
import { presetRange, type MoneyEvent, type PlayerRecord, type RangePreset } from "@/domain/analytics";
import { getBox, getItem } from "@/services/catalog";
import { useAuth, type Account } from "@/store/auth";
import { useBackoffice } from "@/store/backoffice";
import { useLedgers } from "@/store/ledgers";
import { freshSnapshot, type SessionSnapshot } from "@/store/session";

const noSubscribe = () => () => {};

/** Today's UTC date, client-only (null during SSR). The demo data is anchored to it. */
export function useToday(): string | null {
  return useSyncExternalStore(noSubscribe, () => new Date().toISOString().slice(0, 10), () => null);
}

/** The period picked in the back office, shared by every page. */
export const useRangePreset = create<{ preset: RangePreset; setPreset(p: RangePreset): void }>()((set) => ({
  preset: "30d",
  setPreset: (preset) => set({ preset }),
}));

/** An account registered in this browser, as the back office sees it. */
export function browserRecord(account: Account, snap: SessionSnapshot): PlayerRecord {
  const plays = [...snap.inventory]
    .sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt))
    .map((inv) => {
      const box = getBox(inv.boxId);
      const item = getItem(inv.itemId);
      return { at: inv.acquiredAt, boxId: inv.boxId, priceCents: box?.price ?? 0, itemId: inv.itemId, valueCents: item.value };
    });
  const money: MoneyEvent[] = snap.transactions
    .filter((t) => t.type === "deposit" || t.type === "withdrawal" || t.type === "sell_back")
    .map((t) => ({
      id: t.id,
      at: t.at,
      type: t.type as MoneyEvent["type"],
      amountCents: t.amount,
      status: t.status ?? "completed",
    }))
    .reverse();
  return {
    id: account.id,
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
    phoneDial: account.dial,
    phoneNumber: account.phone,
    state: null,
    status: account.status,
    kycStatus: "not_started",
    marketingOptIn: account.marketing,
    registeredAt: account.createdAt,
    lastSeenAt: account.lastSeenAt ?? null,
    balanceCents: snap.balance,
    heldCents: snap.held,
    plays,
    money,
    source: "browser",
  };
}

/**
 * Every player the back office knows about: accounts registered in this browser (real activity)
 * plus the generated demo players, with any status changes staff made.
 */
export function useBackofficeData() {
  const today = useToday();
  const accounts = useAuth((s) => s.accounts);
  const ledgers = useLedgers((s) => s.byEmail);
  const demoStatus = useBackoffice((s) => s.demoStatus);
  const preset = useRangePreset((s) => s.preset);

  const demo = useMemo(() => (today ? buildDemoPlayers({ today }) : []), [today]);

  const players = useMemo(() => {
    const browser = Object.values(accounts)
      .filter((a) => a.role === "player" && a.verified)
      .map((a) => browserRecord(a, ledgers[a.email] ?? freshSnapshot()));
    const generated = demo.map((p) => (demoStatus[p.id] ? { ...p, status: demoStatus[p.id] } : p));
    return [...browser, ...generated];
  }, [accounts, ledgers, demo, demoStatus]);

  const earliest = useMemo(() => players.reduce((min, p) => (p.registeredAt < min ? p.registeredAt : min), today ?? "9999").slice(0, 10), [players, today]);
  const range = today ? presetRange(preset, today, earliest) : null;

  return { today, players, range, preset, boxes, scale: economy.oddsScale };
}
