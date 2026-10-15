"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { button } from "@/components/ui/button";
import { useCurrentAccount, useHydrated, type Account } from "@/store/app";
import { openAuth } from "@/store/ui";

/** Renders the signed-in view, or an invitation to sign up. Nothing until this browser's data is read. */
export function RequireAccount({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: (account: Account) => ReactNode;
}) {
  const hydrated = useHydrated();
  const account = useCurrentAccount();
  if (!hydrated) return <div className="h-64" aria-busy="true" />;
  if (!account) {
    return (
      <div className="rounded-[32px] border border-line/80 bg-[var(--card)] px-6 py-12 text-center md:py-16">
        <h2 className="font-punch text-3xl">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-muted">{body}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => openAuth("sign-up")} className={button({ size: "lg" })}>
            Create an account
          </button>
          <button type="button" onClick={() => openAuth("sign-in")} className={button({ variant: "outline", size: "lg" })}>
            Sign in
          </button>
        </div>
      </div>
    );
  }
  return <>{children(account)}</>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: { href: string; label: string } }) {
  return (
    <div className="rounded-[28px] border border-dashed border-line px-6 py-12 text-center">
      <p className="font-display text-xl">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-muted">{body}</p>
      {action && (
        <Link href={action.href} className={button({ className: "mt-6" })}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
