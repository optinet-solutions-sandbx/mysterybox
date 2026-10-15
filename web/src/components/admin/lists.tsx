"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Activity, Boxes, CreditCard, Gift, Swords, UsersRound } from "lucide-react";
import { ROLE_LABEL } from "@/backend/contract";
import { formatUsd } from "@/domain/money";
import { SEGMENTS, numberOf } from "@/domain/player-insights";
import type { PlayerRecord } from "@/domain/analytics";
import { useCatalog } from "@/components/catalog-provider";
import { Button } from "@/components/ui/button";
import { useBackoffice } from "@/store/backoffice";
import { settleWithdrawal } from "@/store/staff-actions";
import { cn } from "@/lib/cn";
import { useBackofficeData, useNow } from "./data";
import { PageTitle, Panel, SourceBadge, formatCount, formatDateTime } from "./ui";

/** Back-office list pages from the reference's menus: Groups, Box openings, Payments, Feed, plus the placeholders. */

const playerCrumbs = [
  { label: "Dashboard", href: "/admin" },
  { label: "Players", href: "/admin/players" },
];

function PlayerLink({ p }: { p: PlayerRecord }) {
  return (
    <Link href={`/admin/players/view?id=${numberOf(p)}`} className="font-semibold hover:text-accent">
      {p.firstName} {p.lastName}
      <span className="ml-1.5 text-xs font-normal text-muted tabular">#{numberOf(p)}</span>
    </Link>
  );
}

function useParamSetter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
}

function Chips<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-pill border px-3 py-1.5 text-sm font-semibold transition-colors",
            value === o.id ? "border-transparent bg-foil text-on-accent" : "border-line text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Groups ------------------------------------------------------------------------------------------

export function GroupsView() {
  const { players } = useBackofficeData();
  const now = useNow();
  return (
    <>
      <PageTitle
        crumbs={playerCrumbs}
        icon={UsersRound}
        title="Groups"
        intro="Rule-based player groups for CRM, bonuses and risk. Players join and leave them automatically as they play. Select a group to see its players."
      />
      <Panel>
        <ul className="divide-y divide-line">
          {SEGMENTS.map((g) => {
            const count = players.filter((p) => g.test(p, now)).length;
            return (
              <li key={g.id}>
                <Link href={`/admin/players?group=${g.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-accent-soft">
                  <span className="min-w-0">
                    <span className="inline-block rounded bg-fg px-2 py-0.5 text-xs font-semibold text-bg">Group: {g.label}</span>
                    <span className="mt-1 block text-sm text-muted">{g.description}</span>
                  </span>
                  <span className="shrink-0 text-lg font-semibold tabular">{formatCount(count)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}

// Box openings ------------------------------------------------------------------------------------

export function OpeningsView() {
  const { getBox, findItem } = useCatalog();
  const { players, boxes } = useBackofficeData();
  const params = useSearchParams();
  const setParam = useParamSetter();
  const playerFilter = params.get("player");
  const boxFilter = params.get("box") ?? "all";
  const rows = useMemo(
    () =>
      players
        .filter((p) => !playerFilter || String(numberOf(p)) === playerFilter)
        .flatMap((p) => p.plays.map((o) => ({ p, o })))
        .filter(({ o }) => boxFilter === "all" || o.boxId === boxFilter)
        .sort((a, b) => b.o.at.localeCompare(a.o.at)),
    [players, playerFilter, boxFilter],
  );
  const spent = rows.reduce((s, r) => s + r.o.priceCents, 0);
  const earned = rows.reduce((s, r) => s + r.o.valueCents, 0);
  const who = playerFilter ? players.find((p) => String(numberOf(p)) === playerFilter) : null;

  return (
    <>
      <PageTitle
        crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Boxes", href: "/admin/boxes" }]}
        icon={Boxes}
        title="Box openings"
        intro="Every opening with what was paid and what came out (the reference's game history)."
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          aria-label="Box"
          value={boxFilter}
          onChange={(e) => setParam("box", e.target.value === "all" ? null : e.target.value)}
          className="h-10 rounded-pill border border-line bg-surface px-4 text-sm font-semibold"
        >
          <option value="all">All boxes</option>
          {boxes.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        {playerFilter && (
          <button type="button" onClick={() => setParam("player", null)} className="rounded-pill bg-fg px-3 py-1.5 text-sm font-semibold text-bg">
            Player: {who ? `${who.firstName} ${who.lastName}` : playerFilter} ×
          </button>
        )}
        <p className="text-sm text-muted sm:ml-auto">
          {formatCount(rows.length)} openings · paid {formatUsd(spent)} · value {formatUsd(earned)} · house {formatUsd(spent - earned)}
        </p>
      </div>
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm tabular">
            <thead className="text-left text-[11px] font-semibold tracking-wide text-muted uppercase">
              <tr className="border-b border-line">
                <th className="px-4 py-3 font-semibold">Opened</th>
                <th className="px-4 py-3 font-semibold">Player</th>
                <th className="px-4 py-3 font-semibold">Box</th>
                <th className="px-4 py-3 font-semibold">Piece</th>
                <th className="px-4 py-3 text-right font-semibold">Paid</th>
                <th className="px-4 py-3 font-semibold">Paid with</th>
                <th className="px-4 py-3 text-right font-semibold">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted">
                    No openings yet.
                  </td>
                </tr>
              )}
              {rows.slice(0, 200).map(({ p, o }) => (
                <tr key={`${p.id}-${o.at}-${o.itemId}`}>
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted">{formatDateTime(o.at)}</td>
                  <td className="px-4 py-2.5">
                    <PlayerLink p={p} />
                  </td>
                  <td className="px-4 py-2.5">{getBox(o.boxId)?.name ?? o.boxId}</td>
                  <td className="px-4 py-2.5 font-semibold">{findItem(o.itemId)?.name ?? o.itemId}</td>
                  <td className="px-4 py-2.5 text-right">{formatUsd(o.priceCents)}</td>
                  <td className="px-4 py-2.5 text-muted">{o.paidWith === "credit" ? "Site credit" : o.paidWith === "card" ? "Card" : "—"}</td>
                  <td className={cn("px-4 py-2.5 text-right font-semibold", o.valueCents > o.priceCents && "text-success")}>{formatUsd(o.valueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

// Payments ----------------------------------------------------------------------------------------

type PayType = "all" | "deposit" | "withdrawal";
type PayStatus = "all" | "pending" | "completed" | "cancelled";

export function PaymentsView() {
  const { players } = useBackofficeData();
  const params = useSearchParams();
  const setParam = useParamSetter();
  const [message, setMessage] = useState<string | null>(null);
  const type = (["deposit", "withdrawal"].includes(params.get("type") ?? "") ? params.get("type") : "all") as PayType;
  const status = (["pending", "completed", "cancelled"].includes(params.get("status") ?? "") ? params.get("status") : "all") as PayStatus;
  const rows = useMemo(
    () =>
      players
        .flatMap((p) => p.money.filter((m) => m.type === "deposit" || m.type === "withdrawal").map((m) => ({ p, m })))
        .filter(({ m }) => (type === "all" || m.type === type) && (status === "all" || m.status === status))
        .sort((a, b) => b.m.at.localeCompare(a.m.at)),
    [players, type, status],
  );
  const total = rows.filter((r) => r.m.status !== "cancelled").reduce((s, r) => s + r.m.amountCents, 0);

  return (
    <>
      <PageTitle
        crumbs={[{ label: "Dashboard", href: "/admin" }]}
        icon={CreditCard}
        title="Payments"
        intro="Deposits and cashouts across all players. Pending cashouts wait here until staff pay them out (the payment provider takes this over later)."
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Chips
          label="Type"
          value={type}
          onChange={(v) => setParam("type", v === "all" ? null : v)}
          options={[
            { id: "all", label: "All" },
            { id: "deposit", label: "Deposits" },
            { id: "withdrawal", label: "Cashouts" },
          ]}
        />
        <Chips
          label="Status"
          value={status}
          onChange={(v) => setParam("status", v === "all" ? null : v)}
          options={[
            { id: "all", label: "Any status" },
            { id: "pending", label: "Pending" },
            { id: "completed", label: "Completed" },
            { id: "cancelled", label: "Cancelled" },
          ]}
        />
        <p className="text-sm text-muted sm:ml-auto">
          {formatCount(rows.length)} payments · net {total < 0 ? "−" : ""}
          {formatUsd(Math.abs(total))}
        </p>
      </div>
      {message && (
        <p role="status" className="mb-3 text-sm font-semibold text-success">
          {message}
        </p>
      )}
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm tabular">
            <thead className="text-left text-[11px] font-semibold tracking-wide text-muted uppercase">
              <tr className="border-b border-line">
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Player</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    No payments match.
                  </td>
                </tr>
              )}
              {rows.slice(0, 200).map(({ p, m }) => (
                <tr key={m.id}>
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted">{formatDateTime(m.at)}</td>
                  <td className="px-4 py-2.5">
                    <PlayerLink p={p} />
                    {p.source === "browser" && <SourceBadge />}
                  </td>
                  <td className="px-4 py-2.5 font-semibold">{m.type === "deposit" ? "Deposit" : "Cashout"}</td>
                  <td className={cn("px-4 py-2.5 text-right font-semibold", m.amountCents > 0 && "text-success")}>
                    {m.amountCents > 0 ? "+" : "−"}
                    {formatUsd(Math.abs(m.amountCents))}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "rounded-pill border px-2 py-0.5 text-xs font-semibold capitalize",
                        m.status === "pending" ? "border-accent/60 text-accent" : m.status === "completed" ? "border-success/50 text-success" : "border-line text-muted",
                      )}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {m.type === "withdrawal" && m.status === "pending" && p.source !== "demo" && (
                      <span className="inline-flex gap-2">
                        <Button size="sm" onClick={async () => setMessage((await settleWithdrawal(p.email, m.id, "completed")).ok ? "Cashout marked as paid." : "Couldn't settle it.")}>
                          Mark paid
                        </Button>
                        <Button size="sm" variant="secondary" onClick={async () => setMessage((await settleWithdrawal(p.email, m.id, "cancelled")).ok ? "Cashout cancelled; funds returned." : "Couldn't settle it.")}>
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
      </Panel>
    </>
  );
}

// Feed --------------------------------------------------------------------------------------------

type FeedKind = "all" | "signup" | "opening" | "payment" | "staff";

export function FeedView() {
  const { getBox, findItem } = useCatalog();
  const { players } = useBackofficeData();
  const audit = useBackoffice((s) => s.audit);
  const [kind, setKind] = useState<FeedKind>("all");

  const events = useMemo(() => {
    const out: { at: string; kind: Exclude<FeedKind, "all">; key: string; who: PlayerRecord | null; text: string; amount?: number }[] = [];
    for (const p of players) {
      out.push({ at: p.registeredAt, kind: "signup", key: `r-${p.id}`, who: p, text: "Registered" });
      for (const o of p.plays) {
        out.push({ at: o.at, kind: "opening", key: `o-${p.id}-${o.at}-${o.itemId}`, who: p, text: `Opened ${getBox(o.boxId)?.name ?? o.boxId}: ${findItem(o.itemId)?.name ?? o.itemId} (${formatUsd(o.valueCents)})`, amount: -o.priceCents });
      }
      for (const m of p.money) {
        const label = { deposit: "Deposit", withdrawal: "Cashout", sell_back: "Traded in a piece", adjustment: "Balance adjustment" }[m.type];
        out.push({ at: m.at, kind: "payment", key: m.id, who: p, text: m.status === "completed" ? label : `${label} (${m.status})`, amount: m.amountCents });
      }
    }
    for (const a of audit) {
      out.push({ at: a.createdAt, kind: "staff", key: a.id, who: null, text: `${String(a.detail.by ?? "Staff")} (${a.actorRole ? ROLE_LABEL[a.actorRole] : "system"}): ${a.action.replace(".", " ")}${a.detail.player ? ` · ${String(a.detail.player)}` : ""}` });
    }
    return out.sort((a, b) => b.at.localeCompare(a.at));
  }, [players, audit, getBox, findItem]);

  const shown = events.filter((e) => kind === "all" || e.kind === kind).slice(0, 200);

  return (
    <>
      <PageTitle crumbs={[{ label: "Dashboard", href: "/admin" }]} icon={Activity} title="Feed" intro="Everything that happened, newest first: sign-ups, openings, payments and staff actions." />
      <div className="mb-4">
        <Chips
          label="Event type"
          value={kind}
          onChange={setKind}
          options={[
            { id: "all", label: "Everything" },
            { id: "signup", label: "Sign-ups" },
            { id: "opening", label: "Openings" },
            { id: "payment", label: "Payments" },
            { id: "staff", label: "Staff actions" },
          ]}
        />
      </div>
      <Panel>
        {shown.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">Nothing yet. Register a player on the site and open a box.</p>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((e) => (
              <li key={e.key} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {e.who ? (
                      <>
                        <PlayerLink p={e.who} />
                        <span className="font-normal text-muted"> · {e.text}</span>
                      </>
                    ) : (
                      e.text
                    )}
                  </span>
                  <span className="text-xs text-muted">{formatDateTime(e.at)}</span>
                </span>
                {e.amount !== undefined && (
                  <span className={cn("shrink-0 font-semibold tabular", e.amount > 0 && "text-success")}>
                    {e.amount > 0 ? "+" : "−"}
                    {formatUsd(Math.abs(e.amount))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

// Placeholders ------------------------------------------------------------------------------------

export function BonusesView() {
  return (
    <>
      <PageTitle
        crumbs={[{ label: "Dashboard", href: "/admin" }]}
        icon={Gift}
        title="Bonuses"
        intro="Mirrors the reference's Bonuses menu. Not built yet: it needs the Rewards design (free boxes, cashback, deposit bonuses and their wagering rules)."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Issued bonuses">
          <ul className="grid gap-2 p-5 text-sm text-muted">
            <li>Columns from the reference: ID, issued at, bonus, amount, strategy (deposit, scheduler, manual, free-box result), stage (active, wager done, lost, expired), amount locked, wager progress, expiry date.</li>
            <li>Every issue appears on the player page under Issued bonuses and feeds the bonus ratio.</li>
          </ul>
        </Panel>
        <Panel title="Loyalty points" aside={<span id="loyalty" className="text-xs text-muted">Placeholder rule live</span>}>
          <ul className="grid gap-2 p-5 text-sm text-muted">
            <li>Two accounts per player, like the reference: Status (lifetime, sets the level) and Redeemable (spent on rewards).</li>
            <li>Today: 1 point per $1 spent on boxes, shown on each player page. Nothing can be redeemed yet.</li>
          </ul>
        </Panel>
      </div>
    </>
  );
}

export function BattlesView() {
  return (
    <>
      <PageTitle
        crumbs={[{ label: "Dashboard", href: "/admin" }]}
        icon={Swords}
        title="Battles"
        intro="Our version of the reference's Tournaments menu: box battles and the daily, weekly and monthly leaderboards. Not built yet; the player-facing pages are still stubs."
      />
      <Panel title="Planned">
        <ul className="grid gap-2 p-5 text-sm text-muted">
          <li>Battles: create, watch and settle multiplayer openings; rules and rake per battle.</li>
          <li>Leaderboards: periods, prize tables, eligibility (for example the &ldquo;Min 1 deposit&rdquo; group), and payouts.</li>
        </ul>
      </Panel>
    </>
  );
}
