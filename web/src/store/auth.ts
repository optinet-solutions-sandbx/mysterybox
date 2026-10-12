"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AccountStatus, AppRole } from "@/backend/contract";
import { TEAM_STAFF } from "@/config/staff";
import { randomHex, sha256Hex } from "@/domain/fair";
import { digitsOnly, type RegistrationInput } from "@/domain/auth";

/**
 * Mock accounts, persisted in the browser. Mirrors MISTY's flow (details → one-time email code)
 * with a password, as requested. Passwords are salted + hashed even here; production does all of
 * this server-side (Supabase Auth), emails the code and never exposes it to the page.
 *
 * Roles follow the backend (public.app_role): every sign-up is a player; staff are the team
 * accounts in config/staff.ts or people a super admin adds (store/staff-actions.ts enforces the rules).
 */

export interface Account {
  id: string;
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
  role: AppRole;
  status: AccountStatus;
  lastSeenAt?: string;
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
  signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; error: "invalid" | "unverified" | "suspended" }>;
  signOut(): void;
  setMarketing(value: boolean): void;
  /** Adds the team's staff accounts (config/staff.ts) if this browser doesn't have them yet. */
  ensureStaff(): void;
  /** Deletes accounts (used by "Clear test data"). */
  removeAccounts(emails: string[]): void;
  /** Low-level writes; permission checks and audit live in store/staff-actions.ts. */
  patchAccount(email: string, patch: Partial<Pick<Account, "role" | "status">>): void;
  addAccount(input: { email: string; firstName: string; lastName: string; password: string; role: AppRole }): Promise<boolean>;
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

async function newAccount(input: {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: AppRole;
  dial?: string;
  phone?: string;
  marketing?: boolean;
  verified: boolean;
}): Promise<Account> {
  const salt = randomHex(16);
  return {
    id: crypto.randomUUID(),
    email: key(input.email),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    dial: input.dial ?? "+1",
    phone: digitsOnly(input.phone ?? ""),
    passwordHash: await hashPassword(input.password, salt),
    salt,
    marketing: input.marketing ?? false,
    verified: input.verified,
    createdAt: new Date().toISOString(),
    role: input.role,
    status: "active",
  };
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
        // Sign-up always creates a player. Roles only change in the back office.
        const account = await newAccount({ ...input, role: "player", verified: false });
        set((s) => ({ accounts: { ...s.accounts, [email]: account }, pending: { email, code: sixDigitCode() } }));
        return { ok: true };
      },

      verify(code) {
        const pending = get().pending;
        if (!pending || code !== pending.code) return false;
        set((s) => ({
          accounts: {
            ...s.accounts,
            [pending.email]: { ...s.accounts[pending.email], verified: true, lastSeenAt: new Date().toISOString() },
          },
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
        if (account.status !== "active") return { ok: false, error: "suspended" };
        if (!account.verified) {
          set({ pending: { email: account.email, code: sixDigitCode() } });
          return { ok: false, error: "unverified" };
        }
        set((s) => ({
          currentEmail: account.email,
          pending: null,
          accounts: { ...s.accounts, [account.email]: { ...account, lastSeenAt: new Date().toISOString() } },
        }));
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

      ensureStaff() {
        const missing = TEAM_STAFF.filter((s) => !get().accounts[s.email]);
        if (!missing.length) return;
        const created: Account[] = missing.map((s) => ({
          id: crypto.randomUUID(),
          email: s.email,
          firstName: s.firstName,
          lastName: s.lastName,
          dial: "+1",
          phone: "",
          passwordHash: s.passwordHash,
          salt: s.salt,
          marketing: false,
          verified: true,
          createdAt: new Date().toISOString(),
          role: s.role,
          status: "active",
        }));
        set((s) => ({ accounts: { ...s.accounts, ...Object.fromEntries(created.map((a) => [a.email, a])) } }));
      },

      removeAccounts(emails) {
        const drop = new Set(emails);
        set((s) => ({
          accounts: Object.fromEntries(Object.entries(s.accounts).filter(([email]) => !drop.has(email))),
          currentEmail: s.currentEmail && drop.has(s.currentEmail) ? null : s.currentEmail,
          pending: s.pending && drop.has(s.pending.email) ? null : s.pending,
        }));
      },

      patchAccount(email, patch) {
        const account = get().accounts[key(email)];
        if (!account) return;
        set((s) => ({ accounts: { ...s.accounts, [account.email]: { ...account, ...patch } } }));
      },

      async addAccount(input) {
        if (get().accounts[key(input.email)]) return false;
        const account = await newAccount({ ...input, verified: true });
        set((s) => ({ accounts: { ...s.accounts, [account.email]: account } }));
        return true;
      },
    }),
    {
      name: "grailnoir-auth",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ accounts, currentEmail, pending }) => ({ accounts, currentEmail, pending }),
      // v1 accounts had no id, role or status: they were all players.
      migrate: (persisted, version) => {
        const state = persisted as { accounts?: Record<string, Partial<Account>> };
        if (version < 2 && state.accounts) {
          state.accounts = Object.fromEntries(
            Object.entries(state.accounts).map(([email, a]) => [
              email,
              { id: crypto.randomUUID(), role: "player", status: "active", ...a } as Account,
            ]),
          );
        }
        return state as AuthState;
      },
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
