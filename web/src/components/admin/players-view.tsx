"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import type { PlayerOverviewRow } from "@/backend/contract";
import { formatUsd } from "@/domain/money";
import { overviewRow, type PlayerRecord } from "@/domain/analytics";
import { cn } from "@/lib/cn";
import { useBackofficeData } from "./data";
import { PlayerDrawer } from "./player-drawer";
import { PageTitle, SourceBadge, StatusBadge, formatCount, formatDate } from "./ui";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "played", label: "Played" },
  { id: "never", label: "Never played" },
  { id: "pending", label: "Withdrawal pending" },
  { id: "suspended", label: "Suspended" },
  { id: "browser", label: "This browser" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

type SortKey = "name" | "registeredAt" | "lastPlayedAt" | "openings" | "playedCents" | "earnedCents" | "houseNetCents" | "balanceCents";

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "name", label: "Player" },
  { key: "registeredAt", label: "Registered" },
  { key: "lastPlayedAt", label: "Last played" },
  { key: "openings", label: "Opened", align: "right" },
  { key: "playedCents", label: "Played", align: "right" },
  { key: "earnedCents", label: "Earned", align: "right" },
  { key: "houseNetCents", label: "House net", align: "right" },
  { key: "balanceCents", label: "Balance", align: "right" },
];

const PAGE = 25;

function matches(filter: FilterId, p: PlayerRecord, row: PlayerOverviewRow) {
  switch (filter) {
    case "played":
      return row.openings > 0;
    case "never":
      return row.openings === 0;
    case "pending":
      return p.money.some((m) => m.type === "withdrawal" && m.status === "pending");
    case "suspended":
      return p.status !== "active";
    case "browser":
      return p.source === "browser";
    default:
      return true;
  }
}

export function PlayersView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { players } = useBackofficeData();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "registeredAt", desc: true });
  const [page, setPage] = useState(0);

  const filter = (FILTERS.find((f) => f.id === params.get("filter"))?.id ?? "all") as FilterId;
  const selectedId = params.get("player");

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = players
      .map((p) => ({ p, row: overviewRow(p) }))
      .filter(({ p, row }) => matches(filter, p, row))
      .filter(({ p }) => !q || `${p.firstName} ${p.lastName} ${p.email}`.toLowerCase().includes(q));
    const value = ({ row }: { row: PlayerOverviewRow }) =>
      sort.key === "name" ? `${row.lastName} ${row.firstName}`.toLowerCase() : (row[sort.key] ?? "");
    return list.sort((a, b) => {
      const [x, y] = [value(a), value(b)];
      const cmp = x < y ? -1 : x > y ? 1 : 0;
      return sort.desc ? -cmp : cmp;
    });
  }, [players, filter, query, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * PAGE, current * PAGE + PAGE);
  const selected = players.find((p) => p.id === selectedId) ?? null;

  return (
    <>
      <PageTitle
        title="Players"
        intro="Everyone who has registered: when they joined, whether and when they played, how much they played and earned, and what they hold now. Select a player for their card."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Search players</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search name or email"
            className="h-10 w-full rounded-pill border border-line bg-surface pr-4 pl-10 text-sm font-medium placeholder:font-normal placeholder:text-subtle focus:border-accent focus:outline-none"
          />
        </label>
        <div role="group" aria-label="Filter" className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => {
                setParam("filter", f.id === "all" ? null : f.id);
                setPage(0);
              }}
              className={cn(
                "rounded-pill border px-3 py-1.5 text-sm font-semibold transition-colors",
                filter === f.id ? "border-transparent bg-foil text-on-accent" : "border-line text-muted hover:text-fg",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted sm:ml-auto" aria-live="polite">
          {formatCount(rows.length)} {rows.length === 1 ? "player" : "players"}
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b border-line text-left text-xs text-muted">
            <tr>
              {COLUMNS.map((c) => {
                const active = sort.key === c.key;
                return (
                  <th key={c.key} scope="col" aria-sort={active ? (sort.desc ? "descending" : "ascending") : undefined} className={cn("px-4 py-3 font-semibold", c.align === "right" && "text-right")}>
                    <button
                      type="button"
                      onClick={() => setSort((s) => ({ key: c.key, desc: s.key === c.key ? !s.desc : c.key !== "name" }))}
                      className={cn("inline-flex items-center gap-1 hover:text-fg", active && "text-fg")}
                    >
                      {c.label}
                      {active && (sort.desc ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />)}
                    </button>
                  </th>
                );
              })}
              <th scope="col" className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.map(({ p, row }) => (
              <tr key={p.id} className="cursor-pointer transition-colors hover:bg-accent-soft" onClick={() => setParam("player", p.id)}>
                <td className="px-4 py-3">
                  <button type="button" onClick={(e) => { e.stopPropagation(); setParam("player", p.id); }} className="text-left">
                    <span className="font-semibold">
                      {p.firstName} {p.lastName}
                    </span>
                    {p.source === "browser" && <SourceBadge />}
                    <span className="block text-xs text-muted">{p.email}</span>
                  </button>
                </td>
                <td className="px-4 py-3 whitespace-nowrap tabular">{formatDate(row.registeredAt)}</td>
                <td className="px-4 py-3 whitespace-nowrap tabular">{row.lastPlayedAt ? formatDate(row.lastPlayedAt) : <span className="text-subtle">Never</span>}</td>
                <td className="px-4 py-3 text-right tabular">{row.openings}</td>
                <td className="px-4 py-3 text-right font-semibold tabular">{formatUsd(row.playedCents)}</td>
                <td className="px-4 py-3 text-right tabular">{formatUsd(row.earnedCents)}</td>
                <td className={cn("px-4 py-3 text-right font-semibold tabular", row.houseNetCents < 0 && "text-danger")}>{formatUsd(row.houseNetCents)}</td>
                <td className="px-4 py-3 text-right tabular">{formatUsd(row.balanceCents)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-4 py-12 text-center text-muted">
                  {players.length === 0
                    ? "No players yet. Register an account on the site and it shows up here."
                    : "No players match. Clear the search or pick another filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-3 text-sm">
          <span className="text-muted">
            Page {current + 1} of {pages}
          </span>
          <div className="flex gap-2">
            <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="rounded-pill border border-line px-4 py-1.5 font-semibold disabled:opacity-40">
              Previous
            </button>
            <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="rounded-pill border border-line px-4 py-1.5 font-semibold disabled:opacity-40">
              Next
            </button>
          </div>
        </nav>
      )}

      <PlayerDrawer player={selected} onClose={() => setParam("player", null)} />
    </>
  );
}
