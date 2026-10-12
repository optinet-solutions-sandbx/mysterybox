"use client";

import { useState, type FormEvent } from "react";
import { Check, Minus, ShieldCheck } from "lucide-react";
import { PERMISSIONS, ROLE_LABEL, type AppRole, type Permission } from "@/backend/contract";
import { isValidEmail } from "@/domain/auth";
import { randomHex } from "@/domain/fair";
import { Field } from "@/components/auth/fields";
import { Button } from "@/components/ui/button";
import { useAuth, useCurrentUser } from "@/store/auth";
import { addStaff, clearTestData, setRole, type StaffActionResult } from "@/store/staff-actions";
import { Panel, PageTitle, RoleBadge, StatusBadge, formatDate } from "./ui";

const ROLES: AppRole[] = ["player", "admin", "super_admin"];

const PERMISSION_LABEL: Record<Permission, string> = {
  play: "Open boxes, deposit and withdraw",
  "backoffice.view": "See the back office dashboard",
  "players.view": "See every player's card and activity",
  "players.suspend": "Lock, suspend and reactivate players",
  "players.notes": "Comment on and tag players",
  "payments.settle": "Pay out or cancel withdrawals",
  "catalog.manage": "Manage boxes, items and odds",
  "staff.manage": "Add staff and change roles",
  "wallet.adjust": "Adjust a player's balance",
  "audit.view": "Read the audit log",
  "settings.edit": "Change economy settings",
};

const ERRORS: Record<Exclude<StaffActionResult, { ok: true }>["error"], string> = {
  forbidden: "Only a super admin can do that.",
  cannot_change_self: "You can't change your own role. Ask another super admin.",
  last_super_admin: "There must always be at least one super admin.",
  not_found: "That account no longer exists.",
  exists: "An account already uses that email.",
  not_pending: "Nothing to settle.",
};

export function StaffView() {
  const me = useCurrentUser();
  const accounts = useAuth((s) => s.accounts);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const all = Object.values(accounts).filter((a) => a.verified);
  const staff = all.filter((a) => a.role !== "player").sort((a, b) => a.role.localeCompare(b.role) || a.email.localeCompare(b.email));
  const players = all.filter((a) => a.role === "player");

  function change(email: string, role: AppRole) {
    const res = setRole(email, role);
    setMessage(res.ok ? { tone: "ok", text: `${email} is now ${ROLE_LABEL[role].toLowerCase()}.` } : { tone: "error", text: ERRORS[res.error] });
  }

  return (
    <>
      <PageTitle
        icon={ShieldCheck}
        title="Staff & roles"
        intro="Three roles. Players are customers. Admins run the day to day. Super admins also manage staff, balances, settings and the audit log. The database enforces the same rules."
      />

      <Panel title="What each role can do">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-line">
                <th scope="col" className="px-5 py-3 text-left font-semibold">Permission</th>
                {ROLES.map((r) => (
                  <th key={r} scope="col" className="px-5 py-3 text-center font-semibold">
                    <RoleBadge role={r} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(Object.keys(PERMISSIONS) as Permission[]).map((perm) => (
                <tr key={perm}>
                  <th scope="row" className="px-5 py-2.5 text-left font-medium">{PERMISSION_LABEL[perm]}</th>
                  {ROLES.map((r) => (
                    <td key={r} className="px-5 py-2.5 text-center">
                      {(PERMISSIONS[perm] as readonly AppRole[]).includes(r) ? (
                        <Check className="mx-auto size-4 text-success" aria-label="Yes" strokeWidth={2.5} />
                      ) : (
                        <Minus className="mx-auto size-4 text-subtle" aria-label="No" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <p role="status" className={`mt-6 min-h-5 text-sm font-semibold ${message?.tone === "error" ? "text-danger" : "text-success"}`}>
        {message?.text}
      </p>

      <div className="mt-2 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title={`Staff (${staff.length})`}>
          <ul className="divide-y divide-line">
            {staff.map((a) => (
              <li key={a.email} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {a.firstName} {a.lastName} {a.email === me?.email && <span className="text-xs font-semibold text-muted">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {a.email} · last seen {formatDate(a.lastSeenAt)}
                  </p>
                </div>
                <StatusBadge status={a.status} />
                <RoleSelect value={a.role} disabled={a.email === me?.email} onChange={(r) => change(a.email, r)} label={`Role for ${a.email}`} />
              </li>
            ))}
          </ul>
        </Panel>

        <div className="grid content-start gap-6">
          <AddStaff onDone={setMessage} />
          <Panel title="Promote a player">
            {players.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No player accounts in this browser yet. Register one on the site first.</p>
            ) : (
              <ul className="divide-y divide-line">
                {players.map((a) => (
                  <li key={a.email} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {a.firstName} {a.lastName}
                      </p>
                      <p className="truncate text-xs text-muted">{a.email}</p>
                    </div>
                    <RoleSelect value="player" onChange={(r) => change(a.email, r)} label={`Role for ${a.email}`} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <ClearTestData players={players.length} onDone={setMessage} />
        </div>
      </div>
    </>
  );
}

/** Wipes this browser's player accounts and activity so a test run starts fresh (staff stay). */
function ClearTestData({ players, onDone }: { players: number; onDone: (m: { tone: "ok" | "error"; text: string }) => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Panel title="Test data in this browser">
      <div className="grid gap-3 p-5 text-sm">
        <p className="leading-relaxed text-muted">
          Start a test run fresh: deletes every player account in this browser with its wallet, pieces and history, and empties
          the audit log. Staff accounts stay.
        </p>
        {confirming ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-danger/50 p-3">
            <span className="font-semibold">
              Delete {players} player {players === 1 ? "account" : "accounts"}?
            </span>
            <Button
              size="sm"
              onClick={() => {
                const res = clearTestData();
                setConfirming(false);
                onDone(res.ok ? { tone: "ok", text: `Cleared ${res.removed ?? 0} player accounts. The back office starts fresh.` } : { tone: "error", text: ERRORS[res.error] });
              }}
            >
              Delete test data
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
              Keep it
            </Button>
          </div>
        ) : (
          <Button variant="secondary" size="sm" className="justify-self-start" onClick={() => setConfirming(true)}>
            Clear test data
          </Button>
        )}
      </div>
    </Panel>
  );
}

function RoleSelect({ value, onChange, disabled, label }: { value: AppRole; onChange: (r: AppRole) => void; disabled?: boolean; label: string }) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as AppRole)}
      className="h-9 rounded-pill border border-line bg-surface px-3 text-sm font-semibold disabled:opacity-50"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABEL[r]}
        </option>
      ))}
    </select>
  );
}

function AddStaff({ onDone }: { onDone: (m: { tone: "ok" | "error"; text: string }) => void }) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRoleValue] = useState<AppRole>("admin");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!first.trim() || !last.trim() || !isValidEmail(email)) {
      onDone({ tone: "error", text: "Enter a first name, last name and a valid work email." });
      return;
    }
    setBusy(true);
    const password = `gn-${randomHex(4)}`;
    const res = await addStaff({ email, firstName: first, lastName: last, role, password });
    setBusy(false);
    if (!res.ok) return onDone({ tone: "error", text: ERRORS[res.error] });
    onDone({ tone: "ok", text: `${email} added as ${ROLE_LABEL[role].toLowerCase()}. Temporary password: ${password}` });
    setFirst("");
    setLast("");
    setEmail("");
  }

  return (
    <Panel title="Add a staff member">
      <form onSubmit={submit} noValidate className="grid gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" value={first} onChange={(e) => setFirst(e.target.value)} />
          <Field label="Last name" value={last} onChange={(e) => setLast(e.target.value)} />
        </div>
        <Field label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="text-sm font-semibold">
            Role
            <select
              value={role}
              onChange={(e) => setRoleValue(e.target.value as AppRole)}
              className="mt-1.5 block h-11 rounded-xl border border-line bg-surface px-3 text-sm font-semibold"
            >
              <option value="admin">{ROLE_LABEL.admin}</option>
              <option value="super_admin">{ROLE_LABEL.super_admin}</option>
            </select>
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? "Adding…" : "Add staff member"}
          </Button>
        </div>
        <p className="text-xs text-muted">They get a temporary password to change at first sign-in (with Supabase: an invite email).</p>
      </form>
    </Panel>
  );
}
