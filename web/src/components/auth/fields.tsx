"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { DIAL_CODES, PASSWORD_RULES, formatPhoneInput } from "@/domain/auth";
import { cn } from "@/lib/cn";

const inputBase =
  "h-12 w-full rounded-xl border bg-surface px-4 text-[15px] font-medium text-fg placeholder:font-normal placeholder:text-subtle transition-colors focus:border-accent focus:outline-none";

/** Labelled text input with an error line wired to aria-describedby. */
export function Field({
  label,
  error,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: ReactNode }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-fg">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={cn(inputBase, error ? "border-danger" : "border-line")}
        {...props}
      />
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Password with show/hide and (optionally) a live rule checklist. */
export function PasswordField({
  label = "Password",
  value,
  onChange,
  error,
  showRules = false,
  autoComplete,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  showRules?: boolean;
  autoComplete: "new-password" | "current-password";
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-fg">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : showRules ? `${id}-rules` : undefined}
          className={cn(inputBase, "pr-12", error ? "border-danger" : "border-line")}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted hover:text-fg"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {showRules && (
        <ul id={`${id}-rules`} className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {PASSWORD_RULES.map((r) => {
            const ok = r.test(value);
            return (
              <li key={r.id} className={cn("flex items-center gap-1.5 text-xs font-medium", ok ? "text-success" : "text-muted")}>
                <Check className={cn("size-3.5", ok ? "opacity-100" : "opacity-30")} strokeWidth={3} />
                {r.label}
              </li>
            );
          })}
        </ul>
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Country code + number, like MISTY's "PH +63 | Phone number" pair. Formats +1 numbers as you type. */
export function PhoneField({
  dialIso,
  onDialIso,
  value,
  onChange,
  error,
}: {
  dialIso: string;
  onDialIso: (iso: string) => void;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const id = useId();
  const dial = DIAL_CODES.find((d) => d.iso === dialIso)?.dial ?? "+1";
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-fg">
        Phone number
      </label>
      <div className="flex gap-2">
        <select
          aria-label="Country code"
          value={dialIso}
          onChange={(e) => {
            onDialIso(e.target.value);
            onChange("");
          }}
          className={cn(inputBase, "w-[7.5rem] shrink-0 px-3", error ? "border-danger" : "border-line")}
        >
          {DIAL_CODES.map((d) => (
            <option key={d.iso} value={d.iso}>
              {d.iso} {d.dial}
            </option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={dial === "+1" ? "(212) 555-0147" : "Phone number"}
          value={value}
          onChange={(e) => onChange(formatPhoneInput(dial, e.target.value))}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : `${id}-hint`}
          className={cn(inputBase, error ? "border-danger" : "border-line")}
        />
      </div>
      {error ? (
        <p id={`${id}-err`} className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          We only use it to reach you about pieces you open and ship.
        </p>
      )}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  children,
  error,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  error?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-fg">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          className="mt-0.5 size-[18px] shrink-0 accent-accent"
        />
        <span>{children}</span>
      </label>
      {error && <p className="mt-1 ml-[30px] text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}
