import { demoClock, economy, shipping } from "@/config/economy";
import type { Cents } from "./types";

/**
 * Two balances, as in the IcyBox app: Credit is money added (and rewards) and can only buy boxes;
 * Withdrawable comes from pieces sold back and can be cashed out or spent.
 */
export interface Balances {
  credit: Cents;
  withdrawable: Cents;
}

export function totalBalance(b: Balances): Cents {
  return b.credit + b.withdrawable;
}

export type ChargeResult =
  | { ok: true; balances: Balances; fromCredit: Cents; fromWithdrawable: Cents }
  | { ok: false; short: Cents };

/** Spends Credit first, then Withdrawable, so cash-out money is touched last. */
export function charge(b: Balances, amount: Cents): ChargeResult {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("charge: amount must be a positive integer");
  const total = totalBalance(b);
  if (amount > total) return { ok: false, short: amount - total };
  const fromCredit = Math.min(b.credit, amount);
  const fromWithdrawable = amount - fromCredit;
  return {
    ok: true,
    balances: { credit: b.credit - fromCredit, withdrawable: b.withdrawable - fromWithdrawable },
    fromCredit,
    fromWithdrawable,
  };
}

export interface ShippingQuote {
  pieces: number;
  base: Cents;
  extra: Cents;
  insurance: Cents;
  insuredPieces: number;
  total: Cents;
}

/** One fee per shipment plus a small fee per extra piece; insurance on pieces of $500 or more. */
export function shippingQuote(values: Cents[]): ShippingQuote {
  if (values.length === 0) throw new Error("shippingQuote: no pieces");
  const insured = values.filter((v) => v >= shipping.insuredFrom);
  const base = shipping.base;
  const extra = (values.length - 1) * shipping.extraPiece;
  const insurance = insured.reduce((sum, v) => sum + Math.ceil(v * shipping.insuranceRate), 0);
  return { pieces: values.length, base, extra, insurance, insuredPieces: insured.length, total: base + extra + insurance };
}

/** Why a cash-out can't go through, or null when it can. */
export function cashOutError(withdrawable: Cents, amount: Cents): string | null {
  if (!Number.isInteger(amount) || amount <= 0) return "Enter an amount.";
  if (amount < economy.minWithdrawal) return `The smallest cash-out is $${economy.minWithdrawal / 100}.`;
  if (amount > withdrawable) return "That's more than your withdrawable balance.";
  return null;
}

const DAY = 24 * 60 * 60 * 1000;

/** When a kept piece is sold back automatically. */
export function vaultDeadline(keptAt: string): number {
  return Date.parse(keptAt) + economy.vaultDays * DAY;
}

export function isVaultExpired(keptAt: string, now: number): boolean {
  return now >= vaultDeadline(keptAt);
}

/** "6d 23h", "4h 12m", "38s": the two largest units left. */
export function formatTimeLeft(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3_600);
  const m = Math.floor((s % 3_600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export type ShipmentStage = "preparing" | "shipped" | "delivered";

/** Stage on the prototype's fast clock (see demoClock). */
export function shipmentStage(requestedAt: string, now: number): ShipmentStage {
  const age = now - Date.parse(requestedAt);
  if (age >= demoClock.shipmentDeliveredAfterMs) return "delivered";
  if (age >= demoClock.shipmentShippedAfterMs) return "shipped";
  return "preparing";
}

export function payoutCompleted(requestedAt: string, now: number): boolean {
  return now - Date.parse(requestedAt) >= demoClock.payoutCompletesAfterMs;
}

export function pointsFor(spent: Cents): number {
  return Math.floor(spent / 100) * economy.pointsPerDollar;
}

/** Levels share the FLEXD box finishes' names, from Lilac to Gold. */
export const LEVELS = [
  { name: "Lilac", from: 0, perk: "Odds and value ranges on every box" },
  { name: "Amethyst", from: 500, perk: "Early access to limited drops" },
  { name: "Plum", from: 2_500, perk: "One free shipment a month" },
  { name: "Royal", from: 10_000, perk: "Free insured shipping on every piece" },
  { name: "Gold", from: 50_000, perk: "A personal concierge" },
] as const;

export type Level = (typeof LEVELS)[number];

export function levelFor(points: number): { level: Level; next: Level | null; progress: number } {
  let i = 0;
  while (i + 1 < LEVELS.length && points >= LEVELS[i + 1].from) i += 1;
  const level = LEVELS[i];
  const next = LEVELS[i + 1] ?? null;
  const progress = next ? (points - level.from) / (next.from - level.from) : 1;
  return { level, next, progress };
}
