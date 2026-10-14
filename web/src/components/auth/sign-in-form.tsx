"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { brand } from "@/config/brand";
import { isValidEmail } from "@/domain/auth";
import { useAuth, useAuthHydrated, useCurrentUser } from "@/store/auth";
import { scrollToElement } from "@/components/fx/smooth-scroll";
import { Button } from "@/components/ui/button";
import { Field, PasswordField } from "./fields";
import { SignedInNotice } from "./signed-in-notice";
import { useNextPath, withNext } from "./use-next-path";
import { VerifyStep } from "./verify-step";

export function SignInForm() {
  const router = useRouter();
  const next = useNextPath();
  const hydrated = useAuthHydrated();
  const user = useCurrentUser();
  const signIn = useAuth((s) => s.signIn);
  const formRef = useRef<HTMLFormElement>(null);

  const [step, setStep] = useState<"details" | "verify">("details");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);
  const [busy, setBusy] = useState(false);
  // The account this form just signed in; while navigating away, don't flash the "already signed in" card.
  const [arrivedAs, setArrivedAs] = useState<string | null>(null);

  if (!hydrated) return <div className="h-[420px] animate-pulse rounded-xl bg-surface/50" />;
  if (user && step === "details" && user.email !== arrivedAs) return <SignedInNotice user={user} />;

  if (step === "verify") {
    return <VerifyStep onVerified={() => router.push(next)} onBack={() => setStep("details")} backLabel="Back to sign in" />;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setForgot(false);
    if (!isValidEmail(email) || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    // Set before the store flips: useSyncExternalStore re-renders synchronously on sign-in.
    setArrivedAs(email.trim().toLowerCase());
    const res = await signIn(email, password);
    setBusy(false);
    if (res.ok) return router.push(next);
    if (res.error === "suspended") {
      setError("This account is suspended. Contact support to find out more.");
      return;
    }
    if (res.error === "unverified") {
      if (formRef.current) scrollToElement(formRef.current, -120);
      return setStep("verify");
    }
    setError("That email and password don’t match an account. Check them and try again.");
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <h2 className="font-display text-3xl font-semibold">Welcome back</h2>
      <p className="mt-2 text-muted">Sign in with the email you registered with.</p>

      <div className="mt-8 grid gap-5">
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
        />
        <div>
          <PasswordField
            value={password}
            onChange={(v) => {
              setPassword(v);
              setError(null);
            }}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setForgot((v) => !v)}
            aria-expanded={forgot}
            className="mt-2 text-sm font-semibold text-accent underline-offset-4 hover:underline"
          >
            Forgot password?
          </button>
          {forgot && (
            <p className="mt-2 rounded-xl bg-accent-soft px-4 py-3 text-sm leading-relaxed">
              Password reset emails arrive with the real backend. In this prototype, accounts live only in this browser, so
              create a new one if you&rsquo;ve lost the password.
            </p>
          )}
        </div>
      </div>

      <p role="alert" className="mt-4 min-h-5 text-sm font-medium text-danger">
        {error}
      </p>

      <Button type="submit" size="lg" disabled={busy} className="mt-2 w-full">
        {busy ? "Signing in…" : "Sign in"}
      </Button>

      <p className="mt-6 border-t border-line pt-6 text-center text-sm">
        New to {brand.name}?{" "}
        <Link href={withNext("/register", next)} className="font-semibold text-accent underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
