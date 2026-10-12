"use client";

import { useSyncExternalStore } from "react";
import { safeNextPath } from "@/domain/auth";

const noSubscribe = () => () => {};

/**
 * The `?next=` destination, read from the URL after hydration. (useSearchParams would need a
 * Suspense boundary under Cache Components; the server snapshot is simply "no next".)
 */
export function useNextPath(fallback = "/account"): string {
  const search = useSyncExternalStore(noSubscribe, () => window.location.search, () => "");
  return safeNextPath(new URLSearchParams(search).get("next"), fallback);
}

/** `/sign-in?next=/boxes/x`, or plain `/sign-in` when there is nowhere special to return to. */
export function withNext(path: string, next: string, fallback = "/account"): string {
  return next === fallback ? path : `${path}?next=${encodeURIComponent(next)}`;
}
