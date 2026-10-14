import { hmacSha256Hex, sha256Hex } from "@/domain/fair";

/**
 * The backend developer's draw recipe (Misty-style kit v1.0, 13 October 2026), ported as written
 * onto Web Crypto so the browser can check any open without trusting the server:
 *   seal    = sha256(serverSeed)                                  shown before payment
 *   digest  = HMAC-SHA256(key "DRAW-slug-serverSeed-clientSeed-nonce", message "")
 *   roll    = first 13 hex digits of the digest / 2^52            a number in [0, 1)
 *   outcome = the first band, in stored order, whose upper edge is above roll × total
 * Free spins reuse both seeds at nonce 2, 3, … against the box's small free-spin table.
 * engine/test-vectors.json pins every step; change nothing here without regenerating them.
 */

/** Published client seed used when a player sets none; the open records that it was a default. */
export const DEFAULT_CLIENT_SEED = "grailnoir-default";
/** The kit's tables never chain free spins and give at most a few per open. */
const MAX_FREE_SPINS = 3;
const TWO52 = 2 ** 52;

/** Sorted keys, no whitespace: the serialisation the table hash covers. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
    .join(",")}}`;
}

export function drawKey(slug: string, serverSeed: string, clientSeed: string, nonce: number): string {
  return ["DRAW", slug, serverSeed, clientSeed, String(nonce)].join("-");
}

export function digestOf(slug: string, serverSeed: string, clientSeed: string, nonce: number): Promise<string> {
  return hmacSha256Hex(drawKey(slug, serverSeed, clientSeed, nonce), "");
}

/** 52 bits of the digest as a roll in [0, 1). */
export function rollOf(digest: string): number {
  return Number.parseInt(digest.slice(0, 13), 16) / TWO52;
}

/** One band per row on the 0-to-total line, in stored order. */
export interface Band<T> {
  entry: T;
  from: number;
  to: number;
}

export function bands<T extends { percent: number }>(rows: T[]): Band<T>[] {
  let acc = 0;
  return rows.map((entry) => {
    const from = acc;
    acc += Math.max(0, entry.percent);
    return { entry, from, to: acc };
  });
}

/** Walks the bands in stored order; never sort first, the table hash covers that order. */
export function resolve<T extends { percent: number }>(rows: T[], roll: number): T {
  if (rows.length === 0) throw new Error("resolve: empty table");
  const total = rows.reduce((s, r) => s + Math.max(0, r.percent), 0);
  const pos = roll * total;
  let acc = 0;
  for (const r of rows) {
    if (r.percent <= 0) continue;
    acc += r.percent;
    if (pos < acc) return r;
  }
  return rows[rows.length - 1];
}

/** The hash pinned on every open. The price goes in dollars, as in the kit's vectors. */
export function tableHash(slug: string, priceDollars: number, table: { id: string; percent: number }[]): Promise<string> {
  return sha256Hex(canonicalJson({ slug, price: priceDollars, table: table.map(({ id, percent }) => ({ id, percent })) }));
}

/** The kit names a bonus hash but no recipe; this is ours until the backend publishes theirs. */
export function bonusHash(slug: string, bonus: { credits: number; percent: number }[]): Promise<string> {
  return sha256Hex(canonicalJson({ slug, bonus: bonus.map(({ credits, percent }) => ({ credits, percent })) }));
}

export interface BonusSpinResult {
  nonce: number;
  digest: string;
  roll: number;
  credits: number;
}

/** One open: the main roll at nonce 1, then any free spins the outcome carries. */
export async function drawOpen<O extends { id: string; percent: number; freeSpins: number }>(a: {
  slug: string;
  serverSeed: string;
  clientSeed: string;
  outcomes: O[];
  bonus: { credits: number; percent: number }[];
}): Promise<{ digest: string; roll: number; outcome: O; bonusSpins: BonusSpinResult[] }> {
  const digest = await digestOf(a.slug, a.serverSeed, a.clientSeed, 1);
  const roll = rollOf(digest);
  const outcome = resolve(a.outcomes, roll);
  const bonusSpins: BonusSpinResult[] = [];
  const spins = Math.min(Math.max(0, outcome.freeSpins), MAX_FREE_SPINS);
  for (let i = 0; i < spins; i++) {
    const nonce = i + 2;
    const d = await digestOf(a.slug, a.serverSeed, a.clientSeed, nonce);
    const r = rollOf(d);
    bonusSpins.push({ nonce, digest: d, roll: r, credits: a.bonus.length > 0 ? resolve(a.bonus, r).credits : 0 });
  }
  return { digest, roll, outcome, bonusSpins };
}

export interface VerifyInput {
  slug: string;
  priceDollars: number;
  serverSeed: string;
  clientSeed: string;
  /** The seal the player saw before paying. */
  serverHash?: string;
  /** The table hash pinned on the open. */
  tableHash?: string;
  /** The frozen odds table, in stored order. */
  table: { id: string; percent: number; freeSpins?: number }[];
  bonus: { credits: number; percent: number }[];
  /** The free-spin table hash pinned on the open. */
  bonusHash?: string;
  /** The outcome the server returned. */
  outcomeId?: string;
  /** What each free spin paid, as the server returned it. */
  bonusCredits?: number[];
}

export interface VerifyResult {
  ok: boolean;
  serverHash: string;
  digest: string;
  roll: number;
  outcomeId: string;
  bonusSpins: BonusSpinResult[];
  reason: string | null;
}

/** Recomputes an open from what the player was shown. Pure: needs no server. */
export async function verifyOpen(q: VerifyInput): Promise<VerifyResult> {
  const serverHash = await sha256Hex(q.serverSeed);
  const outcomes = q.table.map((t) => ({ id: t.id, percent: t.percent, freeSpins: t.freeSpins ?? 0 }));
  const { digest, roll, outcome, bonusSpins } = await drawOpen({ slug: q.slug, serverSeed: q.serverSeed, clientSeed: q.clientSeed, outcomes, bonus: q.bonus });
  const result = { serverHash, digest, roll, outcomeId: outcome.id, bonusSpins };
  if (q.serverHash !== undefined && serverHash !== q.serverHash) {
    return { ok: false, ...result, reason: "The secret doesn't match the seal shown before payment." };
  }
  if (q.tableHash !== undefined && (await tableHash(q.slug, q.priceDollars, q.table)) !== q.tableHash) {
    return { ok: false, ...result, reason: "This odds table isn't the one pinned on the open." };
  }
  if (q.bonusHash !== undefined && (await bonusHash(q.slug, q.bonus)) !== q.bonusHash) {
    return { ok: false, ...result, reason: "This bonus-open table isn't the one pinned on the open." };
  }
  if (q.outcomeId !== undefined && outcome.id !== q.outcomeId) {
    return { ok: false, ...result, reason: "The roll lands on a different outcome." };
  }
  const recomputed = bonusSpins.map((b) => b.credits);
  if (q.bonusCredits !== undefined && (q.bonusCredits.length !== recomputed.length || q.bonusCredits.some((c, i) => c !== recomputed[i]))) {
    return { ok: false, ...result, reason: "The bonus opens paid differently than the roll says." };
  }
  return { ok: true, ...result, reason: null };
}
