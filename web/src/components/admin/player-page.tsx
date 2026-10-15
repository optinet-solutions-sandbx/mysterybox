"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { UserRound, X } from "lucide-react";
import { can } from "@/backend/contract";
import { formatPhoneInput } from "@/domain/auth";
import { formatUsd } from "@/domain/money";
import type { PlayerRecord } from "@/domain/analytics";
import { accountSummary, autoTags, loyaltyPoints, maskEmail, numberOf, playerNumber, segmentsFor, type Tag } from "@/domain/player-insights";
import { useCatalog } from "@/components/catalog-provider";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/store/auth";
import { useBackoffice, type PlayerLock } from "@/store/backoffice";
import { addComment, lockPlayer, setPlayerTags, settleWithdrawal, unlockPlayer } from "@/store/staff-actions";
import { cn } from "@/lib/cn";
import { useBackofficeData, useNow } from "./data";
import { PageTitle, Panel, SourceBadge, StatusBadge, formatDateTime } from "./ui";

/**
 * The player card as a full page, section for section after the reference back office's player
 * page (docs/09-backoffice-reference.md), translated to mystery boxes. Sections the reference
 * shows below the fold (payments, history, comments) are ours.
 */

const amount = (cents: number) => (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const points = (micro: number) => Math.floor(micro / 1_000_000).toLocaleString("en-US");

export function PlayerPage() {
  const params = useSearchParams();
  const { players } = useBackofficeData();
  const id = Number(params.get("id"));
  const player = players.find((p) => numberOf(p) === id) ?? null;

  if (!player) {
    return (
      <>
        <PageTitle crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Players", href: "/admin/players" }]} icon={UserRound} title="Player not found" />
        <p className="text-muted">
          No player with ID {params.get("id") ?? "—"} in this browser.{" "}
          <Link href="/admin/players" className="font-semibold text-accent underline-offset-4 hover:underline">
            Back to players
          </Link>
        </p>
      </>
    );
  }
  return <PlayerView p={player} />;
}

function PlayerView({ p }: { p: PlayerRecord }) {
  const now = useNow();
  const s = accountSummary(p);
  const loyalty = loyaltyPoints(p);
  const number = numberOf(p);
  const ref = { id: p.id, email: p.source === "browser" ? p.email : undefined, name: `${p.firstName} ${p.lastName}`.trim() };

  return (
    <>
      <PageTitle
        crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Players", href: "/admin/players" }]}
        icon={UserRound}
        title={
          <>
            {ref.name} <span className="font-sans text-xl font-medium tracking-normal break-all text-muted sm:text-2xl">- {maskEmail(p.email)}</span>
          </>
        }
        actions={p.source === "browser" ? <SourceBadge /> : undefined}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-6">
          <Panel title="Accounts">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-sm tabular">
                <thead className="text-left text-[11px] font-semibold tracking-wide text-muted uppercase">
                  <tr className="border-b border-line">
                    {[
                      "ID",
                      "Currency",
                      "Balance",
                      "Deposits sum",
                      "Cashouts sum",
                      "Pending cashouts sum",
                      "Chargebacks sum",
                      "Unreceived deposits sum",
                      "Refunds sum",
                      "Reversals sum",
                      "Affiliate payments sum",
                      "Deposit reversals sum",
                      "Avg box",
                      "Gifts sum",
                      "Spent on boxes",
                      "House profit",
                      "Bonuses",
                      "Bonus ratio",
                    ].map((h) => (
                      <th key={h} scope="col" className="px-3 py-3 align-bottom font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-3">{playerNumber(`${p.id}:wallet`)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded bg-glow px-1.5 py-0.5 text-xs font-bold text-white">USD</span>
                    </td>
                    <td className="px-3 py-3 font-semibold">{amount(s.balance)}</td>
                    <td className="px-3 py-3">{amount(s.depositsSum)}</td>
                    <td className="px-3 py-3">{amount(s.cashoutsSum)}</td>
                    <td className="px-3 py-3">{amount(s.pendingCashoutsSum)}</td>
                    <td className="px-3 py-3 text-subtle">{amount(s.chargebacksSum)}</td>
                    <td className="px-3 py-3">{amount(s.unreceivedDepositsSum)}</td>
                    <td className="px-3 py-3 text-subtle">{amount(s.refundsSum)}</td>
                    <td className="px-3 py-3 text-subtle">{amount(s.reversalsSum)}</td>
                    <td className="px-3 py-3 text-subtle">{amount(s.affiliatePaymentsSum)}</td>
                    <td className="px-3 py-3 text-subtle">{amount(s.depositReversalsSum)}</td>
                    <td className="px-3 py-3">{amount(s.avgBoxPrice)}</td>
                    <td className="px-3 py-3">{amount(s.giftsSum)}</td>
                    <td className="px-3 py-3">{amount(s.spentOnBoxes)}</td>
                    <td className="px-3 py-3">
                      <span className={cn("rounded px-1.5 py-0.5 text-xs font-bold", s.houseProfit < 0 ? "bg-danger text-white" : "bg-accent-soft text-fg")}>
                        {amount(s.houseProfit)}
                      </span>
                      <Link
                        href={`/admin/boxes/openings?player=${number}`}
                        className="mt-2 block w-fit rounded-md border border-line bg-surface-2 px-3 py-1 text-xs font-semibold hover:border-accent"
                      >
                        View
                      </Link>
                    </td>
                    <td className="px-3 py-3">{amount(s.bonusesSum)}</td>
                    <td className="px-3 py-3">{Math.round(s.bonusRatio * 100)}%</td>
                  </tr>
                  <tr className="border-t border-line">
                    <td className="px-3 py-3">{playerNumber(`${p.id}:credit`)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded bg-accent-soft px-1.5 py-0.5 text-xs font-bold text-fg">CREDIT</span>
                    </td>
                    <td className="px-3 py-3 font-semibold">{p.creditBalance === undefined ? <span className="font-normal text-subtle">Not visible yet</span> : amount(Math.round(p.creditBalance * 100))}</td>
                    <td colSpan={15} className="px-3 py-3 text-xs text-muted">
                      Site credit: from credit outcomes, bonus opens and trade-ins; it buys boxes and can&rsquo;t be withdrawn.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="border-t border-line px-5 py-3 text-xs text-muted">
              House profit = spent on boxes − listed value of the pieces received. Chargebacks, refunds, reversals and affiliate
              payments fill in once the payment provider and affiliates are connected. Site credit counts $1 a credit and lives on the
              box system, so it shows for accounts used in this browser until the box system&rsquo;s API is live.
            </p>
          </Panel>

          <Panel title="Approx average bonus ratio" aside={<span className="text-sm font-semibold tabular">{Math.round(s.bonusRatio * 100)}%</span>}>
            <p className="px-5 py-3 text-xs text-muted">Bonuses credited ÷ deposits. No bonus engine yet, so this stays 0%.</p>
          </Panel>

          <Panel title="Loyalty points account">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm tabular">
                <thead className="text-left text-[11px] font-semibold tracking-wide text-muted uppercase">
                  <tr className="border-b border-line">
                    <th className="px-5 py-3 font-semibold">ID</th>
                    <th className="px-5 py-3 font-semibold">History</th>
                    <th className="px-5 py-3 font-semibold">Account type</th>
                    <th className="px-5 py-3 font-semibold">Points</th>
                    <th className="px-5 py-3 font-semibold">Micropoints</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {(
                    [
                      ["Redeemable", loyalty.redeemable],
                      ["Status", loyalty.status],
                    ] as const
                  ).map(([type, micro]) => (
                    <tr key={type}>
                      <td className="px-5 py-2.5">{playerNumber(`${p.id}:${type}`)}</td>
                      <td className="px-5 py-2.5">
                        <Link href={`/admin/boxes/openings?player=${number}`} className="text-accent underline-offset-4 hover:underline">
                          History
                        </Link>
                      </td>
                      <td className="px-5 py-2.5">{type}</td>
                      <td className="px-5 py-2.5 font-semibold">{points(micro)}</td>
                      <td className="px-5 py-2.5 text-muted">{micro.toLocaleString("en-US")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-line px-5 py-3 text-xs text-muted">Placeholder rule until Rewards is designed: 1 point per $1 spent on boxes.</p>
          </Panel>

          <Panel title="Issued bonuses" aside={<Link href="/admin/bonuses" className="text-sm font-semibold text-accent">All bonus issues</Link>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead className="text-left text-[11px] font-semibold tracking-wide text-muted uppercase">
                  <tr className="border-b border-line">
                    {["ID", "Issued at", "Bonus", "Amount", "Strategy", "Stage", "Amount locked", "Wager", "Expiry date"].map((h) => (
                      <th key={h} className="px-4 py-3 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted">
                      No bonuses issued. Free boxes, cashback and deposit bonuses arrive with the bonus engine.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>

          <Payments p={p} />
          <Openings p={p} number={number} />
          <Comments playerRef={ref} />
        </div>

        <aside className="grid min-w-0 gap-6">
          <Panel title="Status">
            <dl className="divide-y divide-line text-sm">
              <Row label="Account">
                <StatusBadge status={p.status} />
              </Row>
              <Row label="Player ID">{number}</Row>
              <Row label="Email">{p.source === "browser" ? "Verified" : "—"}</Row>
              <Row label="Identity check">{{ not_started: "Not started", pending: "In review", verified: "Verified", rejected: "Rejected" }[p.kycStatus]}</Row>
              <Row label="Phone">{p.phoneNumber ? `${p.phoneDial ?? ""} ${formatPhoneInput(p.phoneDial ?? "+1", p.phoneNumber)}` : "—"}</Row>
              <Row label="Registered">{formatDateTime(p.registeredAt)}</Row>
              <Row label="Last seen">{formatDateTime(p.lastSeenAt)}</Row>
              <Row label="Marketing">{p.marketingOptIn ? "Opted in" : "Opted out"}</Row>
            </dl>
          </Panel>
          <Locks playerRef={ref} />
          <Tags playerRef={ref} auto={autoTags(p, now)} />
          <Panel title="Groups">
            <ul className="flex flex-wrap gap-1.5 p-4">
              {segmentsFor(p, now).map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/admin/players?group=${g.id}`}
                    title={g.description}
                    className={cn(
                      "inline-block rounded px-2 py-1 text-xs font-semibold",
                      g.id === "pending-cashout" ? "bg-danger text-white" : "bg-fg text-bg hover:opacity-85",
                    )}
                  >
                    Group: {g.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 px-5 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 font-medium break-words">{children}</dd>
    </div>
  );
}

const CS_REASONS = ["Chargeback review", "Payment verification", "Multiple accounts", "Bonus abuse", "Underage check", "Other"];
const SB_REASONS = ["Player request: 6 months", "Player request: 12 months", "Player request: permanent", "Responsible-play referral"];

function Locks({ playerRef }: { playerRef: { id: string; email?: string; name: string } }) {
  const staff = useCurrentUser();
  const locks = useBackoffice((s) => s.locks[playerRef.id]);
  const [adding, setAdding] = useState<PlayerLock["type"] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const allowed = can(staff?.role, "players.suspend");

  return (
    <Panel title="Player locks">
      <div className="grid gap-5 p-4 text-sm">
        {(["cs", "sb"] as const).map((type) => {
          const active = (locks ?? []).filter((l) => l.type === type && !l.removedAt);
          return (
            <div key={type}>
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2 border-b border-line pb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">
                <span>{type.toUpperCase()} reason</span>
                <span>Comment</span>
                <span>Created at</span>
              </div>
              {active.length === 0 ? (
                <p className="py-2 text-xs text-subtle">{type === "cs" ? "No staff lock." : "No self-exclusion."}</p>
              ) : (
                active.map((l) => (
                  <div key={l.id} className="grid grid-cols-[1fr_1fr_auto] items-start gap-2 border-b border-line py-2">
                    <span className="font-semibold">{l.reason}</span>
                    <span className="break-words text-muted">{l.comment || "—"}</span>
                    <span className="text-right text-xs text-muted">
                      {formatDateTime(l.createdAt).replace(" UTC", "")}
                      {allowed && (
                        <button
                          type="button"
                          onClick={async () => setMessage((await unlockPlayer(playerRef, l.id)).ok ? "Lock removed." : "Couldn't remove the lock.")}
                          className="mt-1 block font-semibold text-accent"
                        >
                          Remove
                        </button>
                      )}
                    </span>
                  </div>
                ))
              )}
            </div>
          );
        })}
        {allowed &&
          (adding ? (
            <LockForm
              type={adding}
              onCancel={() => setAdding(null)}
              onSave={async (reason, comment) => {
                const type = adding;
                setAdding(null);
                const res = await lockPlayer(playerRef, type, reason, comment);
                setMessage(res.ok ? (type === "cs" ? "Player locked: they can't sign in or play." : "Self-exclusion recorded.") : "Couldn't add the lock.");
              }}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setAdding("cs")}>
                Add CS lock
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setAdding("sb")}>
                Add self-exclusion
              </Button>
            </div>
          ))}
        <p role="status" className="min-h-5 text-xs font-semibold text-success">
          {message}
        </p>
      </div>
    </Panel>
  );
}

function LockForm({ type, onSave, onCancel }: { type: PlayerLock["type"]; onSave: (reason: string, comment: string) => void; onCancel: () => void }) {
  const reasons = type === "cs" ? CS_REASONS : SB_REASONS;
  const [reason, setReason] = useState(reasons[0]);
  const [comment, setComment] = useState("");
  const id = useId();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(reason, comment.trim());
      }}
      className="grid gap-2 rounded-xl border border-line p-3"
    >
      <p className="font-semibold">{type === "cs" ? "Add CS lock" : "Add self-exclusion"}</p>
      <label htmlFor={`${id}-r`} className="text-xs font-semibold text-muted">
        Reason
      </label>
      <select id={`${id}-r`} value={reason} onChange={(e) => setReason(e.target.value)} className="h-9 rounded-lg border border-line bg-surface px-2 text-sm">
        {reasons.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
      <label htmlFor={`${id}-c`} className="text-xs font-semibold text-muted">
        Comment
      </label>
      <input id={`${id}-c`} value={comment} onChange={(e) => setComment(e.target.value)} className="h-9 rounded-lg border border-line bg-surface px-2 text-sm" />
      <div className="mt-1 flex gap-2">
        <Button type="submit" size="sm">
          Save lock
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

const tagTone: Record<Tag["tone"], string> = {
  warn: "bg-[color-mix(in_oklab,var(--rarity-epic)_80%,white)] text-white",
  info: "bg-glow text-white",
  good: "bg-success text-white",
  neutral: "bg-subtle text-bg",
};

function Tags({ playerRef, auto }: { playerRef: { id: string; email?: string; name: string }; auto: Tag[] }) {
  const staff = useCurrentUser();
  const manual = useBackoffice((s) => s.tags[playerRef.id]);
  const [draft, setDraft] = useState("");
  const allowed = can(staff?.role, "players.notes");
  const list = manual ?? [];

  function add(e: FormEvent) {
    e.preventDefault();
    const tag = draft.trim().replace(/\s+/g, "-");
    if (!tag || list.includes(tag)) return setDraft("");
    void setPlayerTags(playerRef, [...list, tag]);
    setDraft("");
  }

  return (
    <Panel title="Tags">
      <div className="grid gap-3 p-4">
        <ul className="flex flex-wrap gap-1.5">
          {auto.map((t) => (
            <li key={t.label} className={cn("rounded px-2 py-0.5 text-xs font-semibold", tagTone[t.tone])} title="Set automatically">
              {t.label}
            </li>
          ))}
          {list.map((t) => (
            <li key={t} className="inline-flex items-center gap-1 rounded bg-accent px-2 py-0.5 text-xs font-semibold text-on-accent">
              {t}
              {allowed && (
                <button type="button" aria-label={`Remove tag ${t}`} onClick={() => void setPlayerTags(playerRef, list.filter((x) => x !== t))}>
                  <X className="size-3" />
                </button>
              )}
            </li>
          ))}
          {auto.length + list.length === 0 && <li className="text-xs text-subtle">No tags.</li>}
        </ul>
        {allowed && (
          <form onSubmit={add} className="flex gap-2">
            <input
              aria-label="New tag"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a tag, e.g. VIP"
              className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm"
            />
            <Button type="submit" size="sm" variant="secondary">
              Add
            </Button>
          </form>
        )}
      </div>
    </Panel>
  );
}

const moneyLabel = { deposit: "Deposit", withdrawal: "Cashout", sell_back: "Trade-in", adjustment: "Adjustment" } as const;

function Payments({ p }: { p: PlayerRecord }) {
  const [message, setMessage] = useState<string | null>(null);
  const rows = [...p.money].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <Panel title="Payments" aside={<Link href="/admin/payments" className="text-sm font-semibold text-accent">All payments</Link>}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm tabular">
          <thead className="text-left text-[11px] font-semibold tracking-wide text-muted uppercase">
            <tr className="border-b border-line">
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 text-right font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No payments yet.
                </td>
              </tr>
            )}
            {rows.slice(0, 25).map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-2.5 whitespace-nowrap text-muted">{formatDateTime(m.at)}</td>
                <td className="px-4 py-2.5 font-semibold">{moneyLabel[m.type]}</td>
                <td className={cn("px-4 py-2.5 text-right font-semibold", m.amountCents > 0 && "text-success")}>
                  {m.amountCents > 0 ? "+" : "−"}
                  {formatUsd(Math.abs(m.amountCents))}
                </td>
                <td className="px-4 py-2.5 capitalize">{m.status}</td>
                <td className="px-4 py-2.5 text-right">
                  {m.type === "withdrawal" && m.status === "pending" && p.source !== "demo" && (
                    <span className="inline-flex gap-2">
                      <Button size="sm" onClick={async () => setMessage((await settleWithdrawal(p.email, m.id, "completed")).ok ? "Cashout marked as paid." : "Couldn't settle it.")}>
                        Mark paid
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => setMessage((await settleWithdrawal(p.email, m.id, "cancelled")).ok ? "Cashout cancelled; funds returned." : "Couldn't settle it.")}
                      >
                        Cancel
                      </Button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {message && (
        <p role="status" className="border-t border-line px-4 py-2.5 text-sm font-semibold text-success">
          {message}
        </p>
      )}
    </Panel>
  );
}

function Openings({ p, number }: { p: PlayerRecord; number: number }) {
  const { getBox, findItem } = useCatalog();
  const rows = [...p.plays].reverse().slice(0, 15);
  return (
    <Panel title={`Box openings (${p.plays.length})`} aside={<Link href={`/admin/boxes/openings?player=${number}`} className="text-sm font-semibold text-accent">All openings</Link>}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm tabular">
          <thead className="text-left text-[11px] font-semibold tracking-wide text-muted uppercase">
            <tr className="border-b border-line">
              <th className="px-4 py-3 font-semibold">Opened</th>
              <th className="px-4 py-3 font-semibold">Box</th>
              <th className="px-4 py-3 font-semibold">Piece</th>
              <th className="px-4 py-3 text-right font-semibold">Paid</th>
              <th className="px-4 py-3 text-right font-semibold">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No boxes opened yet.
                </td>
              </tr>
            )}
            {rows.map((o) => (
              <tr key={`${o.at}-${o.itemId}`}>
                <td className="px-4 py-2.5 whitespace-nowrap text-muted">{formatDateTime(o.at)}</td>
                <td className="px-4 py-2.5">{getBox(o.boxId)?.name ?? o.boxId}</td>
                <td className="px-4 py-2.5 font-semibold">{findItem(o.itemId)?.name ?? o.itemId}</td>
                <td className="px-4 py-2.5 text-right">{formatUsd(o.priceCents)}</td>
                <td className={cn("px-4 py-2.5 text-right font-semibold", o.valueCents > o.priceCents && "text-success")}>{formatUsd(o.valueCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Comments({ playerRef }: { playerRef: { id: string; email?: string; name: string } }) {
  const staff = useCurrentUser();
  const comments = useBackoffice((s) => s.comments[playerRef.id]);
  const [draft, setDraft] = useState("");
  const id = useId();
  const allowed = can(staff?.role, "players.notes");
  return (
    <Panel title="Comments">
      <div className="grid gap-4 p-5">
        {allowed && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              void addComment(playerRef, draft);
              setDraft("");
            }}
            className="grid gap-2"
          >
            <label htmlFor={id} className="text-sm font-semibold">
              Add a comment for the team
            </label>
            <textarea
              id={id}
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. Called the player about the pending cashout."
              className="rounded-xl border border-line bg-bg px-3 py-2 text-sm"
            />
            <Button type="submit" size="sm" className="justify-self-start">
              Save comment
            </Button>
          </form>
        )}
        {(comments ?? []).length === 0 ? (
          <p className="text-sm text-muted">No comments yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {comments!.map((c) => (
              <li key={c.id} className="py-3 text-sm">
                <p className="text-xs text-muted">
                  {c.by} · {formatDateTime(c.at)}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{c.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
