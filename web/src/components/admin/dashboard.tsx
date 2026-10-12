"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { formatUsd, formatUsdCompact } from "@/domain/money";
import { dailyMetrics, inRange, kpis, overviewRow } from "@/domain/analytics";
import { getBox, getItem } from "@/services/catalog";
import { BarChart, LineChart } from "./charts";
import { useBackofficeData } from "./data";
import { Panel, PageTitle, RangeControl, SourceBadge, formatCount, formatDateTime, formatDay, formatPct } from "./ui";

export function AdminDashboard() {
  const { players, range } = useBackofficeData();

  const view = useMemo(() => {
    if (!range) return null;
    const k = kpis(players, range);
    const days = dailyMetrics(players, range).map((d) => ({ ...d, label: formatDay(d.day) }));
    const top = players
      .map((p) => {
        const plays = p.plays.filter((o) => inRange(o.at, range));
        const played = plays.reduce((s, o) => s + o.priceCents, 0);
        const earned = plays.reduce((s, o) => s + o.valueCents, 0);
        return { p, openings: plays.length, played, earned };
      })
      .filter((x) => x.openings > 0)
      .sort((a, b) => b.played - a.played)
      .slice(0, 8);
    const recent = players
      .flatMap((p) => p.plays.map((o) => ({ p, o })))
      .sort((a, b) => b.o.at.localeCompare(a.o.at))
      .slice(0, 10);
    const browserCount = players.filter((p) => p.source === "browser").length;
    const everConversion = k.registeredTotal ? k.playersPlayedEver / k.registeredTotal : null;
    const pending = players.flatMap((p) => p.money.filter((m) => m.type === "withdrawal" && m.status === "pending").map((m) => ({ p, m })));
    return { k, days, top, recent, browserCount, everConversion, pending, overview: players.map(overviewRow) };
  }, [players, range]);

  if (!view || !range) return <div className="h-[60vh] animate-pulse rounded-2xl bg-surface" />;
  const { k, days, top, recent, browserCount, everConversion, pending } = view;

  return (
    <>
      <PageTitle
        title="Dashboard"
        intro={
          <>
            Sign-ups, play and money for {formatDay(range.from)} – {formatDay(range.to)}, UTC.{" "}
            {players.length > browserCount
              ? `Includes ${formatCount(players.length - browserCount)} sample players and ${formatCount(browserCount)} ${browserCount === 1 ? "account" : "accounts"} registered in this browser.`
              : `${formatCount(browserCount)} ${browserCount === 1 ? "player account" : "player accounts"} registered in this browser.`}
          </>
        }
        actions={<RangeControl />}
      />

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3 xl:grid-cols-6">
        <Kpi label="New players" value={formatCount(k.registeredInRange)} note={`${formatCount(k.registeredTotal)} registered in total`} />
        <Kpi label="Players who played" value={formatCount(k.playersPlayedInRange)} note={`${formatPct(everConversion)} of all players have played`} />
        <Kpi label="Boxes opened" value={formatCount(k.openings)} note={k.openings ? `${formatUsd(Math.round(k.playedCents / k.openings))} per opening` : "No openings"} />
        <Kpi label="Played" value={formatUsdCompact(k.playedCents)} note={`Deposits ${formatUsdCompact(k.depositsCents)}`} accent />
        <Kpi label="Earned by players" value={formatUsdCompact(k.earnedCents)} note={`Sold back ${formatUsdCompact(k.soldBackCents)}`} />
        <Kpi label="House net" value={formatUsdCompact(k.houseNetCents)} note={`Hold ${formatPct(k.playedCents ? k.houseNetCents / k.playedCents : null)}`} />
      </dl>

      <p className="mt-4 rounded-2xl border border-dashed border-line px-5 py-3 text-sm leading-relaxed text-muted">
        <span className="font-semibold text-fg">Prototype:</span> the back office reads accounts created in this browser. Players
        registered on another phone or computer appear there, not here, until the shared Supabase database is connected.
      </p>

      {pending.length > 0 && (
        <Link
          href="/admin/players?filter=pending"
          className="mt-4 flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent-soft px-5 py-3 text-sm font-semibold hover:border-accent"
        >
          <AlertCircle className="size-4 shrink-0 text-accent" />
          {pending.length} withdrawal {pending.length === 1 ? "request is" : "requests are"} waiting to be paid out (
          {formatUsd(pending.reduce((s, x) => s - x.m.amountCents, 0))})
        </Link>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Sign-ups and first plays per day">
          <div className="p-5">
            <BarChart
              title="Sign-ups and first plays per day"
              data={days}
              series={[
                { key: "registrations", label: "Signed up", tone: "fill-glow bg-glow" },
                { key: "firstTimePlayers", label: "Played for the first time", tone: "fill-accent bg-accent" },
              ]}
              format={(n) => formatCount(Math.round(n))}
              integer
            />
          </div>
        </Panel>
        <Panel title="Played and earned per day">
          <div className="p-5">
            <LineChart
              title="Amount played and earned per day"
              data={days}
              series={[
                { key: "playedCents", label: "Played", tone: "fill-accent stroke-accent bg-accent" },
                { key: "earnedCents", label: "Earned by players", tone: "fill-glow stroke-glow bg-glow" },
              ]}
              format={(n) => formatUsdCompact(n)}
              floor={10_000}
              footer={(d) => (
                <p className="flex justify-between gap-3">
                  <span className="text-muted">House net</span>
                  <span className="font-semibold tabular">{formatUsdCompact(d.playedCents - d.earnedCents)}</span>
                </p>
              )}
            />
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel
          title="Top players by amount played"
          aside={
            <Link href="/admin/players" className="text-sm font-semibold text-accent underline-offset-4 hover:underline">
              All players
            </Link>
          }
        >
          {top.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">Nobody played in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 font-semibold">Player</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Opened</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Played</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Earned</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-semibold">House net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {top.map(({ p, openings, played, earned }) => (
                    <tr key={p.id}>
                      <td className="px-5 py-3">
                        <Link href={`/admin/players?player=${p.id}`} className="font-semibold hover:text-accent">
                          {p.firstName} {p.lastName}
                        </Link>
                        {p.source === "browser" && <SourceBadge />}
                      </td>
                      <td className="px-3 py-3 text-right tabular">{openings}</td>
                      <td className="px-3 py-3 text-right font-semibold tabular">{formatUsd(played)}</td>
                      <td className="px-3 py-3 text-right tabular">{formatUsd(earned)}</td>
                      <td className={`px-5 py-3 text-right font-semibold tabular ${played - earned < 0 ? "text-danger" : ""}`}>{formatUsd(played - earned)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel title="Latest openings">
          {recent.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted">No boxes opened yet. Register a player on the site and open one.</p>}
          <ul className="divide-y divide-line">
            {recent.map(({ p, o }) => (
              <li key={`${p.id}-${o.at}`} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {p.firstName} {p.lastName[0]}. pulled {getItem(o.itemId).name}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {getBox(o.boxId)?.name} · {formatDateTime(o.at)}
                  </p>
                </div>
                <span className="shrink-0 text-right">
                  <span className="block font-semibold tabular">{formatUsd(o.valueCents)}</span>
                  <span className="block text-xs text-muted tabular">paid {formatUsd(o.priceCents)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function Kpi({ label, value, note, accent }: { label: string; value: string; note: string; accent?: boolean }) {
  return (
    <div className="bg-surface px-5 py-5">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className={`mt-2 font-display text-3xl font-semibold tabular ${accent ? "text-foil" : ""}`}>{value}</dd>
      <dd className="mt-1 text-xs text-muted">{note}</dd>
    </div>
  );
}
