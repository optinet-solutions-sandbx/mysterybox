/**
 * Per-open maths, the kit's "The maths of this box": for every row, worth × chance = what it
 * costs per open on average; the sum is what the box pays back, divided by the price the return.
 * Credit counts at face (1 credit = $1 on screen); a free spin counts at its table's average.
 */

export type OutcomeKind = "item" | "credit" | "bonus";

export interface MathsOutcome {
  id: string;
  label: string;
  kind: OutcomeKind;
  credits: number;
  freeSpins: number;
  valueCents: number | null;
  percent: number;
}

export interface MathsRow {
  id: string;
  label: string;
  kind: OutcomeKind;
  percent: number;
  worthCents: number;
  costCents: number;
}

export interface BoxMaths {
  /** Chance of a physical piece per open, 0..1. */
  pItem: number;
  evItemsCents: number;
  /** Credit per open, free spins included. */
  evCredits: number;
  /** Credit one free spin pays on average. */
  bonusEvCredits: number;
  payFaceCents: number;
  returnFace: number;
  rows: MathsRow[];
}

/** What one credit counts for on screen. */
export const CREDIT_FACE_CENTS = 100;

/** Average credit one free spin pays. */
export function bonusEv(bonus: { credits: number; percent: number }[]): number {
  const total = bonus.reduce((s, b) => s + Math.max(0, b.percent), 0);
  return total > 0 ? bonus.reduce((s, b) => s + b.credits * Math.max(0, b.percent), 0) / total : 0;
}

export function boxMaths({
  priceCents,
  outcomes,
  bonus,
}: {
  priceCents: number;
  outcomes: MathsOutcome[];
  bonus: { credits: number; percent: number }[];
}): BoxMaths {
  const bonusEvCredits = bonusEv(bonus);
  let pItem = 0;
  let evItemsCents = 0;
  let evCredits = 0;
  const rows = outcomes.map((o) => {
    const credits = o.kind === "item" ? 0 : o.credits + o.freeSpins * bonusEvCredits;
    const worthCents = o.kind === "item" ? (o.valueCents ?? 0) : credits * CREDIT_FACE_CENTS;
    const costCents = (worthCents * o.percent) / 100;
    if (o.kind === "item") {
      pItem += o.percent / 100;
      evItemsCents += costCents;
    } else {
      evCredits += (credits * o.percent) / 100;
    }
    return { id: o.id, label: o.label, kind: o.kind, percent: o.percent, worthCents, costCents };
  });
  const payFaceCents = evItemsCents + evCredits * CREDIT_FACE_CENTS;
  return { pItem, evItemsCents, evCredits, bonusEvCredits, payFaceCents, returnFace: priceCents > 0 ? payFaceCents / priceCents : 0, rows };
}
