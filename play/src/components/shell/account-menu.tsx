"use client";

import { CircleHelp, LogOut, Moon, Sun, Wallet } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Sheet } from "@/components/ui/sheet";
import { formatBalance } from "@/domain/money";
import { levelFor, pointsFor } from "@/domain/wallet";
import { readTheme, setTheme, subscribeTheme } from "@/lib/theme";
import { signOut, type Account } from "@/store/app";

export function Avatar({ name, className = "size-10 text-base" }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_25%,var(--champagne-300),var(--champagne-500)_55%,var(--champagne-700))] font-display font-semibold text-[var(--onyx-wine)] ${className}`}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function ThemeSwitch() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "dark" as const);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-surface-2"
    >
      {theme === "dark" ? <Sun className="size-5 text-muted" /> : <Moon className="size-5 text-muted" />}
      Switch to {next} mode
    </button>
  );
}

export function AccountMenu({ account }: { account: Account }) {
  const [open, setOpen] = useState(false);
  const { level } = levelFor(pointsFor(account.spent));
  const close = () => setOpen(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Account" className="rounded-full">
        <Avatar name={account.username} />
      </button>
      <Sheet open={open} onClose={close} title="Account">
        <div className="flex items-center gap-4 rounded-3xl bg-surface-2/60 p-4">
          <Avatar name={account.username} className="size-14 text-xl" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{account.username}</p>
            <p className="truncate text-sm text-muted">{account.email}</p>
            <p className="mt-1 text-sm text-accent">{level.name} level</p>
          </div>
        </div>
        <ul className="mt-4 space-y-1">
          <li>
            <Link href="/wallet" onClick={close} className="flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-surface-2">
              <Wallet className="size-5 text-muted" />
              Wallet
              <span className="ml-auto font-display text-sm tabular text-muted">
                {formatBalance(account.balances.credit + account.balances.withdrawable)}
              </span>
            </Link>
          </li>
          <li>
            <Link href="/help" onClick={close} className="flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-surface-2">
              <CircleHelp className="size-5 text-muted" />
              Help
            </Link>
          </li>
          <li>
            <ThemeSwitch />
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                signOut();
                close();
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-surface-2"
            >
              <LogOut className="size-5 text-muted" />
              Sign out
            </button>
          </li>
        </ul>
      </Sheet>
    </>
  );
}
