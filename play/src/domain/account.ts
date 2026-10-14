/** Pure validation for the mock sign-up. */

export function usernameError(raw: string): string | null {
  const u = raw.trim();
  if (u.length < 3) return "Use at least 3 characters.";
  if (u.length > 20) return "Use 20 characters or fewer.";
  if (!/^[A-Za-z0-9_]+$/.test(u)) return "Use letters, numbers and underscores only.";
  return null;
}

export function emailError(raw: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim()) ? null : "Enter an email address like name@example.com.";
}

/** Referral codes are the username in capitals: easy to say out loud and to type from a video. */
export function referralCodeFor(username: string): string {
  return username.trim().toUpperCase();
}

/** Normalises a code from a link or a form; null when it can't be a code. */
export function normalizeReferralCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  return /^[A-Z0-9_]{3,20}$/.test(code) ? code : null;
}

export interface UsAddress {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
}

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA",
  "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR",
  "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

/** Field-by-field errors for a US shipping address; empty when it is complete. */
export function addressErrors(a: UsAddress): Partial<Record<keyof UsAddress, string>> {
  const errors: Partial<Record<keyof UsAddress, string>> = {};
  if (a.name.trim().length < 2) errors.name = "Enter the recipient's full name.";
  if (a.line1.trim().length < 4) errors.line1 = "Enter a street address.";
  if (a.city.trim().length < 2) errors.city = "Enter a city.";
  if (!(US_STATES as readonly string[]).includes(a.state)) errors.state = "Choose a state.";
  if (!/^\d{5}(-\d{4})?$/.test(a.zip.trim())) errors.zip = "Enter a 5-digit ZIP code.";
  return errors;
}

/** TikTok, Instagram and Facebook open links in their own in-app browsers. */
export function inAppBrowser(userAgent: string): "tiktok" | "instagram" | "facebook" | null {
  if (/musical_ly|Bytedance|TikTok/i.test(userAgent)) return "tiktok";
  if (/Instagram/i.test(userAgent)) return "instagram";
  if (/FBAN|FBAV|FB_IAB/i.test(userAgent)) return "facebook";
  return null;
}
