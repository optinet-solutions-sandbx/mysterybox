"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ExternalLink, Lock, LogOut, Menu, X } from "lucide-react";
import { can, ROLE_LABEL, type Permission } from "@/backend/contract";
import { LogoMark } from "@/components/brand/logo-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth, useAuthHydrated, useCurrentUser } from "@/store/auth";
import { cn } from "@/lib/cn";
import { StaffSignIn } from "./staff-sign-in";

/**
 * Back-office frame, laid out like the reference casino back office (docs/09-backoffice-reference.md):
 * a top bar of module menus (Games → Boxes, Tournaments → Battles), the staff member's menu on the
 * right, and a breadcrumb + title band on every page (PageTitle in ./ui).
 */

interface MenuLink {
  href: string;
  label: string;
  permission?: Permission;
}
interface MenuGroup {
  label: string;
  match: string;
  href?: string;
  items?: MenuLink[];
}

const MENU: MenuGroup[] = [
  { label: "Dashboard", match: "/admin", href: "/admin" },
  {
    label: "Players",
    match: "/admin/players",
    items: [
      { href: "/admin/players", label: "All players" },
      { href: "/admin/players/groups", label: "Groups" },
      { href: "/admin/players?filter=locked", label: "Locked players" },
      { href: "/admin/players?filter=pending", label: "Withdrawal pending" },
    ],
  },
  {
    label: "Boxes",
    match: "/admin/boxes",
    items: [
      { href: "/admin/boxes", label: "Boxes & odds" },
      { href: "/admin/boxes/openings", label: "Box openings" },
    ],
  },
  {
    label: "Payments",
    match: "/admin/payments",
    items: [
      { href: "/admin/payments", label: "All payments" },
      { href: "/admin/payments?type=deposit", label: "Deposits" },
      { href: "/admin/payments?type=withdrawal", label: "Withdrawals" },
      { href: "/admin/payments?status=pending", label: "Pending" },
    ],
  },
  { label: "Feed", match: "/admin/feed", href: "/admin/feed" },
  {
    label: "Bonuses",
    match: "/admin/bonuses",
    items: [
      { href: "/admin/bonuses", label: "Issued bonuses" },
      { href: "/admin/bonuses#loyalty", label: "Loyalty points" },
    ],
  },
  { label: "Battles", match: "/admin/battles", items: [{ href: "/admin/battles", label: "Battles & leaderboards" }] },
];

const USER_MENU: MenuLink[] = [
  { href: "/admin/staff", label: "Staff & roles", permission: "staff.manage" },
  { href: "/admin/audit", label: "Audit log", permission: "audit.view" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const hydrated = useAuthHydrated();
  const user = useCurrentUser();

  if (!hydrated) return <div className="m-6 h-[70vh] animate-pulse rounded-2xl bg-surface" />;
  if (!user || !can(user.role, "backoffice.view")) return <StaffSignIn signedInPlayer={user} />;

  return (
    <div className="min-h-[calc(100vh-2.5rem)]">
      <TopBar />
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
    </div>
  );
}

function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser()!;
  const signOut = useAuth((s) => s.signOut);
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const bar = useRef<HTMLElement>(null);

  // Close menus on outside click and Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!bar.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (g: MenuGroup) => (g.match === "/admin" ? pathname === "/admin" : pathname.startsWith(g.match));
  const close = () => {
    setOpen(null);
    setMobile(false);
  };
  const leave = () => {
    close();
    signOut();
    router.push("/admin");
  };

  return (
    <header ref={bar} className="sticky top-0 z-40 border-b border-line bg-surface-2">
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-2 px-4 sm:px-6 lg:px-8">
        <Link href="/admin" onClick={close} className="mr-4 flex shrink-0 items-center gap-2.5">
          <LogoMark className="w-9" sizes="36px" />
          <span className="font-display text-sm font-semibold tracking-[0.12em] text-foil">GRAIL NOIR</span>
        </Link>

        <nav aria-label="Back office" className="hidden items-center gap-0.5 lg:flex">
          {MENU.map((g) =>
            g.href ? (
              <Link
                key={g.label}
                href={g.href}
                onClick={close}
                aria-current={isActive(g) ? "page" : undefined}
                className={cn("rounded-lg px-3 py-2 text-sm font-semibold transition-colors", isActive(g) ? "bg-accent-soft text-fg" : "text-muted hover:text-fg")}
              >
                {g.label}
              </Link>
            ) : (
              <div key={g.label} className="relative">
                <button
                  type="button"
                  aria-expanded={open === g.label}
                  aria-haspopup="true"
                  onClick={() => setOpen(open === g.label ? null : g.label)}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    isActive(g) ? "bg-accent-soft text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {g.label}
                  <ChevronDown className={cn("size-3.5 transition-transform", open === g.label && "rotate-180")} />
                </button>
                {open === g.label && <Dropdown items={g.items!} onPick={close} />}
              </div>
            ),
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <div className="relative hidden lg:block">
            <button
              type="button"
              aria-expanded={open === "user"}
              aria-haspopup="true"
              onClick={() => setOpen(open === "user" ? null : "user")}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-accent-soft"
            >
              <span className="grid size-7 place-items-center rounded-full bg-foil text-xs font-bold text-on-accent">{user.firstName[0]}</span>
              {user.firstName}
              <ChevronDown className="size-3.5" />
            </button>
            {open === "user" && (
              <div className="absolute top-full right-0 z-50 mt-1 w-64 rounded-xl border border-line bg-bg p-1.5 shadow-[0_20px_50px_-20px_var(--shadow-strong)]">
                <div className="border-b border-line px-3 pt-2 pb-3">
                  <p className="truncate text-sm font-semibold">{user.email}</p>
                  <p className="text-xs text-muted">{ROLE_LABEL[user.role]}</p>
                </div>
                <UserLinks onPick={close} onSignOut={leave} />
              </div>
            )}
          </div>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-lg text-fg lg:hidden"
            aria-label={mobile ? "Close menu" : "Open menu"}
            aria-expanded={mobile}
            onClick={() => setMobile((v) => !v)}
          >
            {mobile ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobile && (
        <nav aria-label="Back office" className="max-h-[75vh] overflow-y-auto border-t border-line px-4 pt-2 pb-4 lg:hidden">
          {MENU.map((g) => (
            <div key={g.label} className="border-b border-line py-2 last:border-0">
              {g.href ? (
                <Link href={g.href} onClick={close} className="block py-1.5 text-sm font-semibold">
                  {g.label}
                </Link>
              ) : (
                <>
                  <p className="py-1 text-xs font-semibold text-muted">{g.label}</p>
                  {g.items!.map((i) => (
                    <Link key={i.href} href={i.href} onClick={close} className="block py-1.5 pl-3 text-sm font-semibold">
                      {i.label}
                    </Link>
                  ))}
                </>
              )}
            </div>
          ))}
          <div className="pt-2">
            <p className="py-1 text-xs font-semibold text-muted">
              {user.email} · {ROLE_LABEL[user.role]}
            </p>
            <UserLinks onPick={close} onSignOut={leave} />
          </div>
        </nav>
      )}
    </header>
  );
}

function Dropdown({ items, onPick }: { items: MenuLink[]; onPick: () => void }) {
  return (
    <ul className="absolute top-full left-0 z-50 mt-1 min-w-52 rounded-xl border border-line bg-bg p-1.5 shadow-[0_20px_50px_-20px_var(--shadow-strong)]">
      {items.map((i) => (
        <li key={i.href}>
          <Link href={i.href} onClick={onPick} className="block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-accent-soft">
            {i.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function UserLinks({ onPick, onSignOut }: { onPick: () => void; onSignOut: () => void }) {
  const user = useCurrentUser();
  return (
    <ul className="grid gap-0.5 pt-1.5">
      {USER_MENU.map((i) => (
        <li key={i.href}>
          <Link href={i.href} onClick={onPick} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold hover:bg-accent-soft">
            {i.label}
            {i.permission && !can(user?.role, i.permission) && <Lock className="size-3.5 text-subtle" aria-label="Super admin only" />}
          </Link>
        </li>
      ))}
      <li>
        <Link href="/" onClick={onPick} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold hover:bg-accent-soft">
          View site <ExternalLink className="size-3.5 text-subtle" />
        </Link>
      </li>
      <li>
        <button type="button" onClick={onSignOut} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold hover:bg-accent-soft">
          Sign out <LogOut className="size-3.5 text-subtle" />
        </button>
      </li>
    </ul>
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
