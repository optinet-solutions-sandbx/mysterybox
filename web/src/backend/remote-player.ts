"use client";

import type { Box, InventoryItem, InventoryStatus, Transaction } from "@/domain/types";
import type { Seeds } from "@/services/play";
import type { Account } from "@/store/auth";
import type { SessionSnapshot } from "@/store/session";
import type { AccountStatus, AppRole } from "./contract";
import { rpc, sb, check } from "./supabase-client";

/**
 * The player side on Supabase: loads the signed-in player's card, wallet, inventory, ledger and
 * seeds into the same shapes the mock stores use, and runs the player RPCs. The UI stays the same.
 */

type Row = Record<string, unknown>;

export function accountFromCard(card: Row): Account {
  const phone = (card.phone ?? {}) as Row;
  return {
    id: String(card.id),
    email: String(card.email),
    firstName: String(card.first_name ?? ""),
    lastName: String(card.last_name ?? ""),
    dial: String(phone.dial ?? "+1"),
    phone: String(phone.number ?? ""),
    passwordHash: "",
    salt: "",
    marketing: Boolean(card.marketing_opt_in),
    verified: true,
    createdAt: String(card.registered_at),
    role: card.role as AppRole,
    status: card.status as AccountStatus,
    lastSeenAt: (card.last_seen_at as string | null) ?? undefined,
    number: card.player_number == null ? undefined : Number(card.player_number),
  };
}

const inventoryStatus = (s: string): InventoryStatus => (s === "delivered" ? "shipped" : (s as InventoryStatus));

export function inventoryFromRows(rows: Row[]): InventoryItem[] {
  return rows.map((r) => {
    const o = (r.opening ?? {}) as Row;
    return {
      uid: String(r.id),
      itemId: String(r.item_id),
      boxId: String(o.box_id ?? ""),
      acquiredAt: String(r.acquired_at),
      status: inventoryStatus(String(r.status)),
      draw: { serverSeedHash: String(o.server_seed_hash ?? ""), clientSeed: String(o.client_seed ?? ""), nonce: Number(o.nonce ?? 0), roll: Number(o.roll ?? 0) },
    };
  });
}

const typeLabel: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  box_open: "Opened a box",
  sell_back: "Sold back",
  adjustment: "Balance adjustment",
  shipping_fee: "Shipping fee",
  refund: "Refund",
};

export function transactionsFromRows(rows: Row[]): Transaction[] {
  return rows.map((r) => {
    const status = String(r.status);
    return {
      id: String(r.id),
      type: (["deposit", "withdrawal", "box_open", "sell_back"].includes(String(r.type)) ? r.type : "adjustment") as Transaction["type"],
      amount: Number(r.amount_cents),
      at: String(r.created_at),
      label: String(r.note ?? typeLabel[String(r.type)] ?? r.type),
      status: status === "pending" ? "pending" : status === "completed" ? "completed" : "cancelled",
    };
  });
}

export function seedsFromRpc(r: Row): { seeds: Seeds; revealedSeeds: Seeds[] } {
  const active = r.active as Row;
  return {
    // The live server seed stays on the server; only its hash is ever sent.
    seeds: { serverSeed: "", serverSeedHash: String(active.server_seed_hash), clientSeed: String(active.client_seed), nonce: Number(active.nonce) },
    revealedSeeds: ((r.revealed ?? []) as Row[]).map((s) => ({
      serverSeed: String(s.server_seed),
      serverSeedHash: String(s.server_seed_hash),
      clientSeed: String(s.client_seed),
      nonce: Number(s.nonce),
    })),
  };
}

export async function loadMe(): Promise<{ account: Account; snapshot: SessionSnapshot } | null> {
  const { data } = await sb().auth.getSession();
  if (!data.session) return null;
  const userId = data.session.user.id;
  const [card, number, inventory, transactions, seeds] = await Promise.all([
    rpc<Row>("get_player_card"),
    sb().from("profiles").select("player_number").eq("id", userId).single().then(check<Row>),
    sb()
      .from("inventory_items")
      .select("id,item_id,status,acquired_at,opening:openings(box_id,server_seed_hash,client_seed,nonce,roll)")
      .eq("user_id", userId)
      .order("acquired_at", { ascending: false })
      .then(check<Row[]>),
    sb().from("transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200).then(check<Row[]>),
    rpc<Row>("get_my_seeds"),
  ]);
  const account = accountFromCard({ ...card, player_number: number.player_number });
  const wallet = card.wallet as Row;
  return {
    account,
    snapshot: {
      balance: Number(wallet.balance_cents),
      held: Number(wallet.held_cents),
      inventory: inventoryFromRows(inventory),
      transactions: transactionsFromRows(transactions),
      ...seedsFromRpc(seeds),
    },
  };
}

export const remotePlayer = {
  deposit: (amount: number) => rpc("request_deposit", { p_amount_cents: amount }),
  requestWithdrawal: (amount: number) => rpc("request_withdrawal", { p_amount_cents: amount }),
  cancelWithdrawal: (id: string) => rpc("cancel_withdrawal", { p_transaction_id: id }),
  openBox: (box: Box) => rpc<Row>("open_box", { p_box_id: box.id }),
  sellBack: (ids: string[]) => rpc<Row>("sell_back", { p_inventory_ids: ids }),
  requestShipping: (id: string) => rpc("request_shipping", { p_inventory_id: id, p_address: {} }),
  cancelShipping: (id: string) => rpc("cancel_shipping", { p_inventory_id: id }),
  setClientSeed: (seed: string) => rpc<Row>("set_client_seed", { p_client_seed: seed }),
  rotateSeeds: () => rpc<Row>("rotate_seeds"),
  touchLastSeen: () => rpc("touch_last_seen"),
  setMarketing: async (userId: string, value: boolean) => {
    check(await sb().from("profiles").update({ marketing_opt_in: value }).eq("id", userId));
  },
};
