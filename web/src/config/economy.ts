/**
 * Mock economy knobs. Values mirror what the vendor demo and competitor research describe
 * (see docs/02-research-digest.md) and are expected to change once the business decides.
 */
export const economy = {
  /** Target return-to-player per box. The vendor default (and industry norm) is 90%. */
  targetRtp: 0.9,
  /** Share of an item's listed value credited to the balance when it is sold back. */
  sellBackRate: 0.9,
  /** Demo balance granted to a fresh session, in cents. */
  startingBalance: 1_000_000,
  /** Quick top-up amounts offered on the wallet page, in cents. */
  topUpAmounts: [10_000, 50_000, 250_000, 1_000_000],
  /** Odds resolution: the weights of every box sum to this. 100_000 = 0.001% precision. */
  oddsScale: 100_000,
  /** Smallest withdrawal, in cents (mirrors settings.min_withdrawal_cents in Supabase). */
  minWithdrawal: 2_000,
} as const;
