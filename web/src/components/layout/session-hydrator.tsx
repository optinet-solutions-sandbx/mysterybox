"use client";

import { useEffect } from "react";
import { useSession } from "@/store/session";

/** Loads the persisted mock session after mount, then makes sure fairness seeds exist. */
export function SessionHydrator() {
  useEffect(() => {
    void Promise.resolve(useSession.persist.rehydrate()).then(() => useSession.getState().ensureSeeds());
  }, []);
  return null;
}
