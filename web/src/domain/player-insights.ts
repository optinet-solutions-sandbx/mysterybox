import type { Cents } from "./types";
import { dayOf, type PlayerRecord } from "./analytics";

/**
 * Player-page numbers modelled on the reference casino back office (docs/09-backoffice-reference.md),
 * translated to mystery boxes: "spent in casino" is spent on boxes, "casino profit" is house
 * profit on listed value, "avg bet" is the average box price. Pure; the same rules belong in SQL
 * once Supabase is wired.
 */

const DAY_MS = 86_400_000;

/** Stable 6-digit player number for display and URLs (Supabase: profiles.player_number). */
export function playerNumber(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 100_000 + ((h >>> 0) % 900_000);
}

/** The number staff see and search by: the database's, or a stable one derived from the id (mock). */
export function numberOf(p: { id: string; number?: number }): number {
  return p.number ?? playerNumber(p.id);
}

/** "pat.doe@gmail.com" → "p******@g****.c**", like the reference page title. */
export function maskEmail(email: string): string {
  const [local, domain = ""] = email.split("@");
  const dot = domain.lastIndexOf(".");
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot + 1) : "";
  const mask = (s: string) => (s ? s[0] + "*".repeat(Math.max(1, s.length - 1)) : "");
  return `${mask(local)}@${mask(host)}${tld ? `.${mask(tld)}` : ""}`;
}

export interface AccountSummary {
  balance: Cents;
  depositsSum: Cents;
  cashoutsSum: Cents;
  pendingCashoutsSum: Cents;
  /** Placeholders until the payment provider reports them. */
  chargebacksSum: Cents;
  unreceivedDepositsSum: Cents;
  refundsSum: Cents;
  reversalsSum: Cents;
  affiliatePaymentsSum: Cents;
  depositReversalsSum: Cents;
  avgBoxPrice: Cents;
  giftsSum: Cents;
  spentOnBoxes: Cents;
  earned: Cents;
  houseProfit: Cents;
  soldBackSum: Cents;
  bonusesSum: Cents;
  /** Bonuses ÷ deposits (0 when nothing was deposited). */
  bonusRatio: number;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function accountSummary(p: PlayerRecord): AccountSummary {
  const by = (type: string, status: string) => p.money.filter((m) => m.type === type && m.status === status);
  const spent = sum(p.plays.map((o) => o.priceCents));
  const earned = sum(p.plays.map((o) => o.valueCents));
  const deposits = sum(by("deposit", "completed").map((m) => m.amountCents));
  const bonuses = 0;
  return {
    balance: p.balanceCents,
    depositsSum: deposits,
    cashoutsSum: 0 - sum(by("withdrawal", "completed").map((m) => m.amountCents)),
    pendingCashoutsSum: 0 - sum(by("withdrawal", "pending").map((m) => m.amountCents)),
    chargebacksSum: 0,
    unreceivedDepositsSum: sum(by("deposit", "pending").map((m) => m.amountCents)),
    refundsSum: 0,
    reversalsSum: 0,
    affiliatePaymentsSum: 0,
    depositReversalsSum: 0,
    avgBoxPrice: p.plays.length ? Math.round(spent / p.plays.length) : 0,
    giftsSum: sum(by("adjustment", "completed").map((m) => Math.max(0, m.amountCents))),
    spentOnBoxes: spent,
    earned,
    houseProfit: spent - earned,
    soldBackSum: sum(by("sell_back", "completed").map((m) => m.amountCents)),
    bonusesSum: bonuses,
    bonusRatio: deposits > 0 ? bonuses / deposits : 0,
  };
}

/**
 * Loyalty points (the reference's "comp point account"). PLACEHOLDER rule until Rewards is
 * designed: 1 point per $1 spent on boxes, tracked in micropoints (1 point = 1,000,000).
 * Status points never go down; redeemable points are spent on rewards (nothing redeems yet).
 */
export function loyaltyPoints(p: PlayerRecord): { status: number; redeemable: number } {
  const micro = sum(p.plays.map((o) => o.priceCents)) * 10_000;
  return { status: micro, redeemable: micro };
}

export interface Tag {
  label: string;
  tone: "info" | "good" | "warn" | "neutral";
}

/** Tags the system sets from behaviour (staff add their own on top). */
export function autoTags(p: PlayerRecord, now: number): Tag[] {
  const s = accountSummary(p);
  const tags: Tag[] = [];
  if (s.depositsSum > 0 && s.cashoutsSum + s.pendingCashoutsSum >= s.depositsSum * 0.8) tags.push({ label: "HighWDRatio", tone: "warn" });
  if (p.plays.length >= 10 && s.earned >= s.spentOnBoxes * 1.2) tags.push({ label: "HighReturn", tone: "warn" });
  if (p.state) tags.push({ label: `Locale US-${p.state}`, tone: "neutral" });
  if (now - Date.parse(p.registeredAt) < 7 * DAY_MS) tags.push({ label: "New", tone: "info" });
  if (p.kycStatus === "verified") tags.push({ label: "verified", tone: "good" });
  return tags;
}

export interface Segment {
  id: string;
  label: string;
  description: string;
  test: (p: PlayerRecord, now: number) => boolean;
}

const depositCount = (p: PlayerRecord) => p.money.filter((m) => m.type === "deposit" && m.status === "completed").length;
const within = (iso: string | undefined, now: number, days: number) => !!iso && now - Date.parse(iso) < days * DAY_MS;

/** Player groups (the reference's "Groups"): rule-based segments for CRM, bonuses and risk. */
export const SEGMENTS: Segment[] = [
  { id: "reload", label: "Reload players (4+ deposits)", description: "Deposited at least four times.", test: (p) => depositCount(p) >= 4 },
  { id: "depositors", label: "Min 1 deposit", description: "Deposited at least once.", test: (p) => depositCount(p) >= 1 },
  {
    id: "deposit-7d",
    label: "Deposit in last 7 days",
    description: "A completed deposit in the past week.",
    test: (p, now) => p.money.some((m) => m.type === "deposit" && m.status === "completed" && within(m.at, now, 7)),
  },
  { id: "active-7d", label: "Opened a box in last 7 days", description: "At least one opening in the past week.", test: (p, now) => within(p.plays.at(-1)?.at, now, 7) },
  {
    id: "dormant",
    label: "Dormant (30+ days)",
    description: "Has played, but not in the last 30 days.",
    test: (p, now) => p.plays.length > 0 && !within(p.plays.at(-1)?.at, now, 30),
  },
  { id: "never-played", label: "Registered, never played", description: "No openings yet.", test: (p) => p.plays.length === 0 },
  { id: "regular", label: "10+ openings", description: "Opened ten boxes or more.", test: (p) => p.plays.length >= 10 },
  {
    id: "high-roller",
    label: "High rollers ($5,000+ spent)",
    description: "Spent $5,000 or more on boxes.",
    test: (p) => accountSummary(p).spentOnBoxes >= 500_000,
  },
  {
    id: "big-pull",
    label: "Big pull (10× the box)",
    description: "Pulled a piece worth ten times the box price or more.",
    test: (p) => p.plays.some((o) => o.valueCents >= o.priceCents * 10),
  },
  {
    id: "sellers",
    label: "Trades in (5+ pieces)",
    description: "Sold pieces back five times or more.",
    test: (p) => p.money.filter((m) => m.type === "sell_back" && m.status === "completed").length >= 5,
  },
  {
    id: "pending-cashout",
    label: "Withdrawal pending",
    description: "Has a withdrawal waiting to be paid.",
    test: (p) => p.money.some((m) => m.type === "withdrawal" && m.status === "pending"),
  },
  { id: "marketing", label: "Receives marketing", description: "Opted in to drops, free boxes and results.", test: (p) => p.marketingOptIn },
  { id: "today", label: "Today's registrations", description: "Signed up today (UTC).", test: (p, now) => dayOf(p.registeredAt) === new Date(now).toISOString().slice(0, 10) },
  { id: "new-7d", label: "Registered in last 7 days", description: "Signed up in the past week.", test: (p, now) => within(p.registeredAt, now, 7) },
];

export function segmentsFor(p: PlayerRecord, now: number): Segment[] {
  return SEGMENTS.filter((s) => s.test(p, now));
}
