"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { isSupabase } from "@/backend/config";
import type { AccountStatus, AppRole } from "@/backend/contract";
import { loadMe, remotePlayer } from "@/backend/remote-player";
import { sb } from "@/backend/supabase-client";
import { TEAM_STAFF } from "@/config/staff";
import { randomHex, sha256Hex } from "@/domain/fair";
import { digitsOnly, type RegistrationInput } from "@/domain/auth";
import { freshSnapshot, useSession, type SessionSnapshot } from "./session";

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
  /** Database player number (Supabase); the mock derives one from the id. */
  number?: number;
}

interface Pending {
  email: string;
  code: string;
}

interface AuthState {
  accounts: Record<string, Account>;
  currentEmail: string | null;
  pending: Pending | null;
  /** Supabase mode: the session has been checked with the server (not persisted). */
  remoteReady: boolean;
  /** `signedIn`: the project auto-confirms sign-ups (no email code), so the account is already signed in. */
  register(input: RegistrationInput & { marketing: boolean }): Promise<{ ok: true; signedIn?: boolean } | { ok: false; error: "exists" | "failed"; message?: string }>;
  verify(code: string): Promise<boolean>;
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
  /** Supabase mode: the signed-in account and its wallet, or null when signed out. */
  setRemoteUser(me: { account: Account; snapshot: SessionSnapshot } | null): void;
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
      remoteReady: false,

      async register(input) {
        const email = key(input.email);
        if (isSupabase) {
          const { data, error } = await sb().auth.signUp({
            email,
            password: input.password,
            options: {
              data: {
                first_name: input.firstName.trim(),
                last_name: input.lastName.trim(),
                phone_dial: input.dial,
                phone_number: digitsOnly(input.phone),
                marketing_opt_in: input.marketing,
                accepted_terms: input.confirmedAge,
                confirmed_age: input.confirmedAge,
              },
            },
          });
          // With email-enumeration protection Supabase answers an existing address with an empty identity list.
          if (error?.code === "user_already_exists" || (data.user && (data.user.identities ?? []).length === 0)) return { ok: false, error: "exists" };
          if (error) return { ok: false, error: "failed", message: error.message };
          if (data.session) {
            const me = await loadMe();
            if (me) {
              get().setRemoteUser(me);
              return { ok: true, signedIn: true };
            }
          }
          set({ pending: { email, code: "" } });
          return { ok: true };
        }
        const existing = get().accounts[email];
        if (existing?.verified) return { ok: false, error: "exists" };
        // Sign-up always creates a player. Roles only change in the back office.
        const account = await newAccount({ ...input, role: "player", verified: false });
        set((s) => ({ accounts: { ...s.accounts, [email]: account }, pending: { email, code: sixDigitCode() } }));
        return { ok: true };
      },

      async verify(code) {
        const pending = get().pending;
        if (isSupabase) {
          if (!pending) return false;
          let { error } = await sb().auth.verifyOtp({ email: pending.email, token: code, type: "email" });
          if (error) ({ error } = await sb().auth.verifyOtp({ email: pending.email, token: code, type: "signup" }));
          if (error) return false;
          const me = await loadMe();
          if (!me) return false;
          get().setRemoteUser(me);
          set({ pending: null });
          return true;
        }
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
        if (isSupabase) {
          if (pending) void sb().auth.resend({ type: "signup", email: pending.email });
          return;
        }
        if (pending) set({ pending: { ...pending, code: sixDigitCode() } });
      },

      async signIn(email, password) {
        if (isSupabase) {
          const { error } = await sb().auth.signInWithPassword({ email: key(email), password });
          if (error) {
            if (error.code === "email_not_confirmed") {
              set({ pending: { email: key(email), code: "" } });
              await sb().auth.resend({ type: "signup", email: key(email) });
              return { ok: false, error: "unverified" };
            }
            return { ok: false, error: "invalid" };
          }
          const me = await loadMe();
          if (!me) return { ok: false, error: "invalid" };
          if (me.account.status !== "active") {
            await sb().auth.signOut();
            return { ok: false, error: "suspended" };
          }
          void remotePlayer.touchLastSeen().catch(() => {});
          get().setRemoteUser(me);
          return { ok: true };
        }
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
        if (isSupabase) {
          void sb().auth.signOut();
          get().setRemoteUser(null);
          set({ pending: null });
          return;
        }
        set({ currentEmail: null, pending: null });
      },

      setMarketing(value) {
        const email = get().currentEmail;
        if (!email) return;
        if (isSupabase) void remotePlayer.setMarketing(get().accounts[email].id, value).catch((e) => console.error("[backend]", e));
        set((s) => ({ accounts: { ...s.accounts, [email]: { ...s.accounts[email], marketing: value } } }));
      },

      ensureStaff() {
        // Supabase: staff are real auth users (scripts/provision_staff.mjs creates the team).
        if (isSupabase) return;
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

      setRemoteUser(me) {
        set({
          accounts: me ? { [me.account.email]: me.account } : {},
          currentEmail: me ? me.account.email : null,
          remoteReady: true,
        });
        useSession.setState(me ? me.snapshot : freshSnapshot());
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
      // Supabase mode keeps only the pending sign-up: the account itself comes from the server session.
      partialize: ({ accounts, currentEmail, pending }) => (isSupabase ? { pending } : { accounts, currentEmail, pending }),
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
  const persisted = useSyncExternalStore(
    (onChange) => useAuth.persist.onFinishHydration(onChange),
    () => useAuth.persist.hasHydrated(),
    () => false,
  );
  const remoteReady = useAuth((s) => s.remoteReady);
  return persisted && (!isSupabase || remoteReady);
}

/** The signed-in account, or null (also null until hydrated). */
export function useCurrentUser(): Account | null {
  const hydrated = useAuthHydrated();
  const account = useAuth((s) => (s.currentEmail ? s.accounts[s.currentEmail] : null));
  return hydrated ? (account ?? null) : null;
}
