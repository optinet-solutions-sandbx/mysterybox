/** Pure registration / sign-in validation. No storage, no React. */

export interface DialCode {
  iso: string;
  dial: string;
  label: string;
}

/** US first (launch market), then the markets most likely to sign up during review. */
export const DIAL_CODES: DialCode[] = [
  { iso: "US", dial: "+1", label: "United States" },
  { iso: "CA", dial: "+1", label: "Canada" },
  { iso: "GB", dial: "+44", label: "United Kingdom" },
  { iso: "AU", dial: "+61", label: "Australia" },
  { iso: "PH", dial: "+63", label: "Philippines" },
  { iso: "AE", dial: "+971", label: "United Arab Emirates" },
];

export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "letter", label: "One letter", test: (p: string) => /[A-Za-z]/.test(p) },
  { id: "number", label: "One number", test: (p: string) => /\d/.test(p) },
] as const;

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function isValidPassword(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(password));
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** North American numbers: 10 digits, area code and exchange can't start with 0 or 1. */
export function isValidPhone(dial: string, phone: string): boolean {
  const d = digitsOnly(phone);
  if (dial === "+1") return /^[2-9]\d{2}[2-9]\d{6}$/.test(d);
  return d.length >= 6 && d.length <= 14;
}

/** Progressive "(555) 123-4567" formatting while typing a +1 number; other codes stay as digits. */
export function formatPhoneInput(dial: string, value: string): string {
  const d = digitsOnly(value).slice(0, dial === "+1" ? 10 : 14);
  if (dial !== "+1") return d;
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export interface RegistrationInput {
  email: string;
  firstName: string;
  lastName: string;
  dial: string;
  phone: string;
  password: string;
  confirmedAge: boolean;
}

export type RegistrationErrors = Partial<Record<keyof RegistrationInput, string>>;

export function validateRegistration(input: RegistrationInput): RegistrationErrors {
  const errors: RegistrationErrors = {};
  if (!isValidEmail(input.email)) errors.email = "Enter a valid email address, like you@example.com.";
  if (!input.firstName.trim()) errors.firstName = "Enter your first name.";
  if (!input.lastName.trim()) errors.lastName = "Enter your last name.";
  if (!isValidPhone(input.dial, input.phone)) {
    errors.phone = input.dial === "+1" ? "Enter a 10-digit US phone number." : "Enter a valid phone number.";
  }
  if (!isValidPassword(input.password)) errors.password = "Use at least 8 characters with a letter and a number.";
  if (!input.confirmedAge) errors.confirmedAge = "Confirm you are 18 or older and accept the terms.";
  return errors;
}

/** Only same-site paths survive as a post-sign-in destination (blocks "//evil.com", "https://…"). */
export function safeNextPath(raw: string | null | undefined, fallback = "/account"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}
