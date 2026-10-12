"use client";

import { useEffect } from "react";
import { useAuth } from "@/store/auth";
import { useBackoffice } from "@/store/backoffice";
import { useLedgers } from "@/store/ledgers";
import { freshSnapshot, snapshotOf, useSession } from "@/store/session";

/**
 * Loads the persisted mock stores after mount, then keeps one wallet per account: the session
 * (`useSession`) is the signed-in account's working copy, swapped on sign-in/out and mirrored
 * into `useLedgers` so the back office sees every account in this browser.
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
    ]).then(() => {
      if (cancelled) return;
      void useAuth.getState().ensureStaff();
      let current = useAuth.getState().currentEmail;

      // The persisted session is always the signed-in account's latest copy (it is swapped on every
      // sign-in/out), so it wins over the mirror. This also adopts pre-existing shared sessions.
      if (current) useLedgers.getState().save(current, snapshotOf(useSession.getState()));
      void useSession.getState().ensureSeeds();

      const offAuth = useAuth.subscribe((s) => {
        if (s.currentEmail === current) return;
        if (current) useLedgers.getState().save(current, snapshotOf(useSession.getState()));
        current = s.currentEmail;
        useSession.setState(current ? (useLedgers.getState().byEmail[current] ?? freshSnapshot()) : freshSnapshot());
        void useSession.getState().ensureSeeds();
      });
      const offSession = useSession.subscribe((s) => {
        if (current) useLedgers.getState().save(current, snapshotOf(s));
      });
      unsubscribe = () => {
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
