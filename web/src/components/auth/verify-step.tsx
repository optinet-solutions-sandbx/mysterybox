"use client";

import { useId, useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { useAuth } from "@/store/auth";
import { digitsOnly } from "@/domain/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * MISTY's one-time email code, kept as the second step after details + password. The prototype
 * sends no email, so the code is shown on screen; production emails it and never exposes it here.
 */
export function VerifyStep({ onVerified, onBack, backLabel }: { onVerified: () => void; onBack: () => void; backLabel: string }) {
  const pending = useAuth((s) => s.pending);
  const verify = useAuth((s) => s.verify);
  const resendCode = useAuth((s) => s.resendCode);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);
  const id = useId();

  if (!pending) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return setError("Enter the 6-digit code from the email.");
    setBusy(true);
    const ok = await verify(code);
    setBusy(false);
    if (!ok) return setError("That code doesn’t match. Check the email or send a new code.");
    onVerified();
  }

  return (
    <form onSubmit={submit} noValidate>
      <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent">
        <MailCheck className="size-6" strokeWidth={1.75} />
      </span>
      <h2 className="mt-5 font-display text-3xl font-semibold">Check your email</h2>
      <p className="mt-3 leading-relaxed text-muted">
        We sent a 6-digit code to <strong className="font-semibold text-fg">{pending.email}</strong>. Enter it to finish
        setting up your account.
      </p>

      {pending.code ? (
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-accent/50 bg-accent-soft px-4 py-3">
        <p className="text-sm">
          <span className="font-semibold">Prototype:</span> no email is sent. Your code is{" "}
          <span className="font-semibold tracking-[0.2em] tabular">{pending.code}</span>
        </p>
        <button
          type="button"
          onClick={() => {
            setCode(pending.code);
            setError(null);
          }}
          className="text-sm font-semibold text-accent underline-offset-4 hover:underline"
        >
          Fill it in
        </button>
      </div>
      ) : (
        <p className="mt-6 rounded-xl bg-accent-soft px-4 py-3 text-sm leading-relaxed">
          The code can take a minute to arrive. Check spam too. It expires after an hour.
        </p>
      )}

      <label htmlFor={id} className="mt-6 mb-1.5 block text-sm font-semibold">
        6-digit code
      </label>
      <input
        id={id}
        value={code}
        onChange={(e) => {
          setCode(digitsOnly(e.target.value).slice(0, 6));
          setError(null);
        }}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="000000"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={cn(
          "h-16 w-full rounded-xl border bg-surface text-center text-3xl font-semibold tracking-[0.5em] text-fg tabular placeholder:text-subtle/50 focus:border-accent focus:outline-none",
          error ? "border-danger" : "border-line",
        )}
      />
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={busy} className="mt-6 w-full">
        {busy ? "Checking…" : "Verify and continue"}
      </Button>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <button
          type="button"
          onClick={() => {
            resendCode();
            setResent(true);
            setCode("");
            setError(null);
          }}
          className="font-semibold text-accent underline-offset-4 hover:underline"
        >
          Send a new code
        </button>
        <button type="button" onClick={onBack} className="text-muted underline-offset-4 hover:text-fg hover:underline">
          {backLabel}
        </button>
      </div>
      <p role="status" className="mt-3 min-h-5 text-sm text-success">
        {resent ? "New code sent. The old one no longer works." : ""}
      </p>
    </form>
  );
}
