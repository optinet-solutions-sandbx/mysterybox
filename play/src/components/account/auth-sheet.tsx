"use client";

import { useState, type FormEvent } from "react";
import { brand } from "@/config/brand";
import { economy } from "@/config/economy";
import { button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { emailError, usernameError } from "@/domain/account";
import { formatUsd } from "@/domain/money";
import { signIn, signUp, useApp } from "@/store/app";
import { closeAuth, openAuth, toast, useUi } from "@/store/ui";

export function AuthSheet() {
  const mode = useUi((s) => s.auth);
  return (
    <Sheet open={mode !== null} onClose={closeAuth} title={mode === "sign-in" ? "Sign in" : "Create your account"}>
      {mode === "sign-in" ? <SignInForm /> : <SignUpForm />}
    </Sheet>
  );
}

function SignUpForm() {
  const pendingRef = useApp((s) => s.pendingRef);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [referral, setReferral] = useState(pendingRef ?? "");
  const [adult, setAdult] = useState(false);
  const [errors, setErrors] = useState<{ username?: string | null; email?: string | null; adult?: string | null }>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next = {
      username: usernameError(username),
      email: emailError(email),
      adult: adult ? null : `Confirm you are ${brand.minimumAge} or older.`,
    };
    setErrors(next);
    if (next.username || next.email || next.adult) return;
    setBusy(true);
    const result = await signUp({ username, email, referral });
    setBusy(false);
    if (!result.ok) {
      setErrors({ [result.field]: result.error });
      return;
    }
    closeAuth();
    toast(`Welcome, ${username.trim()}. ${formatUsd(economy.demoCredit)} of demo credit is in your wallet.`);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="text-muted">
        Prototype accounts start with {formatUsd(economy.demoCredit)} of demo credit and stay in this browser.
      </p>
      <Field label="Username" value={username} onChange={(e) => setUsername(e.target.value)} error={errors.username} autoComplete="username" maxLength={20} />
      <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} autoComplete="email" inputMode="email" />
      <Field
        label="Referral code (optional)"
        value={referral}
        onChange={(e) => setReferral(e.target.value.toUpperCase())}
        hint={`Adds ${formatUsd(economy.referralReward)} of credit to your new account.`}
        autoCapitalize="characters"
        maxLength={20}
      />
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-0.5 size-5 accent-[var(--gold)]" />
        <span>
          I&apos;m {brand.minimumAge} or older and live in the {brand.market}.
          {errors.adult && <span className="mt-1 block text-danger">{errors.adult}</span>}
        </span>
      </label>
      <button type="submit" disabled={busy} className={button({ size: "lg", className: "w-full" })}>
        {busy ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-sm text-muted">
        Already have one?{" "}
        <button type="button" onClick={() => openAuth("sign-in")} className="font-semibold text-accent">
          Sign in
        </button>
      </p>
    </form>
  );
}

function SignInForm() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!signIn(value)) {
      setError("No account with that email or username in this browser. Prototype accounts stay where they were made.");
      return;
    }
    closeAuth();
    toast("Signed in.");
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Email or username" value={value} onChange={(e) => setValue(e.target.value)} error={error} autoComplete="username" />
      <button type="submit" className={button({ size: "lg", className: "w-full" })}>
        Sign in
      </button>
      <p className="text-center text-sm text-muted">
        New here?{" "}
        <button type="button" onClick={() => openAuth("sign-up")} className="font-semibold text-accent">
          Create an account
        </button>
      </p>
    </form>
  );
}
