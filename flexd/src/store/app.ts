import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { economy } from "@/config/economy";
import { normalizeReferralCode, referralCodeFor, type UsAddress } from "@/domain/account";
import { computeRoll, randomHex, sha256Hex } from "@/domain/fair";
import { formatUsd } from "@/domain/money";
import { pickByRoll, rarityFor, sellBackValue } from "@/domain/odds";
import type { Cents, Rarity } from "@/domain/types";
import { cashOutError, charge, isVaultExpired, shippingQuote, type Balances, type ShippingQuote } from "@/domain/wallet";
import { boxBySlug, getItem } from "@/services/catalog";

/**
 * Prototype accounts, kept in this browser (localStorage). Every rule that moves money goes
 * through the pure functions in domain/wallet.ts; swap these bodies for the platform API later.
 */

export type PullStatus = "vault" | "sold" | "auto_sold" | "shipping";

export interface Pull {
  id: string;
  boxId: string;
  itemId: string;
  value: Cents;
  rarity: Rarity;
  at: string;
  nonce: number;
  roll: number;
  status: PullStatus;
  soldFor?: Cents;
  soldAt?: string;
  shipmentId?: string;
}

export interface Shipment {
  id: string;
  pullIds: string[];
  address: UsAddress;
  quote: ShippingQuote;
  at: string;
  tracking: string;
}

export type TxKind = "demo" | "deposit" | "referral" | "box" | "sale" | "auto_sale" | "shipping" | "cash_out";

export interface Tx {
  id: string;
  kind: TxKind;
  label: string;
  at: string;
  /** Signed change to each balance. */
  credit: Cents;
  withdrawable: Cents;
  method?: string;
}

export interface Account {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  referralCode: string;
  referredBy: string | null;
  balances: Balances;
  /** Newest first. */
  pulls: Pull[];
  shipments: Shipment[];
  txs: Tx[];
  /** Total spent on boxes, for points. */
  spent: Cents;
  referral: { invited: number; earned: Cents };
  fair: { serverSeed: string; serverSeedHash: string; clientSeed: string; nonce: number };
  lastAddress: UsAddress | null;
  openedFirstBox: boolean;
}

interface AppState {
  accounts: Record<string, Account>;
  currentId: string | null;
  ageOk: boolean;
  /** A referral code from a shared link, applied at sign-up. */
  pendingRef: string | null;
}

export const useApp = create<AppState>()(
  persist<AppState>(() => ({ accounts: {}, currentId: null, ageOk: false, pendingRef: null }), {
    name: "flexd",
    version: 1,
    skipHydration: true,
  }),
);

/** True once localStorage has been read; gate anything account-specific on it. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useApp.persist.onFinishHydration(onChange),
    () => useApp.persist.hasHydrated(),
    () => false,
  );
}

export function useCurrentAccount(): Account | null {
  return useApp((s) => (s.currentId ? (s.accounts[s.currentId] ?? null) : null));
}

const now = () => new Date().toISOString();

function uid(): string {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : randomHex(16);
}

function tx(kind: TxKind, label: string, credit: Cents, withdrawable: Cents, method?: string): Tx {
  return { id: uid(), kind, label, at: now(), credit, withdrawable, method };
}

function current(): Account {
  const { currentId, accounts } = useApp.getState();
  const account = currentId ? accounts[currentId] : undefined;
  if (!account) throw new Error("Sign in first.");
  return account;
}

function update(id: string, change: (a: Account) => Account) {
  useApp.setState((s) => {
    const account = s.accounts[id];
    return account ? { accounts: { ...s.accounts, [id]: change(account) } } : s;
  });
}

function findAccount(match: (a: Account) => boolean): Account | undefined {
  return Object.values(useApp.getState().accounts).find(match);
}

export function confirmAge() {
  useApp.setState({ ageOk: true });
}

export function rememberReferral(raw: string | null) {
  const code = normalizeReferralCode(raw);
  if (code) useApp.setState({ pendingRef: code });
}

export type SignUpResult = { ok: true } | { ok: false; field: "username" | "email"; error: string };

export async function signUp(input: { username: string; email: string; referral: string }): Promise<SignUpResult> {
  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();
  if (findAccount((a) => a.username.toLowerCase() === username.toLowerCase())) {
    return { ok: false, field: "username", error: "That username is taken on this device." };
  }
  if (findAccount((a) => a.email === email)) {
    return { ok: false, field: "email", error: "An account with this email is already on this device. Sign in instead." };
  }
  const referralCode = referralCodeFor(username);
  const ref = normalizeReferralCode(input.referral);
  const referredBy = ref && ref !== referralCode ? ref : null;

  const serverSeed = randomHex(32);
  const txs = [tx("demo", "Prototype demo credit", economy.demoCredit, 0)];
  if (referredBy) txs.unshift(tx("referral", `Welcome credit from ${referredBy}`, economy.referralReward, 0));

  const account: Account = {
    id: uid(),
    username,
    email,
    createdAt: now(),
    referralCode,
    referredBy,
    balances: { credit: economy.demoCredit + (referredBy ? economy.referralReward : 0), withdrawable: 0 },
    pulls: [],
    shipments: [],
    txs,
    spent: 0,
    referral: { invited: 0, earned: 0 },
    fair: { serverSeed, serverSeedHash: await sha256Hex(serverSeed), clientSeed: randomHex(8), nonce: 0 },
    lastAddress: null,
    openedFirstBox: false,
  };
  useApp.setState((s) => ({ accounts: { ...s.accounts, [account.id]: account }, currentId: account.id, pendingRef: null }));
  return { ok: true };
}

export function signIn(emailOrUsername: string): boolean {
  const key = emailOrUsername.trim().toLowerCase();
  const account = findAccount((a) => a.email === key || a.username.toLowerCase() === key);
  if (!account) return false;
  useApp.setState({ currentId: account.id });
  return true;
}

export function signOut() {
  useApp.setState({ currentId: null });
}

export class NotEnoughFunds extends Error {
  constructor(public short: Cents) {
    super(`Add ${formatUsd(short)} to open this box.`);
  }
}

/**
 * Charges the box and reserves the draw number synchronously, then draws. The piece is decided
 * here, before any animation starts.
 */
export async function openBox(slug: string): Promise<Pull> {
  const box = boxBySlug(slug);
  if (!box) throw new Error(`Unknown box ${slug}`);
  const account = current();
  const paid = charge(account.balances, box.price);
  if (!paid.ok) throw new NotEnoughFunds(paid.short);

  const { serverSeed, clientSeed, nonce } = account.fair;
  update(account.id, (a) => ({
    ...a,
    balances: paid.balances,
    spent: a.spent + box.price,
    fair: { ...a.fair, nonce: a.fair.nonce + 1 },
    txs: [tx("box", `Opened ${box.name}`, -paid.fromCredit, -paid.fromWithdrawable), ...a.txs],
  }));

  const roll = await computeRoll(serverSeed, clientSeed, nonce);
  const entry = pickByRoll(box.entries, roll);
  const item = getItem(entry.itemId);
  const pull: Pull = {
    id: uid(),
    boxId: box.id,
    itemId: item.id,
    value: item.value,
    rarity: rarityFor(item.value, box.price),
    at: now(),
    nonce,
    roll,
    status: "vault",
  };
  update(account.id, (a) => ({ ...a, pulls: [pull, ...a.pulls], openedFirstBox: true }));

  // The friend who invited this player earns their reward on the player's first box.
  if (account.referredBy && !account.openedFirstBox) {
    const referrer = findAccount((a) => a.referralCode === account.referredBy);
    if (referrer) {
      update(referrer.id, (a) => ({
        ...a,
        balances: { ...a.balances, credit: a.balances.credit + economy.referralReward },
        referral: { invited: a.referral.invited + 1, earned: a.referral.earned + economy.referralReward },
        txs: [tx("referral", `${account.username} opened their first box`, economy.referralReward, 0), ...a.txs],
      }));
    }
  }
  return pull;
}

function soldPull(p: Pull, status: "sold" | "auto_sold"): Pull {
  return { ...p, status, soldFor: sellBackValue(p.value), soldAt: now() };
}

export function sellPull(pullId: string): Cents {
  const account = current();
  const pull = account.pulls.find((p) => p.id === pullId);
  if (!pull || pull.status !== "vault") throw new Error("This piece can't be sold.");
  const sold = soldPull(pull, "sold");
  const item = getItem(pull.itemId);
  update(account.id, (a) => ({
    ...a,
    balances: { ...a.balances, withdrawable: a.balances.withdrawable + sold.soldFor! },
    pulls: a.pulls.map((p) => (p.id === pullId ? sold : p)),
    txs: [tx("sale", `Sold ${item.brand} ${item.name}`, 0, sold.soldFor!), ...a.txs],
  }));
  return sold.soldFor!;
}

/** Sells back every piece that has waited in the vault past its deadline, in every account. */
export function sweepVaults(at: number = Date.now()) {
  useApp.setState((s) => {
    let changed = false;
    const accounts = { ...s.accounts };
    for (const account of Object.values(s.accounts)) {
      const expired = account.pulls.filter((p) => p.status === "vault" && isVaultExpired(p.at, at));
      if (expired.length === 0) continue;
      changed = true;
      const ids = new Set(expired.map((p) => p.id));
      const sold = expired.map((p) => soldPull(p, "auto_sold"));
      const total = sold.reduce((sum, p) => sum + p.soldFor!, 0);
      accounts[account.id] = {
        ...account,
        balances: { ...account.balances, withdrawable: account.balances.withdrawable + total },
        pulls: account.pulls.map((p) => (ids.has(p.id) ? sold.find((x) => x.id === p.id)! : p)),
        txs: [
          ...sold.map((p) => {
            const item = getItem(p.itemId);
            return tx("auto_sale", `Sold after ${economy.vaultDays} days: ${item.brand} ${item.name}`, 0, p.soldFor!);
          }),
          ...account.txs,
        ],
      };
    }
    return changed ? { accounts } : s;
  });
}

export type ShipResult = { ok: true; shipment: Shipment } | { ok: false; error: string };

function trackingNumber(): string {
  return `1Z${randomHex(8).toUpperCase()}`;
}

export function requestShipment(pullIds: string[], address: UsAddress): ShipResult {
  const account = current();
  const pulls = account.pulls.filter((p) => pullIds.includes(p.id) && p.status === "vault");
  if (pulls.length !== pullIds.length || pulls.length === 0) return { ok: false, error: "Some of these pieces are no longer in your vault." };
  const quote = shippingQuote(pulls.map((p) => p.value));
  const paid = charge(account.balances, quote.total);
  if (!paid.ok) return { ok: false, error: `Add ${formatUsd(paid.short)} to cover shipping.` };
  const shipment: Shipment = { id: uid(), pullIds, address, quote, at: now(), tracking: trackingNumber() };
  const ids = new Set(pullIds);
  update(account.id, (a) => ({
    ...a,
    balances: paid.balances,
    shipments: [shipment, ...a.shipments],
    pulls: a.pulls.map((p) => (ids.has(p.id) ? { ...p, status: "shipping", shipmentId: shipment.id } : p)),
    txs: [
      tx("shipping", `Shipping for ${pulls.length} ${pulls.length === 1 ? "piece" : "pieces"}`, -paid.fromCredit, -paid.fromWithdrawable),
      ...a.txs,
    ],
    lastAddress: address,
  }));
  return { ok: true, shipment };
}

export function addFunds(amount: Cents, method: string) {
  const account = current();
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Enter an amount.");
  update(account.id, (a) => ({
    ...a,
    balances: { ...a.balances, credit: a.balances.credit + amount },
    txs: [tx("deposit", `Added funds with ${method}`, amount, 0, method), ...a.txs],
  }));
}

export function cashOut(amount: Cents, method: string): string | null {
  const account = current();
  const error = cashOutError(account.balances.withdrawable, amount);
  if (error) return error;
  update(account.id, (a) => ({
    ...a,
    balances: { ...a.balances, withdrawable: a.balances.withdrawable - amount },
    txs: [tx("cash_out", `Cash out to ${method}`, 0, -amount, method), ...a.txs],
  }));
  return null;
}
