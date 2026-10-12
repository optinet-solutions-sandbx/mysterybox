"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { randomHex, sha256Hex } from "@/domain/fair";
import { digitsOnly, type RegistrationInput } from "@/domain/auth";

/**
 * Mock accounts, persisted in the browser. Mirrors MISTY's flow (details → one-time email code)
 * with a password, as requested. Passwords are salted + hashed even here; production does all of
 * this server-side, emails the code and never exposes it to the page.
 */

export interface Account {
  email: string;
  firstName: string;
  lastName: string;
  dial: string;
  phone: string;
  passwordHash: string;
  salt: string;
  marketing: boolean;
  verified: boolean;
  createdAt: string;
}

interface Pending {
  email: string;
  code: string;
}

interface AuthState {
  accounts: Record<string, Account>;
  currentEmail: string | null;
  pending: Pending | null;
  register(input: RegistrationInput & { marketing: boolean }): Promise<{ ok: true } | { ok: false; error: "exists" }>;
  verify(code: string): boolean;
  resendCode(): void;
  signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; error: "invalid" | "unverified" }>;
  signOut(): void;
  setMarketing(value: boolean): void;
}

const key = (email: string) => email.trim().toLowerCase();

function sixDigitCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

async function hashPassword(password: string, salt: string) {
  return sha256Hex(`${salt}:${password}`);
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      accounts: {},
      currentEmail: null,
      pending: null,

      async register(input) {
        const email = key(input.email);
        const existing = get().accounts[email];
        if (existing?.verified) return { ok: false, error: "exists" };
        const salt = randomHex(16);
        const account: Account = {
          email,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          dial: input.dial,
          phone: digitsOnly(input.phone),
          passwordHash: await hashPassword(input.password, salt),
          salt,
          marketing: input.marketing,
          verified: false,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ accounts: { ...s.accounts, [email]: account }, pending: { email, code: sixDigitCode() } }));
        return { ok: true };
      },

      verify(code) {
        const pending = get().pending;
        if (!pending || code !== pending.code) return false;
        set((s) => ({
          accounts: { ...s.accounts, [pending.email]: { ...s.accounts[pending.email], verified: true } },
          currentEmail: pending.email,
          pending: null,
        }));
        return true;
      },

      resendCode() {
        const pending = get().pending;
        if (pending) set({ pending: { ...pending, code: sixDigitCode() } });
      },

      async signIn(email, password) {
        const account = get().accounts[key(email)];
        if (!account || (await hashPassword(password, account.salt)) !== account.passwordHash) {
          return { ok: false, error: "invalid" };
        }
        if (!account.verified) {
          set({ pending: { email: account.email, code: sixDigitCode() } });
          return { ok: false, error: "unverified" };
        }
        set({ currentEmail: account.email, pending: null });
        return { ok: true };
      },

      signOut() {
        set({ currentEmail: null, pending: null });
      },

      setMarketing(value) {
        const email = get().currentEmail;
        if (!email) return;
        set((s) => ({ accounts: { ...s.accounts, [email]: { ...s.accounts[email], marketing: value } } }));
      },
    }),
    {
      name: "grailnoir-auth",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ accounts, currentEmail, pending }) => ({ accounts, currentEmail, pending }),
    },
  ),
);

export function useAuthHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useAuth.persist.onFinishHydration(onChange),
    () => useAuth.persist.hasHydrated(),
    () => false,
  );
}

/** The signed-in account, or null (also null until hydrated). */
export function useCurrentUser(): Account | null {
  const hydrated = useAuthHydrated();
  const account = useAuth((s) => (s.currentEmail ? s.accounts[s.currentEmail] : null));
  return hydrated ? (account ?? null) : null;
}
