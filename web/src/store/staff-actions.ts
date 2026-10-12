"use client";

import { can, type AccountStatus, type AppRole } from "@/backend/contract";
import { useAuth, type Account } from "./auth";
import { useBackoffice } from "./backoffice";
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

/** Suspend / reactivate a player. Browser accounts carry `email`; generated demo players don't. */
export function setPlayerStatus(
  player: { id: string; email?: string; name: string },
  status: AccountStatus,
  from: AccountStatus,
): StaffActionResult {
  const by = actor();
  if (!by || !can(by.role, "players.suspend")) return { ok: false, error: "forbidden" };
  if (player.email) {
    const target = useAuth.getState().accounts[player.email];
    if (!target) return { ok: false, error: "not_found" };
    if (target.email === by.email) return { ok: false, error: "cannot_change_self" };
    if (target.role !== "player" && by.role !== "super_admin") return { ok: false, error: "forbidden" };
    useAuth.getState().patchAccount(target.email, { status });
  } else {
    useBackoffice.getState().setDemoStatus(player.id, status);
  }
  audit(by, "player.status", "profile", player.id, { player: player.name, from, to: status });
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
