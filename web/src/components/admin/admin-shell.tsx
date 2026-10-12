"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { BarChart3, Boxes, ExternalLink, Lock, LogOut, ScrollText, ShieldCheck, Users } from "lucide-react";
import { can, type Permission } from "@/backend/contract";
import { LogoMark } from "@/components/brand/logo-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth, useAuthHydrated, useCurrentUser } from "@/store/auth";
import { cn } from "@/lib/cn";
import { StaffSignIn } from "./staff-sign-in";
import { RoleBadge } from "./ui";

const NAV: { href: string; label: string; icon: typeof Users; permission: Permission }[] = [
  { href: "/admin", label: "Dashboard", icon: BarChart3, permission: "backoffice.view" },
  { href: "/admin/players", label: "Players", icon: Users, permission: "players.view" },
  { href: "/admin/boxes", label: "Boxes & odds", icon: Boxes, permission: "catalog.manage" },
  { href: "/admin/staff", label: "Staff & roles", icon: ShieldCheck, permission: "staff.manage" },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText, permission: "audit.view" },
];

/** Back-office frame: staff-only gate, sidebar (top strip on phones), signed-in staff member. */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const user = useCurrentUser();
  const signOut = useAuth((s) => s.signOut);

  if (!hydrated) return <div className="m-6 h-[70vh] animate-pulse rounded-2xl bg-surface" />;
  if (!user || !can(user.role, "backoffice.view")) return <StaffSignIn signedInPlayer={user} />;

  const nav = (
    <ul className="flex gap-1 lg:flex-col">
      {NAV.map(({ href, label, icon: Icon, permission }) => {
        const allowed = can(user.role, permission);
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <li key={href} className="shrink-0">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors",
                active ? "bg-accent-soft text-fg shadow-[inset_2px_0_0_var(--accent)]" : "text-muted hover:bg-surface hover:text-fg",
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.75} />
              {label}
              {!allowed && <Lock className="ml-auto size-3.5 text-subtle" aria-label="Super admin only" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="lg:grid lg:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-bg lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 lg:px-5 lg:pt-6 lg:pb-6">
          <LogoMark className="w-10" sizes="40px" />
          <div className="min-w-0 leading-tight">
            <p className="font-display text-sm font-semibold tracking-[0.12em] text-foil">GRAIL NOIR</p>
            <p className="text-xs font-semibold text-muted">Back office</p>
          </div>
          <div className="ml-auto lg:hidden">
            <ThemeToggle />
          </div>
        </div>
        <nav aria-label="Back office" className="overflow-x-auto px-3 pb-3 lg:flex-1 lg:px-3 lg:pb-0">
          {nav}
        </nav>
        <div className="hidden border-t border-line p-4 lg:block">
          <p className="truncate text-sm font-semibold">
            {user.firstName} {user.lastName}
          </p>
          <p className="truncate text-xs text-muted">{user.email}</p>
          <RoleBadge role={user.role} className="mt-2" />
          <div className="mt-4 flex items-center gap-1">
            <ThemeToggle />
            <Link href="/" className="grid size-10 place-items-center rounded-full text-muted hover:text-fg" aria-label="View site">
              <ExternalLink className="size-4" />
            </Link>
            <button
              type="button"
              onClick={() => {
                signOut();
                router.push("/admin");
              }}
              className="ml-auto inline-flex items-center gap-2 rounded-pill border border-line px-3.5 py-2 text-sm font-semibold hover:border-accent/70"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </div>
      </aside>
      <div className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-2.5 lg:hidden">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {user.firstName} {user.lastName}
            </p>
            <RoleBadge role={user.role} className="mt-1" />
          </div>
          <button
            type="button"
            onClick={() => {
              signOut();
              router.push("/admin");
            }}
            className="inline-flex shrink-0 items-center gap-2 rounded-pill border border-line px-3.5 py-2 text-sm font-semibold"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Page-level guard for super-admin pages (the server functions enforce the same rule). */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const user = useCurrentUser();
  if (can(user?.role, permission)) return children;
  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-dashed border-line p-8 text-center">
      <Lock className="mx-auto size-6 text-accent" />
      <h1 className="mt-4 font-display text-2xl font-semibold">Super admin only</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Admins run players, payments and boxes. Staff roles, balance adjustments and the audit log need a super admin.
      </p>
    </div>
  );
}
