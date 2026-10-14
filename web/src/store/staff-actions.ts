"use client";

import { isSupabase } from "@/backend/config";
import { BackendError, can, type AccountStatus, type AppRole } from "@/backend/contract";
import { reloadBackoffice, useRemoteBackoffice } from "@/backend/remote-admin";
import { accessToken, rpc } from "@/backend/supabase-client";
import { useAuth, type Account } from "./auth";
import { useBackoffice, type PlayerLock } from "./backoffice";
import { useLedgers } from "./ledgers";

/**
 * Back-office actions. With Supabase each one calls its SQL function (which enforces the role
 * rules and writes the audit log) and reloads the back office. The mock applies the same rules
 * to this browser's data and audits them itself.
 */

export type StaffActionError = "forbidden" | "cannot_change_self" | "last_super_admin" | "not_found" | "exists" | "not_pending" | "unavailable";
export type StaffActionResult = { ok: true } | { ok: false; error: StaffActionError };

type PlayerRef = { id: string; email?: string; name: string };

function actor(): Account | null {
  const { currentEmail, accounts } = useAuth.getState();
  return currentEmail ? (accounts[currentEmail] ?? null) : null;
}

function audit(by: Account, action: string, targetType: string, targetId: string, detail: Record<string, unknown> = {}) {
  useBackoffice.getState().log({ actorId: by.id, actorRole: by.role, action, targetType, targetId, detail: { by: by.email, ...detail } });
}

/** Runs a Supabase call, reloads, and maps the SQL error codes to the UI's. */
async function remote(call: () => Promise<unknown>): Promise<StaffActionResult> {
  try {
    await call();
    await reloadBackoffice();
    return { ok: true };
  } catch (e) {
    const code = e instanceof BackendError ? e.code : "unknown";
    console.error("[backend]", e);
    if (code === "cannot_change_self" || code === "last_super_admin" || code === "forbidden") return { ok: false, error: code };
    if (code === "player_not_found" || code === "lock_not_found") return { ok: false, error: "not_found" };
    if (code === "transaction_not_pending") return { ok: false, error: "not_pending" };
    return { ok: false, error: "forbidden" };
  }
}

/** Writes a status after the same checks as admin_set_player_status (mock only). */
function applyStatus(by: Account, player: PlayerRef, status: AccountStatus): StaffActionResult {
  if (player.email) {
    const target = useAuth.getState().accounts[player.email];
    if (!target) return { ok: false, error: "not_found" };
    if (target.email === by.email) return { ok: false, error: "cannot_change_self" };
    if (target.role !== "player" && by.role !== "super_admin") return { ok: false, error: "forbidden" };
    useAuth.getState().patchAccount(target.email, { status });
  } else {
    useBackoffice.getState().setDemoStatus(player.id, status);
  }
  return { ok: true };
}

/** Suspend / reactivate a player. */
export async function setPlayerStatus(player: PlayerRef, status: AccountStatus, from: AccountStatus): Promise<StaffActionResult> {
  if (isSupabase) return remote(() => rpc("admin_set_player_status", { p_user_id: player.id, p_status: status, p_reason: null }));
  const by = actor();
  if (!by || !can(by.role, "players.suspend")) return { ok: false, error: "forbidden" };
  const res = applyStatus(by, player, status);
  if (res.ok) audit(by, "player.status", "profile", player.id, { player: player.name, from, to: status });
  return res;
}

/** Status that follows from the active locks: self-exclusion wins, then a staff lock (mirrors _status_from_locks). */
function statusFromLocks(locks: PlayerLock[]): AccountStatus {
  const active = locks.filter((l) => !l.removedAt);
  return active.some((l) => l.type === "sb") ? "self_excluded" : active.some((l) => l.type === "cs") ? "suspended" : "active";
}

/** Adds a CS (staff) lock or an SB (self-exclusion) lock; the account status follows. */
export async function lockPlayer(player: PlayerRef, type: PlayerLock["type"], reason: string, comment: string): Promise<StaffActionResult> {
  if (isSupabase) return remote(() => rpc("admin_lock_player", { p_player_id: player.id, p_type: type, p_reason: reason, p_comment: comment }));
  const by = actor();
  if (!by || !can(by.role, "players.suspend")) return { ok: false, error: "forbidden" };
  const existing = useBackoffice.getState().locks[player.id] ?? [];
  const next = statusFromLocks([...existing, { id: "new", type, reason, comment, createdAt: "", by: by.email }]);
  const res = applyStatus(by, player, next);
  if (!res.ok) return res;
  const lock = useBackoffice.getState().addLock(player.id, { type, reason, comment, by: by.email });
  audit(by, "player.lock", "profile", player.id, { player: player.name, lock: type.toUpperCase(), reason, comment, lock_id: lock.id });
  return { ok: true };
}

export async function unlockPlayer(player: PlayerRef, lockId: string): Promise<StaffActionResult> {
  if (isSupabase) return remote(() => rpc("admin_unlock_player", { p_lock_id: Number(lockId) }));
  const by = actor();
  if (!by || !can(by.role, "players.suspend")) return { ok: false, error: "forbidden" };
  const locks = useBackoffice.getState().locks[player.id] ?? [];
  const lock = locks.find((l) => l.id === lockId && !l.removedAt);
  if (!lock) return { ok: false, error: "not_found" };
  const res = applyStatus(by, player, statusFromLocks(locks.filter((l) => l.id !== lockId)));
  if (!res.ok) return res;
  useBackoffice.getState().removeLock(player.id, lockId, by.email);
  audit(by, "player.unlock", "profile", player.id, { player: player.name, lock: lock.type.toUpperCase(), reason: lock.reason });
  return { ok: true };
}

/** Staff notes on the player page. */
export async function addComment(player: PlayerRef, text: string): Promise<StaffActionResult> {
  if (isSupabase) return remote(() => rpc("admin_add_comment", { p_player_id: player.id, p_body: text.trim() }));
  const by = actor();
  if (!by || !can(by.role, "players.notes")) return { ok: false, error: "forbidden" };
  useBackoffice.getState().addComment(player.id, by.email, text.trim());
  audit(by, "player.comment", "profile", player.id, { player: player.name });
  return { ok: true };
}

/** Manual tags (automatic ones are computed; see domain/player-insights.ts). */
export async function setPlayerTags(player: PlayerRef, tags: string[]): Promise<StaffActionResult> {
  if (isSupabase) return remote(() => rpc("admin_set_tags", { p_player_id: player.id, p_tags: tags }));
  const by = actor();
  if (!by || !can(by.role, "players.notes")) return { ok: false, error: "forbidden" };
  const before = useBackoffice.getState().tags[player.id] ?? [];
  useBackoffice.getState().setTags(player.id, tags);
  audit(by, "player.tags", "profile", player.id, { player: player.name, from: before.join(", ") || "none", to: tags.join(", ") || "none" });
  return { ok: true };
}

/** Super admin only; never your own role, and never the last super admin. */
export async function setRole(email: string, role: AppRole): Promise<StaffActionResult> {
  if (isSupabase) {
    const { staff, players } = useRemoteBackoffice.getState();
    const target = staff.find((s) => s.email === email) ?? players.find((p) => p.email === email);
    if (!target) return { ok: false, error: "not_found" };
    return remote(() => rpc("admin_set_role", { p_user_id: target.id, p_role: role }));
  }
  const by = actor();
  if (!by || !can(by.role, "staff.manage")) return { ok: false, error: "forbidden" };
  const { accounts } = useAuth.getState();
  const target = accounts[email];
  if (!target) return { ok: false, error: "not_found" };
  if (target.email === by.email) return { ok: false, error: "cannot_change_self" };
  const superAdmins = Object.values(accounts).filter((a) => a.role === "super_admin").length;
  if (target.role === "super_admin" && role !== "super_admin" && superAdmins <= 1) return { ok: false, error: "last_super_admin" };
  useAuth.getState().patchAccount(email, { role });
  audit(by, "role.change", "profile", target.id, { account: target.email, from: target.role, to: role });
  return { ok: true };
}

/** Super admin only: a verified staff account with a temporary password (Supabase: via /api/admin/staff). */
export async function addStaff(input: { email: string; firstName: string; lastName: string; role: AppRole; password: string }): Promise<StaffActionResult> {
  if (isSupabase) {
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${await accessToken()}` },
        body: JSON.stringify(input),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) return { ok: false, error: body.error === "exists" ? "exists" : body.error === "unavailable" ? "unavailable" : "forbidden" };
      await reloadBackoffice();
      return { ok: true };
    } catch (e) {
      console.error("[backend]", e);
      return { ok: false, error: "unavailable" };
    }
  }
  const by = actor();
  if (!by || !can(by.role, "staff.manage")) return { ok: false, error: "forbidden" };
  const created = await useAuth.getState().addAccount(input);
  if (!created) return { ok: false, error: "exists" };
  const account = useAuth.getState().accounts[input.email.trim().toLowerCase()];
  audit(by, "staff.create", "profile", account.id, { account: account.email, role: input.role });
  return { ok: true };
}

/** Pay out or cancel a pending withdrawal (accounts used in this browser; demo players are read-only). */
export async function settleWithdrawal(email: string, transactionId: string, outcome: "completed" | "cancelled"): Promise<StaffActionResult> {
  // Wallets stay in the box system's per-account storage (both modes) until the kit's API is live.
  const by = actor();
  if (!by || !can(by.role, "payments.settle")) return { ok: false, error: "forbidden" };
  if (!useLedgers.getState().settleWithdrawal(email, transactionId, outcome)) return { ok: false, error: "not_pending" };
  audit(by, "transaction.settle", "transaction", transactionId, { account: email, outcome });
  return { ok: true };
}

/** Super admin, mock only: wipes this browser's player accounts and activity and the audit log. */
export async function clearTestData(): Promise<StaffActionResult & { removed?: number }> {
  if (isSupabase) return { ok: false, error: "unavailable" };
  const by = actor();
  if (!by || !can(by.role, "settings.edit")) return { ok: false, error: "forbidden" };
  const players = Object.values(useAuth.getState().accounts)
    .filter((a) => a.role === "player")
    .map((a) => a.email);
  useAuth.getState().removeAccounts(players);
  useLedgers.getState().remove(players);
  useBackoffice.getState().clear();
  audit(by, "testdata.clear", "browser", "local", { players_removed: players.length });
  return { ok: true, removed: players.length };
}
