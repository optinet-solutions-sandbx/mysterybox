"use client";

import type { Account } from "@/store/auth";
import { useAuth } from "@/store/auth";
import { Button, ButtonLink } from "@/components/ui/button";

/** Shown on /register and /sign-in when someone is already signed in. */
export function SignedInNotice({ user }: { user: Account }) {
  const signOut = useAuth((s) => s.signOut);
  return (
    <div>
      <h2 className="font-display text-3xl font-semibold">You&rsquo;re signed in</h2>
      <p className="mt-3 leading-relaxed text-muted">
        Signed in as <strong className="font-semibold text-fg">{user.email}</strong>. Sign out first to use another account.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <ButtonLink href="/boxes">Browse boxes</ButtonLink>
        <Button variant="secondary" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
