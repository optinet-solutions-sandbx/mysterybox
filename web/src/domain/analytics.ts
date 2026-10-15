import type {
  AccountStatus,
  BoxPerformanceRow,
  DailyMetric,
  DateRange,
  Kpis,
  KycStatus,
  PlayerOverviewRow,
} from "@/backend/contract";
import type { Box, Cents } from "./types";

/**
 * Back-office numbers for the mock, computed from player activity with the SAME definitions as
 * the SQL (admin_player_overview, admin_kpis, admin_daily_metrics, admin_box_performance):
 *   played = box prices paid; earned = listed value of the pieces received;
 *   house net = played − earned; a player has "played" once they have an opening.
 * Days are UTC calendar days ("YYYY-MM-DD"); ranges are inclusive.
 */

export interface PlayEvent {
  at: string;
  boxId: string;
  priceCents: Cents;
  itemId: string;
  valueCents: Cents;
  /** How the box price was paid on the box system: the demo balance ("card") or site credit. */
  paidWith?: "card" | "credit";
}

export interface MoneyEvent {
  id: string;
  at: string;
  /** "sell_back" is a trade-in (code name kept from the SQL); on the box system it pays site credit, counted at $1 a credit. */
  type: "deposit" | "withdrawal" | "sell_back" | "adjustment";
  /** Signed like the ledger: + credits the wallet, − debits it. */
  amountCents: Cents;
  status: "pending" | "completed" | "cancelled";
}

export interface PlayerRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneDial: string | null;
  phoneNumber: string | null;
  state: string | null;
  status: AccountStatus;
  kycStatus: KycStatus;
  marketingOptIn: boolean;
  registeredAt: string;
  lastSeenAt: string | null;
  balanceCents: Cents;
  heldCents: Cents;
  /** Site credit on the box system ($1 a credit); undefined when it isn't visible from here. */
  creditBalance?: number;
  /** Chronological. */
  plays: PlayEvent[];
  money: MoneyEvent[];
  /** "live": from the database; "browser": registered in this browser (mock); "demo": generated sample data. */
  source: "live" | "browser" | "demo";
  /** Database player number (live); the mock derives one from the id. */
  number?: number;
}

const DAY_MS = 86_400_000;

export const dayOf = (iso: string) => iso.slice(0, 10);

export function inRange(iso: string, range: DateRange): boolean {
  const d = dayOf(iso);
  return d >= range.from && d <= range.to;
}

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

export function daysIn(range: DateRange): string[] {
  const out: string[] = [];
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) out.push(d);
  return out;
}

export type RangePreset = "7d" | "30d" | "90d" | "all";

export function presetRange(preset: RangePreset, today: string, earliest: string): DateRange {
  if (preset === "all") return { from: earliest < today ? earliest : today, to: today };
  const days = { "7d": 7, "30d": 30, "90d": 90 }[preset];
  return { from: addDays(today, -(days - 1)), to: today };
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const completed = (p: PlayerRecord, type: MoneyEvent["type"], range?: DateRange) =>
  p.money.filter((m) => m.type === type && m.status === "completed" && (!range || inRange(m.at, range)));

export function overviewRow(p: PlayerRecord): PlayerOverviewRow {
  const played = sum(p.plays.map((o) => o.priceCents));
  const earned = sum(p.plays.map((o) => o.valueCents));
  return {
    id: p.id,
    email: p.email,
    firstName: p.firstName,
    lastName: p.lastName,
    phoneDial: p.phoneDial,
    phoneNumber: p.phoneNumber,
    state: p.state,
    status: p.status,
    kycStatus: p.kycStatus,
    marketingOptIn: p.marketingOptIn,
    registeredAt: p.registeredAt,
    lastSeenAt: p.lastSeenAt,
    openings: p.plays.length,
    playedCents: played,
    earnedCents: earned,
    houseNetCents: played - earned,
    firstPlayedAt: p.plays[0]?.at ?? null,
    lastPlayedAt: p.plays.at(-1)?.at ?? null,
    soldBackCents: sum(completed(p, "sell_back").map((m) => m.amountCents)),
    depositsCents: sum(completed(p, "deposit").map((m) => m.amountCents)),
    withdrawalsCents: 0 - sum(completed(p, "withdrawal").map((m) => m.amountCents)), // 0 - x: never "-$0"
    balanceCents: p.balanceCents,
  };
}

export function kpis(players: PlayerRecord[], range: DateRange): Kpis {
  const plays = players.flatMap((p) => p.plays.filter((o) => inRange(o.at, range)));
  const played = sum(plays.map((o) => o.priceCents));
  const earned = sum(plays.map((o) => o.valueCents));
  return {
    registeredTotal: players.length,
    registeredInRange: players.filter((p) => inRange(p.registeredAt, range)).length,
    playersPlayedEver: players.filter((p) => p.plays.length > 0).length,
    playersPlayedInRange: players.filter((p) => p.plays.some((o) => inRange(o.at, range))).length,
    openings: plays.length,
    playedCents: played,
    earnedCents: earned,
    houseNetCents: played - earned,
    depositsCents: sum(players.flatMap((p) => completed(p, "deposit", range).map((m) => m.amountCents))),
    withdrawalsCents: 0 - sum(players.flatMap((p) => completed(p, "withdrawal", range).map((m) => m.amountCents))),
    soldBackCents: sum(players.flatMap((p) => completed(p, "sell_back", range).map((m) => m.amountCents))),
    pendingWithdrawals: players.flatMap((p) => p.money.filter((m) => m.type === "withdrawal" && m.status === "pending")).length,
  };
}

export function dailyMetrics(players: PlayerRecord[], range: DateRange): DailyMetric[] {
  const rows = new Map(
    daysIn(range).map((day) => [
      day,
      { day, registrations: 0, playersPlayed: 0, firstTimePlayers: 0, openings: 0, playedCents: 0, earnedCents: 0, depositsCents: 0, withdrawalsCents: 0 },
    ]),
  );
  for (const p of players) {
    const reg = rows.get(dayOf(p.registeredAt));
    if (reg) reg.registrations++;
    if (p.plays[0]) {
      const first = rows.get(dayOf(p.plays[0].at));
      if (first) first.firstTimePlayers++;
    }
    const playedDays = new Set<string>();
    for (const o of p.plays) {
      const row = rows.get(dayOf(o.at));
      if (!row) continue;
      row.openings++;
      row.playedCents += o.priceCents;
      row.earnedCents += o.valueCents;
      playedDays.add(row.day);
    }
    for (const d of playedDays) rows.get(d)!.playersPlayed++;
    for (const m of p.money) {
      const row = rows.get(dayOf(m.at));
      if (!row || m.status !== "completed") continue;
      if (m.type === "deposit") row.depositsCents += m.amountCents;
      if (m.type === "withdrawal") row.withdrawalsCents -= m.amountCents;
    }
  }
  return [...rows.values()];
}

/**
 * Configured return next to what players actually received. The configured return comes from the
 * same per-open maths the site shows and the draw uses (free spins at their table's average).
 */
export function boxPerformance(players: PlayerRecord[], range: DateRange, boxes: Box[], configuredReturn: (box: Box) => number): BoxPerformanceRow[] {
  return boxes.map((b) => {
    const plays = players.flatMap((p) => p.plays.filter((o) => o.boxId === b.id && inRange(o.at, range)));
    const played = sum(plays.map((o) => o.priceCents));
    const earned = sum(plays.map((o) => o.valueCents));
    return {
      boxId: b.id,
      name: b.name,
      status: "live",
      priceCents: b.price,
      expectedRtp: configuredReturn(b),
      openings: plays.length,
      playedCents: played,
      earnedCents: earned,
      actualRtp: played > 0 ? earned / played : null,
    };
  });
}
