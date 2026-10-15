"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { brand } from "@/config/brand";
import { LogoMark } from "@/components/brand/logo-mark";
import { button } from "@/components/ui/button";
import { formatBalance } from "@/domain/money";
import { totalBalance } from "@/domain/wallet";
import { cn } from "@/lib/cn";
import { useCurrentAccount, useHydrated } from "@/store/app";
import { openAddFunds, openAuth } from "@/store/ui";
import { AccountMenu } from "./account-menu";
import { isActive, NAV, navDirection } from "./nav";

export function TopBar() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const account = useCurrentAccount();

  return (
    <header style={{ viewTransitionName: "site-header" }} className="sticky top-0 z-40 bg-[linear-gradient(180deg,var(--bg)_55%,color-mix(in_oklab,var(--bg)_80%,transparent))]">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 md:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${brand.name}, all boxes`}>
          <LogoMark className="w-11" sizes="44px" />
          {/* The spaced wordmark fits beside Sign in / Sign up from ~380px; signed in, the balance pill grows with
              the balance, so phones show the mark only (as play/ does). */}
          <span className={cn("relative pl-1 text-[19px] font-normal tracking-[0.5em] text-fg", account ? "max-sm:hidden" : "max-[379px]:hidden")}>
            {brand.name}
            <sup aria-hidden className="absolute top-0 -right-1 text-[7px] tracking-normal text-muted">
              TM
            </sup>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden flex-1 justify-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                transitionTypes={navDirection(pathname, item.href)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-pill px-4 py-2 text-[15px] font-medium transition-colors",
                  active ? "text-fg" : "text-muted hover:text-fg",
                )}
              >
                {item.label}
                {active && <span aria-hidden className="absolute inset-x-4 -bottom-[13px] h-0.5 rounded-full bg-hot" />}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {!hydrated ? (
            <span className="h-10 w-36 rounded-pill bg-surface/60" aria-hidden />
          ) : account ? (
            <>
              <div className="flex h-10 items-center rounded-pill border border-line bg-surface/70 pr-1 pl-4">
                <Link href="/wallet" className="font-price text-[15px] font-semibold tabular" aria-label="Wallet">
                  {formatBalance(totalBalance(account.balances))}
                </Link>
                <button
                  type="button"
                  onClick={() => openAddFunds()}
                  aria-label="Add funds"
                  className="btn-foil ml-3 grid size-8 place-items-center rounded-full text-on-accent"
                >
                  <Plus className="size-4" strokeWidth={2.5} />
                </button>
              </div>
              <AccountMenu account={account} />
            </>
          ) : (
            <>
              <button type="button" onClick={() => openAuth("sign-in")} className={button({ variant: "ghost", size: "sm", className: "font-normal text-fg/90" })}>
                Sign in
              </button>
              <button type="button" onClick={() => openAuth("sign-up")} className={button({ variant: "velvet", size: "sm", className: "font-medium" })}>
                Sign up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
