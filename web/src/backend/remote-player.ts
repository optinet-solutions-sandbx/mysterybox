"use client";

import type { Account } from "@/store/auth";
import type { AccountStatus, AppRole } from "./contract";
import { check, rpc, sb } from "./supabase-client";

/**
 * Accounts on Supabase: who is signed in, and their profile (get_player_card). Wallets, opens and
 * credit stay with the box system (web/src/box-api) until the backend developer's API is live.
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

/** The signed-in account, or null when there is no Supabase session. */
export async function loadAccount(): Promise<Account | null> {
  const { data } = await sb().auth.getSession();
  if (!data.session) return null;
  const [card, profile] = await Promise.all([
    rpc<Row>("get_player_card"),
    sb()
      .from("profiles")
      .select("player_number")
      .eq("id", data.session.user.id)
      .single()
      .then((r) => check<Row>(r)),
  ]);
  return accountFromCard({ ...card, player_number: profile.player_number });
}

export const remotePlayer = {
  touchLastSeen: () => rpc("touch_last_seen"),
  setMarketing: async (userId: string, value: boolean) => {
    check(await sb().from("profiles").update({ marketing_opt_in: value }).eq("id", userId));
  },
};
