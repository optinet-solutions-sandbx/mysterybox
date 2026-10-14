"use client";

import { useEffect } from "react";
import { isSupabase } from "@/backend/config";
import { loadAccount } from "@/backend/remote-player";
import { sb } from "@/backend/supabase-client";
import { useAuth } from "@/store/auth";
import { useBackoffice } from "@/store/backoffice";
import { useLedgers } from "@/store/ledgers";
import { freshSnapshot, snapshotOf, useSession } from "@/store/session";

/**
 * Loads the persisted mock stores after mount, then keeps one wallet per account: the session
 * (`useSession`) is the signed-in account's working copy, swapped on sign-in/out and mirrored
 * into `useLedgers` so the back office sees every account in this browser.
 *
 * With NEXT_PUBLIC_ACCOUNTS=supabase, Supabase Auth decides who is signed in; the wallet and box
 * system state still follow that account through the same per-account storage.
 */
export function SessionHydrator() {
  useEffect(() => {
    // Strict Mode mounts effects twice; a cancelled run must not subscribe, or two sets of
    // listeners race on sign-out and one saves the fresh wallet over the account's real one.
    let cancelled = false;
    let unsubscribe = () => {};
    void Promise.all([
      useAuth.persist.rehydrate(),
      useSession.persist.rehydrate(),
      useLedgers.persist.rehydrate(),
      useBackoffice.persist.rehydrate(),
    ]).then(async () => {
      if (cancelled) return;
      let offRemote = () => {};
      if (isSupabase) {
        const account = await loadAccount().catch(() => null);
        if (cancelled) return;
        useAuth.getState().setRemoteUser(account);
        // The mirror is saved on every change, so it holds the account's latest state.
        useSession.setState({ ...freshSnapshot(), ...(account ? useLedgers.getState().byEmail[account.email] : undefined) });
        const { data } = sb().auth.onAuthStateChange((event) => {
          if (event === "SIGNED_OUT") useAuth.getState().setRemoteUser(null);
        });
        offRemote = () => data.subscription.unsubscribe();
      } else {
        useAuth.getState().ensureStaff();
      }
      let current = useAuth.getState().currentEmail;

      // Mock: the persisted session is always the signed-in account's latest copy (it is swapped on
      // every sign-in/out), so it wins over the mirror. This also adopts pre-existing shared sessions.
      if (current) useLedgers.getState().save(current, snapshotOf(useSession.getState()));
      void useSession.getState().ensureSeeds();

      const offAuth = useAuth.subscribe((s) => {
        if (s.currentEmail === current) return;
        if (current) useLedgers.getState().save(current, snapshotOf(useSession.getState()));
        current = s.currentEmail;
        // Fill fields a stored snapshot predates, so nothing carries over from the previous account.
        useSession.setState({ ...freshSnapshot(), ...(current ? useLedgers.getState().byEmail[current] : undefined) });
        void useSession.getState().ensureSeeds();
      });
      const offSession = useSession.subscribe((s) => {
        if (current) useLedgers.getState().save(current, snapshotOf(s));
      });
      unsubscribe = () => {
        offRemote();
        offAuth();
        offSession();
      };
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);
  return null;
}
