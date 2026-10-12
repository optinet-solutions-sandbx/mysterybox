"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { BadgeCheck, LogOut } from "lucide-react";
import { formatPhoneInput } from "@/domain/auth";
import { formatUsd } from "@/domain/money";
import { useAuth, useAuthHydrated, useCurrentUser } from "@/store/auth";
import { useSession, useSessionHydrated } from "@/store/session";
import { AuthPrompt } from "@/components/auth/auth-prompt";
import { Button, ButtonLink } from "@/components/ui/button";
import { ROLE_LABEL } from "@/backend/contract";
import { cn } from "@/lib/cn";

const comingSoon = [
  "Identity verification before withdrawals and high-value shipping.",
  "Saved US shipping addresses.",
  "Deposit and loss limits, cool-off and self-exclusion.",
];

export function AccountView() {
  const router = useRouter();
  const authHydrated = useAuthHydrated();
  const sessionHydrated = useSessionHydrated();
  const user = useCurrentUser();
  const signOut = useAuth((s) => s.signOut);
  const setMarketing = useAuth((s) => s.setMarketing);
  const balance = useSession((s) => s.balance);
  const held = useSession((s) => s.inventory.filter((i) => i.status === "held").length);

  if (!authHydrated) return <div className="h-80 animate-pulse rounded-card bg-surface" />;
  if (!user) {
    return <AuthPrompt title="Sign in to see your account" body="Your details, contact preferences and sign-out live here." />;
  }

  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  const since = new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-card border border-line bg-[image:var(--card)] p-6 sm:p-8">
        <div className="flex items-center gap-5">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-foil font-display text-xl font-bold text-on-accent">
            {initials}
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-display text-3xl font-semibold">
              {user.firstName} {user.lastName}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {user.role === "player" ? "Member" : ROLE_LABEL[user.role]} since {since}
            </p>
          </div>
        </div>

        <dl className="mt-8 divide-y divide-line border-y border-line">
          <Row label="Email">
            <span className="break-all">{user.email}</span>
            <span className="ml-2 inline-flex items-center gap-1 align-middle text-sm font-semibold text-success">
              <BadgeCheck className="size-4" /> Verified
            </span>
          </Row>
          <Row label="Phone">
            <span className="tabular">
              {user.dial} {formatPhoneInput(user.dial, user.phone)}
            </span>
          </Row>
        </dl>

        <div className="mt-8 flex items-start justify-between gap-6">
          <div>
            <p id="marketing-label" className="font-semibold">
              Drops, free boxes and results
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">By email and text. You can change this anytime.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={user.marketing}
            aria-labelledby="marketing-label"
            onClick={() => setMarketing(!user.marketing)}
            className={cn(
              "relative mt-1 h-7 w-12 shrink-0 rounded-pill border transition-colors",
              user.marketing ? "border-transparent bg-foil" : "border-line bg-surface",
            )}
          >
            <span
              className={cn(
                "absolute top-1/2 left-1 size-5 -translate-y-1/2 rounded-full transition-transform duration-300 ease-snap",
                user.marketing ? "translate-x-5 bg-on-accent" : "bg-muted",
              )}
            />
          </button>
        </div>
      </section>

      <aside className="grid gap-6">
        <section className="rounded-card border border-line bg-[image:var(--card)] p-6">
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted">Demo balance</dt>
              <dd className="mt-1 font-display text-2xl font-semibold tabular">{sessionHydrated ? formatUsd(balance) : "—"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Pieces held</dt>
              <dd className="mt-1 font-display text-2xl font-semibold tabular">{sessionHydrated ? held : "—"}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
            <Link href="/inventory" className="text-accent underline-offset-4 hover:underline">
              Inventory
            </Link>
            <Link href="/wallet" className="text-accent underline-offset-4 hover:underline">
              Wallet
            </Link>
            <Link href="/provably-fair" className="text-accent underline-offset-4 hover:underline">
              Provably fair
            </Link>
          </div>
          {user.role !== "player" && (
            <ButtonLink href="/admin" className="mt-6 w-full">
              Open the back office
            </ButtonLink>
          )}
          <Button
            variant="secondary"
            className="mt-6 w-full"
            onClick={() => {
              signOut();
              router.push("/");
            }}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </section>

        <section className="rounded-card border border-dashed border-line p-6">
          <h3 className="font-semibold">Coming with real accounts</h3>
          <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-muted">
            {comingSoon.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[140px_1fr] sm:items-center">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
