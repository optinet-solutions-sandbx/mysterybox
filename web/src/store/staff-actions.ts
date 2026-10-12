"use client";

import { can, type AccountStatus, type AppRole } from "@/backend/contract";
import { useAuth, type Account } from "./auth";
import { useBackoffice, type PlayerLock } from "./backoffice";
import { useLedgers } from "./ledgers";

/**
 * Back-office actions for the mock, with the same rules the SQL functions enforce
 * (supabase/migrations/20261012120300_backoffice.sql). Every successful action is audited.
 */

export type StaffActionResult =
  | { ok: true }
  | { ok: false; error: "forbidden" | "cannot_change_self" | "last_super_admin" | "not_found" | "exists" | "not_pending" };

function actor(): Account | null {
  const { currentEmail, accounts } = useAuth.getState();
  return currentEmail ? accounts[currentEmail] ?? null : null;
}

function audit(by: Account, action: string, targetType: string, targetId: string, detail: Record<string, unknown> = {}) {
  useBackoffice.getState().log({ actorId: by.id, actorRole: by.role, action, targetType, targetId, detail: { by: by.email, ...detail } });
}

type PlayerRef = { id: string; email?: string; name: string };

/** Writes a status after the same checks as admin_set_player_status. */
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

/** Suspend / reactivate a player. Browser accounts carry `email`; generated demo players don't. */
export function setPlayerStatus(player: PlayerRef, status: AccountStatus, from: AccountStatus): StaffActionResult {
  const by = actor();
  if (!by || !can(by.role, "players.suspend")) return { ok: false, error: "forbidden" };
  const res = applyStatus(by, player, status);
  if (res.ok) audit(by, "player.status", "profile", player.id, { player: player.name, from, to: status });
  return res;
}

/** Status that follows from the active locks: self-exclusion wins, then a staff lock. */
function statusFromLocks(locks: PlayerLock[]): AccountStatus {
  const active = locks.filter((l) => !l.removedAt);
  return active.some((l) => l.type === "sb") ? "self_excluded" : active.some((l) => l.type === "cs") ? "suspended" : "active";
}

/** Adds a CS (staff) lock or an SB (self-exclusion) lock; the account status follows. */
export function lockPlayer(player: PlayerRef, type: PlayerLock["type"], reason: string, comment: string): StaffActionResult {
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

export function unlockPlayer(player: PlayerRef, lockId: string): StaffActionResult {
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

/** Staff notes on the player card. */
export function addComment(player: PlayerRef, text: string): StaffActionResult {
  const by = actor();
  if (!by || !can(by.role, "players.notes")) return { ok: false, error: "forbidden" };
  useBackoffice.getState().addComment(player.id, by.email, text.trim());
  audit(by, "player.comment", "profile", player.id, { player: player.name });
  return { ok: true };
}

/** Manual tags (the system adds its own automatically; see domain/player-insights.ts). */
export function setPlayerTags(player: PlayerRef, tags: string[]): StaffActionResult {
  const by = actor();
  if (!by || !can(by.role, "players.notes")) return { ok: false, error: "forbidden" };
  const before = useBackoffice.getState().tags[player.id] ?? [];
  useBackoffice.getState().setTags(player.id, tags);
  audit(by, "player.tags", "profile", player.id, { player: player.name, from: before.join(", ") || "none", to: tags.join(", ") || "none" });
  return { ok: true };
}

/** Super admin only; never your own role, and never the last super admin. */
export function setRole(email: string, role: AppRole): StaffActionResult {
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

/** Super admin only: creates a verified staff account with a temporary password. */
export async function addStaff(input: { email: string; firstName: string; lastName: string; role: AppRole; password: string }): Promise<StaffActionResult> {
  const by = actor();
  if (!by || !can(by.role, "staff.manage")) return { ok: false, error: "forbidden" };
  const created = await useAuth.getState().addAccount(input);
  if (!created) return { ok: false, error: "exists" };
  const account = useAuth.getState().accounts[input.email.trim().toLowerCase()];
  audit(by, "staff.create", "profile", account.id, { account: account.email, role: input.role });
  return { ok: true };
}

/** Pay out or cancel a browser account's pending withdrawal (demo players' are read-only). */
export function settleWithdrawal(email: string, transactionId: string, outcome: "completed" | "cancelled"): StaffActionResult {
  const by = actor();
  if (!by || !can(by.role, "payments.settle")) return { ok: false, error: "forbidden" };
  if (!useLedgers.getState().settleWithdrawal(email, transactionId, outcome)) return { ok: false, error: "not_pending" };
  audit(by, "transaction.settle", "transaction", transactionId, { account: email, outcome });
  return { ok: true };
}

/** Super admin only: wipes every player account in this browser and its activity, plus the audit
 * log, so testing starts fresh. Staff accounts stay. Logged as the first entry of the new log. */
export function clearTestData(): StaffActionResult & { removed?: number } {
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
