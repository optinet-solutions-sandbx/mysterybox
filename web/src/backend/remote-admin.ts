"use client";

import { create } from "zustand";
import type { MoneyEvent, PlayerRecord } from "@/domain/analytics";
import type { Account } from "@/store/auth";
import type { PlayerComment, PlayerLock } from "@/store/backoffice";
import { useBackoffice } from "@/store/backoffice";
import type { AccountStatus, AppRole, AuditEntry, KycStatus } from "./contract";
import { check, sb } from "./supabase-client";

/**
 * The back office on Supabase. Staff RLS lets admins read every player, so this loads the whole
 * picture (overview, openings, ledger, locks, tags, comments, staff, audit) into the shapes the
 * mock produces (PlayerRecord etc.); every screen and calculation stays the same.
 * Fine for launch-scale data; move the heavy lifting to the SQL views (admin_kpis, …) as it grows.
 */

type Row = Record<string, unknown>;
const str = (v: unknown) => (v == null ? null : String(v));

const moneyType = (t: string): MoneyEvent["type"] | null =>
  t === "deposit" || t === "withdrawal" || t === "sell_back" || t === "adjustment" ? t : null;
const moneyStatus = (s: string): MoneyEvent["status"] => (s === "pending" ? "pending" : s === "completed" ? "completed" : "cancelled");

export function playersFromRows(overview: Row[], openings: Row[], transactions: Row[], wallets: Row[]): PlayerRecord[] {
  const held = new Map(wallets.map((w) => [String(w.user_id), Number(w.held_cents ?? 0)]));
  return overview.map((r) => {
    const id = String(r.id);
    return {
      id,
      number: r.player_number == null ? undefined : Number(r.player_number),
      email: String(r.email),
      firstName: String(r.first_name ?? ""),
      lastName: String(r.last_name ?? ""),
      phoneDial: str(r.phone_dial),
      phoneNumber: str(r.phone_number),
      state: str(r.state),
      status: r.status as AccountStatus,
      kycStatus: r.kyc_status as KycStatus,
      marketingOptIn: Boolean(r.marketing_opt_in),
      registeredAt: String(r.registered_at),
      lastSeenAt: str(r.last_seen_at),
      balanceCents: Number(r.balance_cents ?? 0),
      heldCents: held.get(id) ?? 0,
      plays: openings
        .filter((o) => o.user_id === id)
        .map((o) => ({
          at: String(o.created_at),
          boxId: String(o.box_id),
          priceCents: Number(o.price_cents),
          itemId: String(o.item_id),
          valueCents: Number(o.item_value_cents),
        }))
        .sort((a, b) => a.at.localeCompare(b.at)),
      money: transactions
        .filter((t) => t.user_id === id && moneyType(String(t.type)))
        .map((t) => ({
          id: String(t.id),
          at: String(t.created_at),
          type: moneyType(String(t.type))!,
          amountCents: Number(t.amount_cents),
          status: moneyStatus(String(t.status)),
        }))
        .sort((a, b) => a.at.localeCompare(b.at)),
      source: "live",
    };
  });
}

function groupBy<T>(rows: Row[], key: string, map: (r: Row) => T): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const r of rows) (out[String(r[key])] ??= []).push(map(r));
  return out;
}

const emailOf = (r: Row, alias: string) => String(((r[alias] ?? {}) as Row).email ?? "staff");

interface RemoteBackoffice {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  players: PlayerRecord[];
  staff: Account[];
  load(): Promise<void>;
}

export const useRemoteBackoffice = create<RemoteBackoffice>()((set, get) => ({
  loaded: false,
  loading: false,
  error: null,
  players: [],
  staff: [],
  async load() {
    if (get().loading) return;
    set({ loading: true });
    try {
      const q = <T,>(p: PromiseLike<{ data: unknown; error: { message?: string } | null }>) => Promise.resolve(p).then((r) => check<T>(r));
      const [overview, openings, transactions, wallets, locks, tags, comments, staff, audit] = await Promise.all([
        q<Row[]>(sb().from("admin_player_overview").select("*").order("registered_at", { ascending: false })),
        q<Row[]>(sb().from("openings").select("user_id,box_id,item_id,price_cents,item_value_cents,created_at").order("created_at").limit(20000)),
        q<Row[]>(sb().from("transactions").select("id,user_id,type,status,amount_cents,created_at").order("created_at").limit(20000)),
        q<Row[]>(sb().from("wallets").select("user_id,held_cents")),
        q<Row[]>(sb().from("player_locks").select("*,creator:profiles!player_locks_created_by_fkey(email),remover:profiles!player_locks_removed_by_fkey(email)").order("created_at", { ascending: false })),
        q<Row[]>(sb().from("player_tags").select("player_id,tag").order("added_at")),
        q<Row[]>(sb().from("player_comments").select("*,author:profiles!player_comments_author_id_fkey(email)").order("created_at", { ascending: false })),
        q<Row[]>(sb().from("admin_staff").select("*")),
        // Super admins only (RLS returns nothing to admins).
        q<Row[]>(sb().from("audit_log").select("*,actor:profiles!audit_log_actor_id_fkey(email)").order("created_at", { ascending: false }).limit(500)),
      ]);

      useBackoffice.setState({
        locks: groupBy<PlayerLock>(locks, "player_id", (r) => ({
          id: String(r.id),
          type: r.type as PlayerLock["type"],
          reason: String(r.reason),
          comment: String(r.comment ?? ""),
          createdAt: String(r.created_at),
          by: emailOf(r, "creator"),
          removedAt: (r.removed_at as string | null) ?? undefined,
          removedBy: r.removed_at ? emailOf(r, "remover") : undefined,
        })),
        tags: Object.fromEntries(Object.entries(groupBy(tags, "player_id", (r) => String(r.tag)))),
        comments: groupBy<PlayerComment>(comments, "player_id", (r) => ({
          id: String(r.id),
          at: String(r.created_at),
          by: emailOf(r, "author"),
          text: String(r.body),
        })),
        audit: audit.map(
          (r): AuditEntry => ({
            id: String(r.id),
            actorId: str(r.actor_id),
            actorRole: (r.actor_role as AppRole | null) ?? null,
            action: String(r.action),
            targetType: str(r.target_type),
            targetId: str(r.target_id),
            detail: { by: emailOf(r, "actor"), ...((r.detail ?? {}) as Record<string, unknown>) },
            createdAt: String(r.created_at),
          }),
        ),
      });

      set({
        loaded: true,
        loading: false,
        error: null,
        players: playersFromRows(overview, openings, transactions, wallets),
        staff: staff.map(
          (r): Account => ({
            id: String(r.id),
            email: String(r.email),
            firstName: String(r.first_name ?? ""),
            lastName: String(r.last_name ?? ""),
            dial: "+1",
            phone: "",
            passwordHash: "",
            salt: "",
            marketing: false,
            verified: true,
            createdAt: String(r.granted_at),
            role: r.role as AppRole,
            status: r.status as AccountStatus,
            lastSeenAt: (r.last_seen_at as string | null) ?? undefined,
          }),
        ),
      });
    } catch (e) {
      console.error("[backend]", e);
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },
}));

export const reloadBackoffice = () => useRemoteBackoffice.getState().load();
