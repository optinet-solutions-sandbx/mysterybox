import { economy } from "@/config/economy";
import { sha256Hex } from "@/domain/fair";
import type { InventoryItem, Transaction } from "@/domain/types";
import { DEFAULT_CLIENT_SEED, bonusHash, drawOpen, tableHash, verifyOpen, type BonusSpinResult, type VerifyResult } from "@/engine/draw";
import { catalogBox, getBox, listBoxes, outcomeArt } from "@/services/catalog";
import {
  BoxApiError,
  type ApiBox,
  type AwardView,
  type Credits,
  type LedgerEntry,
  type Open,
  type OpenCommitted,
  type OpenResolved,
  type PayMethod,
  type TableLogEntry,
  type TableSnapshot,
  type VerifyQuery,
} from "./contract";

/**
 * The backend's server rules, as pure functions over one account's state, so they run in the
 * browser for the showcase and in tests. Each operation takes the world and returns a new one;
 * box-api/mock.ts serialises them and persists the result. The secret is kept here and only
 * leaves in a spin response (and in getOpen once the open is resolved).
 */

export const OPEN_TTL_MS = 15 * 60 * 1000;
/** Trade-ins pay this share of a piece's listed value, in whole credits (1 credit = $1). */
export const TRADE_IN_RATE = economy.sellBackRate;
/** Unpaid opens are forgotten this long after they expire. */
const PRUNE_AFTER_MS = 60 * 60 * 1000;
const MAX_TRANSACTIONS = 200;
/** The mock's tables never change; this is when they were "activated". */
const PUBLISHED_AT = "2026-10-13T00:00:00.000Z";

export interface StoredOpen {
  openId: string;
  boxSlug: string;
  accountId: string;
  createdAt: number;
  expiresAt: number;
  priceCents: number;
  /** The secret. Never returned before the spin. */
  serverSeed: string;
  serverHash: string;
  tableHash: string;
  bonusHash: string;
  clientSeed: string | null;
  clientSeedSource: "player" | "server-default" | null;
  status: "created" | "paid" | "resolved";
  payment?: { method: PayMethod; key: string };
  resolved?: {
    digest: string;
    roll: number;
    outcomeId: string;
    bonusSpins: BonusSpinResult[];
    creditsAwarded: number;
    awardId: string | null;
    resolvedAt: number;
  };
}

/** The mock server's own tables for one account (opens, credit ledger, used payment keys). */
export interface MockState {
  opens: StoredOpen[];
  ledger: LedgerEntry[];
  payKeys: Record<string, string>;
  nextLedgerId: number;
}

export function emptyMockState(): MockState {
  return { opens: [], ledger: [], payKeys: {}, nextLedgerId: 1 };
}

/** Everything an operation reads or writes: the mock tables plus the demo wallet it charges for "card". */
export interface MockWorld {
  now: number;
  accountId: string | null;
  /** Demo USD balance, in cents; "card" payments are taken from it. */
  usd: number;
  transactions: Transaction[];
  /** Awarded pieces land here, as before the box API. */
  inventory: InventoryItem[];
  box: MockState;
}

export interface MockDeps {
  randomHex(bytes: number): string;
  uuid(): string;
}

export interface OpResult<R> {
  world: MockWorld;
  result: R;
}

const hashCache = new Map<string, Promise<{ tableHash: string; bonusHash: string }>>();

export async function apiBox(slug: string): Promise<ApiBox> {
  const box = getBox(slug);
  if (!box) throw new BoxApiError(404, "unknown_box");
  const c = catalogBox(box);
  let hashes = hashCache.get(slug);
  if (!hashes) {
    hashes = (async () => ({ tableHash: await tableHash(slug, c.priceCents / 100, c.outcomes), bonusHash: await bonusHash(slug, c.bonus) }))();
    hashCache.set(slug, hashes);
  }
  return { ...c, ...(await hashes) };
}

export function apiBoxes(): Promise<ApiBox[]> {
  return Promise.all(listBoxes().map((b) => apiBox(b.slug)));
}

export const tradeInCredits = (valueCents: number) => Math.floor((valueCents * TRADE_IN_RATE) / 100);

const creditBalance = (state: MockState) => state.ledger.reduce((s, e) => s + e.delta, 0);
const isExpired = (o: StoredOpen, now: number) => o.status === "created" && now > o.expiresAt;
const iso = (ms: number) => new Date(ms).toISOString();

function requireAccount(w: MockWorld): string {
  if (!w.accountId) throw new BoxApiError(401, "not_authenticated");
  return w.accountId;
}

function findOpen(w: MockWorld, openId: string): StoredOpen {
  const open = w.box.opens.find((o) => o.openId === openId && o.accountId === w.accountId);
  if (!open) throw new BoxApiError(404, "unknown_open");
  return open;
}

function withOpen(w: MockWorld, open: StoredOpen): MockWorld {
  return { ...w, box: { ...w.box, opens: w.box.opens.map((o) => (o.openId === open.openId ? open : o)) } };
}

function withLedger(state: MockState, entries: Omit<LedgerEntry, "id">[]): MockState {
  let id = state.nextLedgerId;
  const added = entries.map((e) => ({ ...e, id: id++ }));
  return { ...state, ledger: [...state.ledger, ...added], nextLedgerId: id };
}

function committedView(o: StoredOpen, now: number): OpenCommitted {
  return {
    openId: o.openId,
    boxSlug: o.boxSlug,
    status: isExpired(o, now) ? "expired" : o.status === "paid" ? "paid" : "created",
    priceCents: o.priceCents,
    serverHash: o.serverHash,
    tableHash: o.tableHash,
    bonusHash: o.bonusHash,
    nonce: 1,
    clientSeed: o.clientSeed,
    expiresAt: iso(o.expiresAt),
  };
}

async function resolvedView(o: StoredOpen): Promise<OpenResolved> {
  const r = o.resolved!;
  const box = await apiBox(o.boxSlug);
  const outcome = box.outcomes.find((x) => x.id === r.outcomeId)!;
  const clientSeed = o.clientSeed ?? DEFAULT_CLIENT_SEED;
  const verifyUrl = `/provably-fair?${new URLSearchParams({ slug: o.boxSlug, serverSeed: o.serverSeed, clientSeed, tableHash: o.tableHash, serverHash: o.serverHash, outcomeId: r.outcomeId })}`;
  return {
    openId: o.openId,
    boxSlug: o.boxSlug,
    priceCents: o.priceCents,
    serverHash: o.serverHash,
    tableHash: o.tableHash,
    bonusHash: o.bonusHash,
    nonce: 1,
    expiresAt: iso(o.expiresAt),
    status: "resolved",
    serverSeed: o.serverSeed,
    clientSeed,
    clientSeedSource: o.clientSeedSource ?? "server-default",
    digest: r.digest,
    roll: r.roll,
    outcome,
    bonusSpins: r.bonusSpins,
    creditsAwarded: r.creditsAwarded,
    itemAward: r.awardId && outcome.valueCents !== null ? { awardId: r.awardId, valueCents: outcome.valueCents, tradeInCredits: tradeInCredits(outcome.valueCents) } : null,
    verifyUrl,
    resolvedAt: iso(r.resolvedAt),
  };
}

export async function createOpen(w: MockWorld, { boxSlug }: { boxSlug: string }, deps: MockDeps): Promise<OpResult<OpenCommitted>> {
  const accountId = requireAccount(w);
  const box = await apiBox(boxSlug);
  const serverSeed = deps.randomHex(32);
  const open: StoredOpen = {
    openId: deps.uuid(),
    boxSlug,
    accountId,
    createdAt: w.now,
    expiresAt: w.now + OPEN_TTL_MS,
    priceCents: box.priceCents,
    serverSeed,
    serverHash: await sha256Hex(serverSeed),
    tableHash: box.tableHash,
    bonusHash: box.bonusHash,
    clientSeed: null,
    clientSeedSource: null,
    status: "created",
  };
  const keep = w.box.opens.filter((o) => !(o.status === "created" && w.now > o.expiresAt + PRUNE_AFTER_MS));
  return { world: { ...w, box: { ...w.box, opens: [...keep, open] } }, result: committedView(open, w.now) };
}

export async function setClientSeed(w: MockWorld, { openId, clientSeed }: { openId: string; clientSeed: string }): Promise<OpResult<void>> {
  requireAccount(w);
  const open = findOpen(w, openId);
  if (open.status !== "created" || isExpired(open, w.now)) throw new BoxApiError(409, "seed_locked");
  if (clientSeed.length < 1 || clientSeed.length > 64) throw new BoxApiError(422, "invalid_client_seed");
  return { world: withOpen(w, { ...open, clientSeed, clientSeedSource: "player" }), result: undefined };
}

export async function pay(
  w: MockWorld,
  { openId, method, idempotencyKey }: { openId: string; method: PayMethod; idempotencyKey: string },
  deps: MockDeps,
): Promise<OpResult<{ status: "paid"; creditBalance: number }>> {
  requireAccount(w);
  const known = w.box.payKeys[idempotencyKey];
  if (known !== undefined) {
    if (known !== openId) throw new BoxApiError(409, "idempotency_key_reused");
    return { world: w, result: { status: "paid", creditBalance: creditBalance(w.box) } };
  }
  const open = findOpen(w, openId);
  if (isExpired(open, w.now)) throw new BoxApiError(409, "expired");
  if (open.status !== "created") throw new BoxApiError(409, "already_paid");

  let next = w;
  if (method === "card") {
    if (w.usd < open.priceCents) throw new BoxApiError(402, "insufficient_funds");
    const box = await apiBox(open.boxSlug);
    const tx: Transaction = { id: deps.uuid(), type: "box_open", amount: -open.priceCents, label: `Opened ${box.name}`, at: iso(w.now) };
    next = { ...w, usd: w.usd - open.priceCents, transactions: [tx, ...w.transactions].slice(0, MAX_TRANSACTIONS) };
  } else {
    const price = open.priceCents / 100;
    if (creditBalance(w.box) < price) throw new BoxApiError(402, "insufficient_credit");
    next = { ...w, box: withLedger(w.box, [{ delta: -price, reason: "box-payment", refType: "open", refId: open.openId, createdAt: iso(w.now) }]) };
  }
  const paid: StoredOpen = {
    ...open,
    status: "paid",
    clientSeed: open.clientSeed ?? DEFAULT_CLIENT_SEED,
    clientSeedSource: open.clientSeedSource ?? "server-default",
    payment: { method, key: idempotencyKey },
  };
  next = withOpen(next, paid);
  next = { ...next, box: { ...next.box, payKeys: { ...next.box.payKeys, [idempotencyKey]: openId } } };
  return { world: next, result: { status: "paid", creditBalance: creditBalance(next.box) } };
}

export async function spin(w: MockWorld, { openId }: { openId: string }, deps: MockDeps): Promise<OpResult<OpenResolved>> {
  requireAccount(w);
  const open = findOpen(w, openId);
  if (open.status === "resolved") return { world: w, result: await resolvedView(open) };
  if (open.status !== "paid") throw new BoxApiError(409, "not_paid");
  const box = await apiBox(open.boxSlug);
  if (box.tableHash !== open.tableHash) throw new BoxApiError(409, "table_changed");

  const clientSeed = open.clientSeed ?? DEFAULT_CLIENT_SEED;
  const d = await drawOpen({ slug: open.boxSlug, serverSeed: open.serverSeed, clientSeed, outcomes: box.outcomes, bonus: box.bonus });
  const at = iso(w.now);
  let next = w;
  let awardId: string | null = null;
  let creditsAwarded = 0;
  if (d.outcome.kind === "item") {
    awardId = deps.uuid();
    const piece: InventoryItem = {
      uid: awardId,
      itemId: d.outcome.id,
      boxId: open.boxSlug,
      acquiredAt: at,
      status: "held",
      openId: open.openId,
      draw: { serverSeedHash: open.serverHash, clientSeed, nonce: 1, roll: Math.floor(d.roll * economy.oddsScale) },
    };
    next = { ...next, inventory: [piece, ...next.inventory] };
  } else {
    const fromSpins = d.bonusSpins.reduce((s, b) => s + b.credits, 0);
    creditsAwarded = d.outcome.credits + fromSpins;
    const entries: Omit<LedgerEntry, "id">[] = [{ delta: d.outcome.credits, reason: "box-award", refType: "open", refId: open.openId, createdAt: at }];
    if (fromSpins > 0) entries.push({ delta: fromSpins, reason: "bonus-award", refType: "open", refId: open.openId, createdAt: at });
    next = { ...next, box: withLedger(next.box, entries) };
  }
  const resolved: StoredOpen = {
    ...open,
    status: "resolved",
    clientSeed,
    resolved: { digest: d.digest, roll: d.roll, outcomeId: d.outcome.id, bonusSpins: d.bonusSpins, creditsAwarded, awardId, resolvedAt: w.now },
  };
  next = withOpen(next, resolved);
  return { world: next, result: await resolvedView(resolved) };
}

export async function getOpen(w: MockWorld, { openId }: { openId: string }): Promise<OpResult<Open>> {
  requireAccount(w);
  const open = findOpen(w, openId);
  return { world: w, result: open.status === "resolved" ? await resolvedView(open) : committedView(open, w.now) };
}

export async function tradeIn(w: MockWorld, { awardId }: { awardId: string }): Promise<OpResult<{ credits: number; creditBalance: number }>> {
  requireAccount(w);
  const piece = w.inventory.find((i) => i.uid === awardId);
  if (!piece) throw new BoxApiError(404, "unknown_award");
  if (piece.status !== "held") throw new BoxApiError(409, "not_tradeable");
  const credits = tradeInCredits(outcomeArt(piece.itemId).value);
  const box = withLedger(w.box, [{ delta: credits, reason: "trade-in", refType: "award", refId: awardId, createdAt: iso(w.now) }]);
  const inventory = w.inventory.map((i) => (i.uid === awardId ? { ...i, status: "traded" as const } : i));
  return { world: { ...w, inventory, box }, result: { credits, creditBalance: creditBalance(box) } };
}

export async function myCredits(w: MockWorld): Promise<OpResult<Credits>> {
  requireAccount(w);
  return { world: w, result: { balance: creditBalance(w.box), ledger: [...w.box.ledger].reverse() } };
}

const awardStatus: Record<InventoryItem["status"], AwardView["status"]> = {
  held: "awarded",
  shipping_pending: "shipping",
  shipping_processing: "shipping",
  shipped: "shipped",
  sold: "traded",
  traded: "traded",
};

export async function listAwards(w: MockWorld): Promise<OpResult<AwardView[]>> {
  requireAccount(w);
  const awards = w.inventory
    .filter((i) => outcomeArt(i.itemId).category !== "credit")
    .map((i) => {
      const valueCents = outcomeArt(i.itemId).value;
      return { awardId: i.uid, openId: i.openId ?? null, itemId: i.itemId, valueCents, tradeInCredits: tradeInCredits(valueCents), status: awardStatus[i.status] };
    });
  return { world: w, result: awards };
}

/** Stateless, like the backend's public GET /v1/verify. */
export async function verify(q: VerifyQuery): Promise<VerifyResult> {
  const box = await apiBox(q.slug);
  if (q.tableHash !== box.tableHash) throw new BoxApiError(404, "unknown_table");
  return verifyOpen({
    slug: q.slug,
    priceDollars: box.priceCents / 100,
    serverSeed: q.serverSeed,
    clientSeed: q.clientSeed,
    serverHash: q.serverHash,
    tableHash: q.tableHash,
    table: box.outcomes,
    bonus: box.bonus,
    outcomeId: q.outcomeId,
  });
}

export async function getTable(hash: string): Promise<TableSnapshot> {
  const box = (await apiBoxes()).find((b) => b.tableHash === hash);
  if (!box) throw new BoxApiError(404, "unknown_table");
  return { boxSlug: box.slug, version: 1, tableHash: box.tableHash, priceCents: box.priceCents, entries: box.outcomes.map(({ id, percent }) => ({ id, percent })) };
}

export async function tableLog(): Promise<TableLogEntry[]> {
  return (await apiBoxes()).map((b) => ({ boxSlug: b.slug, tableHash: b.tableHash, bonusHash: b.bonusHash, segmentId: null, publishedAt: PUBLISHED_AT }));
}
