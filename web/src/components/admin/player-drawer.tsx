"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { can } from "@/backend/contract";
import { formatPhoneInput } from "@/domain/auth";
import { formatUsd } from "@/domain/money";
import { overviewRow, type PlayerRecord } from "@/domain/analytics";
import { getBox, getItem } from "@/services/catalog";
import { useDialog } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/store/auth";
import { setPlayerStatus, settleWithdrawal } from "@/store/staff-actions";
import { SourceBadge, StatusBadge, formatDate, formatDateTime } from "./ui";

const kycLabel = { not_started: "Not started", pending: "In review", verified: "Verified", rejected: "Rejected" } as const;

/** The player card, back-office view (get_player_card + the player's ledger). */
export function PlayerDrawer({ player, onClose }: { player: PlayerRecord | null; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  useDialog(!!player, onClose, panel);

  return (
    <AnimatePresence>
      {player && (
        <motion.div className="fixed inset-0 z-50 flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Close player card" className="absolute inset-0 bg-[rgb(0_0_0/0.55)]" onClick={onClose} />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="player-card-title"
            tabIndex={-1}
            className="relative h-full w-full max-w-xl overflow-y-auto border-l border-line bg-bg outline-none"
            initial={reduce ? false : { x: 40 }}
            animate={{ x: 0 }}
            exit={reduce ? undefined : { x: 40 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            data-lenis-prevent
          >
            <PlayerCard player={player} onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PlayerCard({ player: p, onClose }: { player: PlayerRecord; onClose: () => void }) {
  const staff = useCurrentUser();
  const [message, setMessage] = useState<string | null>(null);
  const row = overviewRow(p);
  const name = `${p.firstName} ${p.lastName}`;
  const pending = p.money.filter((m) => m.type === "withdrawal" && m.status === "pending");
  const activity = [
    ...p.plays.map((o) => ({ at: o.at, key: `o-${o.at}-${o.itemId}`, label: `Opened ${getBox(o.boxId)?.name ?? o.boxId}`, detail: `${getItem(o.itemId).name} · worth ${formatUsd(o.valueCents)}`, amount: -o.priceCents })),
    ...p.money.map((m) => ({
      at: m.at,
      key: m.id,
      label: { deposit: "Deposit", withdrawal: "Withdrawal", sell_back: "Sold back", adjustment: "Adjustment" }[m.type],
      detail: m.status === "completed" ? "" : m.status === "pending" ? "Pending" : "Cancelled",
      amount: m.amountCents,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 30);

  const suspend = p.status === "active";
  function toggleStatus() {
    const res = setPlayerStatus({ id: p.id, email: p.source === "browser" ? p.email : undefined, name }, suspend ? "suspended" : "active", p.status);
    setMessage(res.ok ? (suspend ? `${name} is suspended and can't sign in or play.` : `${name} is active again.`) : "You don't have permission to do that.");
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="player-card-title" className="font-display text-2xl font-semibold">
            {name}
          </h2>
          <p className="mt-1 truncate text-sm text-muted">
            {p.email}
            {p.source === "browser" && <SourceBadge />}
          </p>
          <div className="mt-2">
            <StatusBadge status={p.status} />
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-muted hover:text-fg" data-autofocus>
          <X className="size-4" />
        </button>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
        <Stat label="Opened" value={String(row.openings)} />
        <Stat label="Played" value={formatUsd(row.playedCents)} />
        <Stat label="Earned" value={formatUsd(row.earnedCents)} />
        <Stat label="House net" value={formatUsd(row.houseNetCents)} danger={row.houseNetCents < 0} />
        <Stat label="Deposited" value={formatUsd(row.depositsCents)} />
        <Stat label="Withdrawn" value={formatUsd(row.withdrawalsCents)} />
        <Stat label="Sold back" value={formatUsd(row.soldBackCents)} />
        <Stat label="Balance" value={formatUsd(p.balanceCents)} note={p.heldCents ? `${formatUsd(p.heldCents)} held` : undefined} />
      </dl>

      <dl className="mt-6 divide-y divide-line border-y border-line text-sm">
        <Line label="Registered">{formatDateTime(p.registeredAt)}</Line>
        <Line label="First played">{row.firstPlayedAt ? formatDateTime(row.firstPlayedAt) : "Not yet"}</Line>
        <Line label="Last seen">{formatDateTime(p.lastSeenAt)}</Line>
        <Line label="Phone">{p.phoneNumber ? `${p.phoneDial ?? ""} ${formatPhoneInput(p.phoneDial ?? "+1", p.phoneNumber)}` : "—"}</Line>
        <Line label="State">{p.state ?? "—"}</Line>
        <Line label="Identity check">{kycLabel[p.kycStatus]}</Line>
        <Line label="Marketing">{p.marketingOptIn ? "Opted in" : "Opted out"}</Line>
      </dl>

      {can(staff?.role, "players.suspend") && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button variant={suspend ? "secondary" : "primary"} size="sm" onClick={toggleStatus}>
            {suspend ? "Suspend player" : "Reactivate player"}
          </Button>
          {p.source === "browser" && can(staff?.role, "staff.manage") && (
            <Link href="/admin/staff" className="text-sm font-semibold text-accent underline-offset-4 hover:underline">
              Change role
            </Link>
          )}
        </div>
      )}
      <p role="status" className="mt-2 min-h-5 text-sm font-medium text-success">
        {message}
      </p>

      {pending.length > 0 && (
        <section className="mt-4 rounded-2xl border border-accent/40 bg-accent-soft p-4">
          <h3 className="text-sm font-semibold">Withdrawals waiting</h3>
          <ul className="mt-3 grid gap-3">
            {pending.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>
                  <span className="font-semibold tabular">{formatUsd(-m.amountCents)}</span>
                  <span className="ml-2 text-muted">requested {formatDate(m.at)}</span>
                </span>
                {p.source === "browser" ? (
                  <span className="flex gap-2">
                    <Button size="sm" onClick={() => setMessage(settleWithdrawal(p.email, m.id, "completed").ok ? "Withdrawal marked as paid." : "Couldn't settle it.")}>
                      Mark paid
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setMessage(settleWithdrawal(p.email, m.id, "cancelled").ok ? "Withdrawal cancelled; funds returned." : "Couldn't settle it.")}>
                      Cancel
                    </Button>
                  </span>
                ) : (
                  <span className="text-xs text-muted">Sample data (read-only)</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h3 className="text-sm font-semibold">Recent activity</h3>
        {activity.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Registered, no activity yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {activity.map((a) => (
              <li key={a.key} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{a.label}</span>
                  <span className="block truncate text-xs text-muted">
                    {formatDateTime(a.at)}
                    {a.detail && ` · ${a.detail}`}
                  </span>
                </span>
                <span className={`shrink-0 font-semibold tabular ${a.amount > 0 ? "text-success" : ""}`}>
                  {a.amount > 0 ? "+" : "−"}
                  {formatUsd(Math.abs(a.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, note, danger }: { label: string; value: string; note?: string; danger?: boolean }) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className={`mt-1 font-semibold tabular ${danger ? "text-danger" : ""}`}>{value}</dd>
      {note && <dd className="text-xs text-muted">{note}</dd>}
    </div>
  );
}

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
