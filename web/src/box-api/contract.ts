import type { BonusSpinResult, VerifyResult } from "@/engine/draw";
import type { CatalogBox, CatalogOutcome } from "@/services/catalog";

/**
 * The backend developer's box API (Misty-style kit v1.0, openapi.yaml, 13 October 2026), as the
 * front end uses it. Two implementations follow it: box-api/mock.ts (in the browser, the default)
 * and box-api/http.ts (their server). Additions their contract doesn't have yet are marked
 * "pending the backend".
 */

export type { BonusSpinResult, VerifyResult } from "@/engine/draw";

export type Outcome = CatalogOutcome;

/** GET /v1/boxes/{slug}: the ordered odds table, the free-spin table, their hashes and the per-open maths. */
export type ApiBox = CatalogBox & { tableHash: string; bonusHash: string };

export type PayMethod = "card" | "credit";

/** POST /v1/opens: the server has chosen and hashed its secret; nothing is paid yet. */
export interface OpenCommitted {
  openId: string;
  boxSlug: string;
  status: "created" | "paid" | "expired";
  priceCents: number;
  /** SHA-256 of the secret: the seal shown before payment. */
  serverHash: string;
  tableHash: string;
  bonusHash: string;
  nonce: 1;
  clientSeed: string | null;
  expiresAt: string;
}

export interface ItemAward {
  awardId: string;
  valueCents: number;
  /** Credit this piece trades in for (1 credit = $1 on screen). */
  tradeInCredits: number;
}

/** POST /v1/opens/{id}/spin: the result, any free spins, and the revealed secret. */
export interface OpenResolved extends Omit<OpenCommitted, "status" | "clientSeed"> {
  status: "resolved";
  serverSeed: string;
  clientSeed: string;
  clientSeedSource: "player" | "server-default";
  digest: string;
  roll: number;
  outcome: Outcome;
  bonusSpins: BonusSpinResult[];
  creditsAwarded: number;
  itemAward: ItemAward | null;
  verifyUrl: string;
  resolvedAt: string;
}

export type Open = OpenCommitted | OpenResolved;

export type LedgerReason = "box-award" | "bonus-award" | "trade-in" | "box-payment";

/** Site credit: append-only; buys boxes, never becomes cash. */
export interface LedgerEntry {
  id: number;
  delta: number;
  reason: LedgerReason;
  refType: "open" | "award" | null;
  refId: string | null;
  createdAt: string;
}

export interface Credits {
  balance: number;
  /** Newest first. */
  ledger: LedgerEntry[];
}

/** GET /v1/verify: public and stateless. */
export interface VerifyQuery {
  slug: string;
  serverSeed: string;
  clientSeed: string;
  tableHash: string;
  bonusHash?: string;
  serverHash?: string;
  outcomeId?: string;
}

/** GET /v1/tables/{hash}: the frozen table, in stored order. */
export interface TableSnapshot {
  boxSlug: string;
  version: number;
  tableHash: string;
  priceCents: number;
  entries: { id: string; percent: number }[];
}

export interface TableLogEntry {
  boxSlug: string;
  tableHash: string;
  bonusHash: string | null;
  segmentId: string | null;
  publishedAt: string;
}

/** Pending the backend: their contract has no endpoint that lists a player's awards. */
export interface AwardView {
  awardId: string;
  openId: string | null;
  itemId: string;
  valueCents: number;
  tradeInCredits: number;
  status: "awarded" | "shipping" | "shipped" | "traded";
}

export type BoxApiErrorStatus = 401 | 402 | 404 | 409 | 422 | 500;

/** Pending the backend: their error body isn't specified; we read `code` when it's there. */
export class BoxApiError extends Error {
  constructor(
    readonly status: BoxApiErrorStatus,
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "BoxApiError";
  }
}

export interface BoxApi {
  listBoxes(): Promise<ApiBox[]>;
  getBox(slug: string): Promise<ApiBox>;
  createOpen(boxSlug: string): Promise<OpenCommitted>;
  setClientSeed(openId: string, clientSeed: string): Promise<void>;
  pay(openId: string, body: { method: PayMethod; idempotencyKey: string; paymentToken?: string }): Promise<{ status: "paid"; creditBalance: number }>;
  spin(openId: string): Promise<OpenResolved>;
  getOpen(openId: string): Promise<Open>;
  tradeIn(awardId: string): Promise<{ credits: number; creditBalance: number }>;
  myCredits(): Promise<Credits>;
  verify(q: VerifyQuery): Promise<VerifyResult>;
  getTable(tableHash: string): Promise<TableSnapshot>;
  tableLog(): Promise<TableLogEntry[]>;
  /** Pending the backend (see AwardView). */
  listAwards(): Promise<AwardView[]>;
}
