"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { brand } from "@/config/brand";
import { DIAL_CODES, validateRegistration, type RegistrationErrors } from "@/domain/auth";
import { useAuth, useAuthHydrated, useCurrentUser } from "@/store/auth";
import { scrollToElement } from "@/components/fx/smooth-scroll";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, PasswordField, PhoneField } from "./fields";
import { SignedInNotice } from "./signed-in-notice";
import { useNextPath, withNext } from "./use-next-path";
import { VerifyStep } from "./verify-step";

/** MISTY's "Create your account": email, name, phone with country code (+ a password), then an email code. */
export function RegisterForm() {
  const router = useRouter();
  const next = useNextPath();
  const hydrated = useAuthHydrated();
  const user = useCurrentUser();
  const register = useAuth((s) => s.register);
  const formRef = useRef<HTMLFormElement>(null);

  const [step, setStep] = useState<"details" | "verify">("details");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dialIso, setDialIso] = useState(DIAL_CODES[0].iso);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmedAge, setConfirmedAge] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [errors, setErrors] = useState<RegistrationErrors & { exists?: boolean }>({});
  const [busy, setBusy] = useState(false);

  if (!hydrated) return <div className="h-[640px] animate-pulse rounded-xl bg-surface/50" />;
  if (user && step === "details") return <SignedInNotice user={user} />;

  if (step === "verify") {
    return <VerifyStep onVerified={() => router.push(next)} onBack={() => setStep("details")} backLabel="Change email" />;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const dial = DIAL_CODES.find((d) => d.iso === dialIso)?.dial ?? "+1";
    const input = { email, firstName, lastName, dial, phone, password, confirmedAge };
    const found = validateRegistration(input);
    setErrors(found);
    if (Object.keys(found).length) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setBusy(true);
    const res = await register({ ...input, marketing });
    setBusy(false);
    if (!res.ok) {
      if (res.error === "exists") setErrors({ email: "An account already uses this email.", exists: true });
      else setErrors({ email: res.message ?? "We couldn't create the account. Try again in a moment." });
      return;
    }
    if (res.signedIn) return router.push(next);
    if (formRef.current) scrollToElement(formRef.current, -120);
    setStep("verify");
  }

  const clear = (key: keyof RegistrationErrors) => errors[key] && setErrors((prev) => ({ ...prev, [key]: undefined }));

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <h2 className="font-display text-3xl font-semibold">Create your account</h2>
      <p className="mt-2 text-muted">It takes a minute. We&rsquo;ll email you a code to confirm it&rsquo;s you.</p>

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
            clear("email");
          }}
          error={errors.email}
        />
        {errors.exists && (
          <p className="-mt-3 text-sm">
            <Link href={withNext("/sign-in", next)} className="font-semibold text-accent underline-offset-4 hover:underline">
              Sign in instead
            </Link>
          </p>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="First name"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              clear("firstName");
            }}
            error={errors.firstName}
          />
          <Field
            label="Last name"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              clear("lastName");
            }}
            error={errors.lastName}
          />
        </div>
        <PhoneField
          dialIso={dialIso}
          onDialIso={setDialIso}
          value={phone}
          onChange={(v) => {
            setPhone(v);
            clear("phone");
          }}
          error={errors.phone}
        />
        <PasswordField
          value={password}
          onChange={(v) => {
            setPassword(v);
            clear("password");
          }}
          error={errors.password}
          autoComplete="new-password"
          showRules
        />
      </div>

      <div className="mt-7 grid gap-4 border-t border-line pt-6">
        <Checkbox
          checked={confirmedAge}
          onChange={(v) => {
            setConfirmedAge(v);
            clear("confirmedAge");
          }}
          error={errors.confirmedAge}
        >
          I&rsquo;m {brand.minimumAge} or older and I accept the{" "}
          <Link href="/legal/terms" className="font-semibold underline underline-offset-4">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="font-semibold underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </Checkbox>
        <Checkbox checked={marketing} onChange={setMarketing}>
          <span className="text-muted">Yes, send me new drops, free boxes and results by email and text. Unsubscribe anytime.</span>
        </Checkbox>
      </div>

      <Button type="submit" size="lg" disabled={busy} className="mt-8 w-full">
        {busy ? "Creating account…" : "Continue with email"}
      </Button>
      <p className="mt-4 text-center text-xs leading-relaxed text-muted">
        We use your email and phone to secure your account and update you about pieces you open and ship.
      </p>
      <p className="mt-6 border-t border-line pt-6 text-center text-sm">
        Already registered?{" "}
        <Link href={withNext("/sign-in", next)} className="font-semibold text-accent underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
