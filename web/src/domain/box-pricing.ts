import { economy } from "@/config/economy";
import { bonusEv, CREDIT_FACE_CENTS } from "@/engine/maths";
import { expectedValue, priceForRtp } from "./odds";
import type { BonusRow, Cents } from "./types";

/**
 * Box pricing shared by the built-in catalogue (data/boxes) and the back-office box editor, so a
 * box built by hand in the back office is priced exactly like one authored in code.
 */

/** The free-spin table's shape (the backend kit's): what a spin pays as a share of the box price, and its chance. */
export const FREE_SPIN_TABLE = [
  [0.1, 70],
  [0.2, 22],
  [0.5, 6],
  [1, 1.8],
  [2, 0.2],
] as const;

/** A box's free-spin table, scaled to its price before free spins are counted. */
export function freeSpinTable(prePriceCents: Cents): BonusRow[] {
  return FREE_SPIN_TABLE.map(([share, percent]) => ({ credits: Math.max(1, Math.round((prePriceCents / 100) * share)), percent }));
}

export interface PricedRow {
  value: Cents;
  freeSpins?: number;
  weight: number;
}

/**
 * Prices a box at the target return, with free spins counted at their table's average
 * (1 credit = $1). Boxes without free-spin outcomes get no table.
 */
export function priceBox(rows: PricedRow[], targetRtp: number = economy.targetRtp): { price: Cents; bonus: BonusRow[] } {
  const prePrice = priceForRtp(expectedValue(rows), targetRtp);
  const bonus = rows.some((r) => (r.freeSpins ?? 0) > 0) ? freeSpinTable(prePrice) : [];
  const spinCents = bonusEv(bonus) * CREDIT_FACE_CENTS;
  const ev = expectedValue(rows.map((r) => ({ value: r.value + (r.freeSpins ?? 0) * spinCents, weight: r.weight })));
  return { price: priceForRtp(ev, targetRtp), bonus };
}
