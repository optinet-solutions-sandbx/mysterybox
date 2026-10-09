import { economy } from "@/config/economy";
import type { Cents, Rarity } from "./types";

/**
 * Scales arbitrary positive weights to integers that sum exactly to `scale`
 * (largest-remainder rounding), so authored odds never drift off 100%.
 */
export function normalizeWeights(raw: number[], scale: number = economy.oddsScale): number[] {
  if (raw.length === 0) throw new Error("normalizeWeights: no weights");
  if (raw.some((w) => !(w > 0))) throw new Error("normalizeWeights: weights must be > 0");
  const total = raw.reduce((a, b) => a + b, 0);
  const exact = raw.map((w) => (w / total) * scale);
  const floored = exact.map(Math.floor);
  let remainder = scale - floored.reduce((a, b) => a + b, 0);
  const byFraction = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of byFraction) {
    if (remainder === 0) break;
    floored[i] += 1;
    remainder -= 1;
  }
  // A weight of 0 would make an advertised item impossible to draw.
  if (floored.some((w) => w === 0)) throw new Error("normalizeWeights: odds below resolution");
  return floored;
}

/** Expected listed value of one opening, in (fractional) cents. */
export function expectedValue(
  entries: { value: Cents; weight: number }[],
  scale: number = economy.oddsScale,
): number {
  return entries.reduce((sum, e) => sum + (e.value * e.weight) / scale, 0);
}

/** Smallest whole-dollar price whose RTP does not exceed the target. */
export function priceForRtp(ev: number, targetRtp: number = economy.targetRtp): Cents {
  return Math.ceil(ev / targetRtp / 100) * 100;
}

export function rtp(ev: number, price: Cents): number {
  return ev / price;
}

/** Maps a roll in [0, scale) onto the entry whose cumulative weight range contains it. */
export function pickByRoll<T extends { weight: number }>(entries: T[], roll: number): T {
  let cumulative = 0;
  for (const entry of entries) {
    cumulative += entry.weight;
    if (roll < cumulative) return entry;
  }
  throw new Error(`pickByRoll: roll ${roll} outside total weight ${cumulative}`);
}

/** Inclusive roll range [from, to] each entry owns, in authored order (the order pickByRoll walks). */
export function rollRanges<T extends { weight: number }>(entries: T[]): (T & { from: number; to: number })[] {
  const ends = entries.reduce<number[]>((acc, e) => [...acc, (acc.at(-1) ?? 0) + e.weight], []);
  return entries.map((e, i) => ({ ...e, from: ends[i] - e.weight, to: ends[i] - 1 }));
}

/** Credit paid when an item is sold back, rounded down to the cent. */
export function sellBackValue(value: Cents, rate: number = economy.sellBackRate): Cents {
  return Math.floor(value * rate);
}

/** Rarity by value multiple of the box price, so every box has a full ladder. */
export function rarityFor(value: Cents, boxPrice: Cents): Rarity {
  const multiple = value / boxPrice;
  if (multiple >= 25) return "legendary";
  if (multiple >= 5) return "epic";
  if (multiple >= 1.5) return "rare";
  if (multiple >= 0.5) return "uncommon";
  return "common";
}
