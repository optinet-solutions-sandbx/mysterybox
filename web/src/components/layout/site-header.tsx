"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Menu, Package, Plus, X } from "lucide-react";
import { primaryNav } from "@/config/nav";
import { formatCredit, formatUsd } from "@/domain/money";
import { useAuthHydrated, useCurrentUser, type Account } from "@/store/auth";
import { useSession, useSessionHydrated } from "@/store/session";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "./theme-toggle";
import { Wordmark } from "./wordmark";

/** Transparent over the hero, smoked glass once scrolled; slides away while reading down. */
export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll();
  const authHydrated = useAuthHydrated();
  const user = useCurrentUser();

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setSolid(y > 24);
    setHidden(y > 480 && y > prev && !menuOpen);
  });

  return (
    <motion.header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-500",
        solid || menuOpen ? "border-b border-line bg-bg/75 backdrop-blur-xl" : "border-b border-transparent",
      )}
      animate={{ y: hidden ? "-100%" : "0%" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-8 px-4 sm:px-6 lg:px-8">
        <Wordmark />
        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          {primaryNav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={cn("relative py-2 text-[15px] font-medium transition-colors", active ? "text-fg" : "text-muted hover:text-fg")}>
                {item.label}
                {active && <motion.span layoutId="nav-underline" className="absolute inset-x-0 -bottom-0.5 h-px bg-accent" />}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {!authHydrated ? (
            <span aria-hidden className="w-24" />
          ) : user ? (
            <>
              {user.role !== "player" && (
                <Link href="/admin" className={cn(buttonClasses({ variant: "secondary", size: "sm" }), "hidden md:inline-flex")}>
                  Back office
                </Link>
              )}
              <InventoryLink />
              <BalancePill />
              <AccountLink user={user} />
            </>
          ) : (
            <>
              <Link href="/sign-in" className={cn(buttonClasses({ variant: "secondary", size: "sm" }), "px-3.5 sm:px-4")}>
                Sign in
              </Link>
              <Link href="/register" className={cn(buttonClasses({ size: "sm" }), "px-3.5 sm:px-4")}>
                Join
              </Link>
            </>
          )}
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full text-fg hover:bg-surface lg:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            aria-label="Mobile"
            className="overflow-hidden lg:hidden"
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="grid gap-1 px-4 pt-2 pb-6">
              {[
                ...primaryNav,
                ...(user
                  ? [
                      { href: "/inventory", label: "Inventory" },
                      { href: "/wallet", label: "Wallet" },
                      { href: "/account", label: "Account" },
                      ...(user.role !== "player" ? [{ href: "/admin", label: "Back office" }] : []),
                    ]
                  : [
                      { href: "/sign-in", label: "Sign in" },
                      { href: "/register", label: "Create account" },
                    ]),
              ].map((item, i) => (
                <motion.div key={item.href} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                  <Link href={item.href} onClick={() => setMenuOpen(false)} className="block py-2.5 font-display text-3xl font-semibold">
                    {item.label}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

function BalancePill() {
  const hydrated = useSessionHydrated();
  const balance = useSession((s) => s.balance);
  const credit = useSession((s) => s.boxApi.ledger.reduce((sum, e) => sum + e.delta, 0));
  return (
    <Link
      href="/wallet"
      className="flex h-10 items-center gap-2 rounded-pill border border-line bg-surface/60 pr-1 pl-4 backdrop-blur transition-colors hover:border-accent/70"
      aria-label="Wallet"
    >
      <span className={cn("text-sm font-semibold tabular", !hydrated && "animate-pulse text-subtle")}>
        {hydrated ? formatUsd(balance) : "$—"}
      </span>
      {hydrated && credit > 0 && (
        <span className="hidden text-xs font-semibold text-accent tabular sm:inline" title="Site credit buys boxes and can't be withdrawn">
          + {formatCredit(credit)}
        </span>
      )}
      <span className="grid size-8 place-items-center rounded-full bg-foil text-on-accent">
        <Plus className="size-4" />
      </span>
    </Link>
  );
}

function InventoryLink() {
  const hydrated = useSessionHydrated();
  const held = useSession((s) => s.inventory.filter((i) => i.status === "held").length);
  return (
    <Link
      href="/inventory"
      className="relative grid size-10 place-items-center rounded-full text-muted transition-colors hover:text-fg"
      aria-label={`Inventory${hydrated && held ? `, ${held} items` : ""}`}
    >
      <Package className="size-5" strokeWidth={1.5} />
      {hydrated && held > 0 && (
        <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-foil px-1 text-[10px] font-semibold text-on-accent">
          {held}
        </span>
      )}
    </Link>
  );
}

function AccountLink({ user }: { user: Account }) {
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  return (
    <Link
      href="/account"
      className="hidden size-10 place-items-center rounded-full border border-line bg-surface/60 font-display text-sm font-bold text-accent transition-colors hover:border-accent/70 sm:grid"
      aria-label={`Account: ${user.firstName} ${user.lastName}`}
    >
      {initials}
    </Link>
  );
}
