/**
 * Mock economy. The two-balance wallet, the 7-day vault and the $5 referral follow the IcyBox app
 * (researched 2026-10-14); the numbers are ours and expected to change once the business decides.
 */
export const economy = {
  /** Target return-to-player per box. */
  targetRtp: 0.9,
  /** Share of a piece's listed value paid into the withdrawable balance when it is sold back. */
  sellBackRate: 0.9,
  /** Odds resolution: the weights of every box sum to this. 100_000 = 0.001% precision. */
  oddsScale: 100_000,
  /** Days a kept piece waits in the vault before it is sold back automatically. */
  vaultDays: 7,
  /** Demo credit a new prototype account starts with, in cents. */
  demoCredit: 250_000,
  /** Credit for the new player (on sign-up) and for the friend who invited them (on their first box). */
  referralReward: 500,
  /** Smallest cash-out from the withdrawable balance. */
  minWithdrawal: 600,
  /** Quick amounts on the Add funds sheet. */
  addFundsAmounts: [2_500, 5_000, 10_000, 25_000, 50_000],
  /** Points per whole dollar spent on boxes. */
  pointsPerDollar: 1,
} as const;

/** Shipping quote: one fee per shipment, so pieces shipped together cost less than one by one. */
export const shipping = {
  /** First piece in a shipment. */
  base: 1_500,
  /** Each further piece in the same shipment. */
  extraPiece: 500,
  /** Pieces at or above this value ship insured. */
  insuredFrom: 50_000,
  /** Insurance as a share of the insured piece's value. */
  insuranceRate: 0.015,
  carrier: "UPS 2nd Day Air",
  /** Business days from request to dispatch. */
  dispatchDays: 3,
} as const;

/**
 * The prototype runs shipments and cash-outs on a fast clock so every step can be seen in one
 * sitting. Real timings are in the copy (shipping.dispatchDays, payout methods).
 */
export const demoClock = {
  shipmentShippedAfterMs: 2 * 60_000,
  shipmentDeliveredAfterMs: 10 * 60_000,
  payoutCompletesAfterMs: 60_000,
} as const;
