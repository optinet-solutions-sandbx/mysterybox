"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { isSupabase } from "@/backend/config";
import { useRemoteBackoffice } from "@/backend/remote-admin";
import { create } from "zustand";
import { economy } from "@/config/economy";
import { buildDemoPlayers } from "@/data/demo-players";
import { presetRange, type MoneyEvent, type PlayerRecord, type RangePreset } from "@/domain/analytics";
import { useCatalog } from "@/components/catalog-provider";
import type { Catalog } from "@/services/catalog";
import { useAuth, type Account } from "@/store/auth";
import { useBackoffice } from "@/store/backoffice";
import { useLedgers } from "@/store/ledgers";
import { freshSnapshot, type SessionSnapshot } from "@/store/session";

const noSubscribe = () => () => {};

/** Sample players for demos. Off by default so testing starts from real accounts only. */
export const DEMO_PLAYERS_ENABLED = process.env.NEXT_PUBLIC_DEMO_PLAYERS === "on";

/** Today's UTC date, client-only (null during SSR). The demo data is anchored to it. */
export function useToday(): string | null {
  return useSyncExternalStore(noSubscribe, () => new Date().toISOString().slice(0, 10), () => null);
}

/** "Now" for rule-based groups and tags: fixed per minute so renders stay stable. Client-only (0 on the server). */
export function useNow(): number {
  return useSyncExternalStore(noSubscribe, () => Math.floor(Date.now() / 60_000) * 60_000, () => 0);
}

/** The period picked in the back office, shared by every page. */
export const useRangePreset = create<{ preset: RangePreset; setPreset(p: RangePreset): void }>()((set) => ({
  preset: "30d",
  setPreset: (preset) => set({ preset }),
}));

/** An account registered in this browser, as the back office sees it. */
export function browserRecord(account: Account, snap: SessionSnapshot, catalog: Catalog): PlayerRecord {
  const plays = [...snap.inventory]
    .sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt))
    .map((inv) => {
      const box = catalog.getBox(inv.boxId);
      const item = catalog.findItem(inv.itemId);
      return { at: inv.acquiredAt, boxId: inv.boxId, priceCents: box?.price ?? 0, itemId: inv.itemId, valueCents: item?.value ?? 0 };
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
  const catalog = useCatalog();
  const accounts = useAuth((s) => s.accounts);
  const ledgers = useLedgers((s) => s.byEmail);
  const demoStatus = useBackoffice((s) => s.demoStatus);
  const preset = useRangePreset((s) => s.preset);

  const demo = useMemo(() => (today && DEMO_PLAYERS_ENABLED ? buildDemoPlayers({ today }) : []), [today]);
  const remote = useRemoteBackoffice();
  useEffect(() => {
    if (isSupabase && !remote.loaded && !remote.loading && !remote.error) void remote.load();
  }, [remote]);

  const players = useMemo(() => {
    if (isSupabase) return remote.players;
    const browser = Object.values(accounts)
      .filter((a) => a.role === "player" && a.verified)
      .map((a) => browserRecord(a, ledgers[a.email] ?? freshSnapshot(), catalog));
    const generated = demo.map((p) => (demoStatus[p.id] ? { ...p, status: demoStatus[p.id] } : p));
    return [...browser, ...generated];
  }, [accounts, ledgers, demo, demoStatus, catalog, remote.players]);

  const earliest = useMemo(() => players.reduce((min, p) => (p.registeredAt < min ? p.registeredAt : min), today ?? "9999").slice(0, 10), [players, today]);
  // Supabase: hold the pages on their skeletons until the first load lands.
  const range = today && (!isSupabase || remote.loaded) ? presetRange(preset, today, earliest) : null;

  return { today, players, range, preset, boxes: catalog.boxes, scale: economy.oddsScale, loadError: remote.error };
}

/** Staff and promotable players: this browser's accounts (mock) or the database (Supabase). */
export function useStaffDirectory(): { staff: Account[]; players: Account[] } {
  const accounts = useAuth((s) => s.accounts);
  const remote = useRemoteBackoffice();
  useEffect(() => {
    if (isSupabase && !remote.loaded && !remote.loading && !remote.error) void remote.load();
  }, [remote]);
  return useMemo(() => {
    if (!isSupabase) {
      const all = Object.values(accounts).filter((a) => a.verified);
      return { staff: all.filter((a) => a.role !== "player"), players: all.filter((a) => a.role === "player") };
    }
    return {
      staff: remote.staff,
      players: remote.players.map(
        (p): Account => ({
          id: p.id,
          email: p.email,
          firstName: p.firstName,
          lastName: p.lastName,
          dial: p.phoneDial ?? "+1",
          phone: p.phoneNumber ?? "",
          passwordHash: "",
          salt: "",
          marketing: p.marketingOptIn,
          verified: true,
          createdAt: p.registeredAt,
          role: "player",
          status: p.status,
        }),
      ),
    };
  }, [accounts, remote.staff, remote.players]);
}
