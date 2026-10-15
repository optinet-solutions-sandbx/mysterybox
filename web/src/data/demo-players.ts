import { pickByRoll, tradeInCredits } from "@/domain/odds";
import type { MoneyEvent, PlayEvent, PlayerRecord } from "@/domain/analytics";
import type { AccountStatus, KycStatus } from "@/backend/contract";
import type { Box, Cents } from "@/domain/types";
import { economy } from "@/config/economy";
import { boxes } from "./boxes";
import { items } from "./items";

/**
 * Generated sample players so the back office has something to show before real traffic exists.
 * Deterministic for a given anchor day (same numbers for every reviewer that day). Draws use the
 * real box odds and prices, so returns land near the 90% target with realistic variance. Like the box
 * system: credit outcomes (and their bonus opens) and trade-ins pay site credit, which buys boxes first.
 * Emails use example.com and phone numbers the fictional 555-01xx range.
 */

const DAY_MS = 86_400_000;
const HISTORY_DAYS = 120;

const FIRST = [
  "Avery", "Jordan", "Taylor", "Morgan", "Riley", "Casey", "Jamie", "Quinn", "Harper", "Rowan",
  "Elena", "Marcus", "Priya", "Daniel", "Sofia", "Malik", "Hana", "Lucas", "Amara", "Noah",
  "Isabel", "Omar", "Grace", "Mateo", "Chloe", "Ethan", "Layla", "Julian", "Zoe", "Adrian",
  "Mei", "Gabriel", "Nora", "Theo", "Aaliyah", "Felix", "Camila", "Leo", "Ivy", "Kai",
];
const LAST = [
  "Bennett", "Reyes", "Okafor", "Laurent", "Chen", "Patel", "Nguyen", "Morales", "Kim", "Sullivan",
  "Hughes", "Brooks", "Delgado", "Foster", "Haddad", "Ito", "Jensen", "Kowalski", "Lindqvist", "Mensah",
  "Novak", "Ortiz", "Park", "Quintero", "Rossi", "Sato", "Tran", "Vargas", "Walsh", "Yilmaz",
  "Abbott", "Castillo", "Dubois", "Ellis", "Fischer", "Greene", "Hayes", "Ibarra", "Keller", "Moreau",
];
const STATES: [string, number][] = [
  ["CA", 14], ["NY", 10], ["TX", 10], ["FL", 9], ["IL", 5], ["NJ", 4], ["PA", 4], ["GA", 4], ["MA", 3], ["WA", 3],
  ["NV", 3], ["AZ", 3], ["OH", 3], ["NC", 3], ["CO", 2], ["VA", 2], ["MI", 2], ["MD", 2], ["TN", 2], ["OR", 1],
];
const AREA_CODES = ["212", "310", "415", "305", "312", "617", "702", "214", "404", "206"];
const DEPOSIT_STEPS: Cents[] = [2_500, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];

/** Player profiles: share of players, box preference (by price rank) and mean openings. */
const TIERS = [
  { share: 0.7, mean: 6, boxWeights: [55, 28, 17, 0, 0, 0, 0, 0] },
  { share: 0.22, mean: 10, boxWeights: [20, 18, 22, 14, 12, 8, 6, 0] },
  { share: 0.08, mean: 14, boxWeights: [5, 5, 10, 15, 15, 18, 20, 12] },
];

/** mulberry32: tiny seeded PRNG, good enough for sample data. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function weighted<T>(r: () => number, pairs: [T, number][]): T {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [v, w] of pairs) {
    if ((x -= w) < 0) return v;
  }
  return pairs[pairs.length - 1][0];
}

const iso = (ms: number) => new Date(ms).toISOString();

/** One bonus open: a roll on the box's bonus table (percents summing to 100), in credits. */
function bonusOpen(r: () => number, box: Box): number {
  let x = r() * 100;
  for (const row of box.bonus) {
    if ((x -= row.percent) < 0) return row.credits;
  }
  return box.bonus.at(-1)?.credits ?? 0;
}

export function buildDemoPlayers({ today, count = 240, seed = 20_261_012 }: { today: string; count?: number; seed?: number }): PlayerRecord[] {
  const r = rng(seed ^ Number(today.replaceAll("-", "")));
  const anchor = Date.parse(`${today}T00:00:00Z`); // generated activity stops before today
  const byPrice: Box[] = [...boxes].sort((a, b) => a.price - b.price);
  const valueOf = new Map(items.map((i) => [i.id, i]));

  return Array.from({ length: count }, (_, n): PlayerRecord => {
    const first = FIRST[Math.floor(r() * FIRST.length)];
    const last = LAST[Math.floor(r() * LAST.length)];
    // More sign-ups recently: days-ago skews towards 0.
    const daysAgo = 1 + Math.floor((HISTORY_DAYS - 1) * (1 - Math.sqrt(r())));
    const registered = anchor - daysAgo * DAY_MS + Math.floor(r() * DAY_MS * 0.9);
    const tier = weighted(r, TIERS.map((t) => [t, t.share] as [typeof t, number]));

    const plays: PlayEvent[] = [];
    const money: MoneyEvent[] = [];
    let balance = 0;
    let credit = 0; // site credit, in cents ($1 a credit)
    let lastActivity = registered;
    let txn = 0;
    const id = `demo-${String(n + 1).padStart(4, "0")}`;
    const move = (at: number, type: MoneyEvent["type"], amount: Cents, status: MoneyEvent["status"] = "completed") =>
      money.push({ id: `${id}-t${++txn}`, at: iso(at), type, amountCents: amount, status });

    if (r() < 0.68) {
      const firstPlay = registered + (r() < 0.75 ? Math.floor(r() * 3_600_000 * 6) : Math.floor((1 + r() * 4) * DAY_MS));
      const window = Math.max(0, anchor - 60_000 - firstPlay);
      const active = window * Math.min(1, r() * 1.4);
      const openings = 1 + Math.floor(-Math.log(1 - r()) * tier.mean);
      const times = Array.from({ length: openings }, (_, i) => (i === 0 ? firstPlay : firstPlay + Math.floor(r() * active)))
        .filter((t) => t < anchor - 60_000)
        .sort((a, b) => a - b);

      for (const at of times) {
        const box = weighted(r, byPrice.map((b, i) => [b, tier.boxWeights[i]] as [Box, number]));
        const paidWith = credit >= box.price ? "credit" : "card";
        if (paidWith === "card" && balance < box.price) {
          const need = box.price - balance;
          let step = DEPOSIT_STEPS.findIndex((d) => d >= need);
          if (step < 0) step = DEPOSIT_STEPS.length - 1;
          if (r() < 0.3 && step < DEPOSIT_STEPS.length - 1) step++;
          balance += DEPOSIT_STEPS[step];
          move(at - 120_000, "deposit", DEPOSIT_STEPS[step]);
        }
        if (paidWith === "card" && balance < box.price) continue;
        const entry = pickByRoll(box.entries, Math.floor(r() * economy.oddsScale));
        const item = valueOf.get(entry.itemId)!;
        if (paidWith === "credit") credit -= box.price;
        else balance -= box.price;
        if (item.category === "credit") {
          let bonus = 0;
          for (let k = 0; k < (item.freeSpins ?? 0); k++) bonus += bonusOpen(r, box);
          credit += item.value + bonus * 100;
          plays.push({ at: iso(at), boxId: box.id, priceCents: box.price, itemId: item.id, valueCents: item.value + bonus * 100, paidWith });
        } else {
          plays.push({ at: iso(at), boxId: box.id, priceCents: box.price, itemId: item.id, valueCents: item.value, paidWith });
          if (r() < (item.value < box.price ? 0.6 : 0.25)) {
            const traded = tradeInCredits(item.value) * 100;
            credit += traded;
            move(at + 30_000, "sell_back", traded); // traded in right after the open
          }
        }
        lastActivity = at;
      }
    }

    let kyc: KycStatus = r() < 0.25 ? "pending" : "not_started";
    if (balance >= 10_000 && r() < 0.35) {
      const amount = Math.max(economy.minWithdrawal, Math.floor((balance * (0.5 + r() * 0.5)) / 1_000) * 1_000);
      const at = Math.min(anchor - 30_000, lastActivity + Math.floor(r() * 2 * DAY_MS));
      const pending = anchor - at < 3 * DAY_MS && r() < 0.6;
      balance -= amount;
      move(at, "withdrawal", -amount, pending ? "pending" : "completed");
      kyc = "verified";
      lastActivity = Math.max(lastActivity, at);
    }

    const roll = r();
    const status: AccountStatus = roll < 0.02 ? "suspended" : roll < 0.03 ? "self_excluded" : "active";
    const pendingHeld = money.filter((m) => m.type === "withdrawal" && m.status === "pending").reduce((s, m) => s - m.amountCents, 0);

    return {
      id,
      email: `${first}.${last}${n % 97}@example.com`.toLowerCase(),
      firstName: first,
      lastName: last,
      phoneDial: "+1",
      phoneNumber: `${AREA_CODES[Math.floor(r() * AREA_CODES.length)]}55501${String(Math.floor(r() * 100)).padStart(2, "0")}`,
      state: weighted(r, STATES),
      status,
      kycStatus: kyc,
      marketingOptIn: r() < 0.4,
      registeredAt: iso(registered),
      lastSeenAt: iso(Math.min(anchor - 1_000, lastActivity + Math.floor(r() * 3_600_000))),
      balanceCents: balance,
      heldCents: pendingHeld,
      creditBalance: credit / 100,
      plays,
      money: money.sort((a, b) => a.at.localeCompare(b.at)),
      source: "demo",
    };
  });
}
