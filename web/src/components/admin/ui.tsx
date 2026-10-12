"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ROLE_LABEL, type AccountStatus, type AppRole } from "@/backend/contract";
import type { RangePreset } from "@/domain/analytics";
import { cn } from "@/lib/cn";
import { useRangePreset } from "./data";

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" });
const shortDayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export const formatDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : "—");
export const formatDateTime = (iso: string | null | undefined) => (iso ? `${dateTimeFmt.format(new Date(iso))} UTC` : "—");
export const formatDay = (day: string) => shortDayFmt.format(new Date(`${day}T00:00:00Z`));
export const formatPct = (x: number | null) => (x === null || !Number.isFinite(x) ? "—" : `${(x * 100).toFixed(1)}%`);
export const formatCount = (n: number) => n.toLocaleString("en-US");

export interface Crumb {
  label: string;
  href?: string;
}

/** Breadcrumb + title band, as on every page of the reference back office. */
export function PageTitle({
  title,
  intro,
  actions,
  crumbs = [{ label: "Dashboard", href: "/admin" }],
  icon: Icon,
}: {
  title: ReactNode;
  intro?: ReactNode;
  actions?: ReactNode;
  crumbs?: Crumb[];
  icon?: LucideIcon;
}) {
  return (
    <div className="mb-8 border-b border-line pb-6">
      <nav aria-label="Breadcrumb" className={cn("mb-2", crumbs.length === 0 && "hidden")}>
        <ol className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
          {crumbs.map((c) => (
            <li key={c.label} className="flex items-center gap-1.5">
              {c.href ? (
                <Link href={c.href} className="hover:text-fg">
                  {c.label}
                </Link>
              ) : (
                c.label
              )}
              <span aria-hidden>/</span>
            </li>
          ))}
        </ol>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {Icon && (
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Icon className="size-6" strokeWidth={1.75} />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold break-words sm:text-4xl">{title}</h1>
            {intro && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{intro}</p>}
          </div>
        </div>
        {actions}
      </div>
    </div>
  );
}

export function Panel({ title, aside, className, children }: { title?: ReactNode; aside?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cn("min-w-0 rounded-2xl border border-line bg-surface", className)}>
      {(title || aside) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "all", label: "All time" },
];

export function RangeControl() {
  const preset = useRangePreset((s) => s.preset);
  const setPreset = useRangePreset((s) => s.setPreset);
  return (
    <div role="group" aria-label="Period" className="inline-flex rounded-pill border border-line bg-surface p-1">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          aria-pressed={preset === p.id}
          onClick={() => setPreset(p.id)}
          className={cn(
            "rounded-pill px-3.5 py-1.5 text-sm font-semibold transition-colors",
            preset === p.id ? "bg-foil text-on-accent" : "text-muted hover:text-fg",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

const roleTone: Record<AppRole, string> = {
  player: "border-line text-muted",
  admin: "border-glow/50 text-fg bg-[color-mix(in_oklab,var(--glow)_14%,transparent)]",
  super_admin: "border-transparent bg-foil text-on-accent",
};

export function RoleBadge({ role, className }: { role: AppRole; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-pill border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", roleTone[role], className)}>
      {ROLE_LABEL[role]}
    </span>
  );
}

const statusLabel: Record<AccountStatus, string> = {
  active: "Active",
  suspended: "Suspended",
  self_excluded: "Self-excluded",
  closed: "Closed",
};

export function StatusBadge({ status }: { status: AccountStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap",
        status === "active" ? "text-success" : status === "suspended" ? "text-danger" : "text-muted",
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {statusLabel[status]}
    </span>
  );
}

export function SourceBadge() {
  return (
    <span className="ml-2 inline-flex rounded-pill border border-accent/40 bg-accent-soft px-2 py-px align-middle text-[11px] font-semibold text-accent">
      This browser
    </span>
  );
}
