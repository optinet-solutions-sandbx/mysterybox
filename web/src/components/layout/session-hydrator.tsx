"use client";

import { useEffect } from "react";
import { useAuth } from "@/store/auth";
import { useSession } from "@/store/session";

/** Loads the persisted mock session and accounts after mount, then makes sure fairness seeds exist. */
export function SessionHydrator() {
  useEffect(() => {
    void Promise.resolve(useAuth.persist.rehydrate());
    void Promise.resolve(useSession.persist.rehydrate()).then(() => useSession.getState().ensureSeeds());
  }, []);
  return null;
}
