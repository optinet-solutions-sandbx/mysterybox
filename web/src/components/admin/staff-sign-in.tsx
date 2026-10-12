"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { LogoMark } from "@/components/brand/logo-mark";
import { Field, PasswordField } from "@/components/auth/fields";
import { Button } from "@/components/ui/button";
import { useAuth, type Account } from "@/store/auth";

/** Back-office sign-in. Players who reach /admin are told it needs a staff account. */
export function StaffSignIn({ signedInPlayer }: { signedInPlayer: Account | null }) {
  const signIn = useAuth((s) => s.signIn);
  const signOut = useAuth((s) => s.signOut);
  const accounts = useAuth((s) => s.accounts);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const account = accounts[email.trim().toLowerCase()];
    if (account && account.role === "player") {
      setBusy(false);
      return setError("That's a player account. The back office needs an admin or super admin account.");
    }
    const res = await signIn(email, password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error === "suspended" ? "This staff account is suspended." : "That email and password don’t match a staff account.");
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-2.5rem)] place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <LogoMark className="w-12" sizes="48px" />
          <div>
            <p className="font-display text-sm font-semibold tracking-[0.12em] text-foil">GRAIL NOIR</p>
            <h1 className="font-display text-2xl font-semibold">Back office</h1>
          </div>
        </div>

        {signedInPlayer ? (
          <div className="rounded-2xl border border-line bg-surface p-6">
            <p className="font-semibold">You&rsquo;re signed in as a player</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {signedInPlayer.email} can&rsquo;t open the back office. Sign out, then sign in with a staff account.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={signOut}>Sign out</Button>
              <Link href="/" className="inline-flex h-11 items-center px-2 text-sm font-semibold text-accent underline-offset-4 hover:underline">
                Back to the site
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <p className="text-sm text-muted">For Grail Noir staff. Admins and super admins only.</p>
            <div className="mt-6 grid gap-5">
              <Field
                label="Work email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
              />
              <PasswordField
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  setError(null);
                }}
                autoComplete="current-password"
              />
            </div>
            <p role="alert" className="mt-3 min-h-5 text-sm font-medium text-danger">
              {error}
            </p>
            <Button type="submit" size="lg" disabled={busy} className="mt-2 w-full">
              {busy ? "Signing in…" : "Sign in to the back office"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-sm leading-relaxed text-muted">
          Staff accounts are issued by a super admin. If you need access, ask one of the team.
        </p>
      </div>
    </div>
  );
}
