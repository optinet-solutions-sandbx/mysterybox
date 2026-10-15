/**
 * The lazily loaded overlays' code. LazyOverlays renders them; the buy flow waits for the opening
 * screen before charging, and the shell fetches all three once the page is idle.
 */
export const loadOpenOverlay = () => import("@/components/open/open-overlay");
export const loadAuthSheet = () => import("@/components/account/auth-sheet");
export const loadAddFundsSheet = () => import("@/components/wallet/add-funds-sheet");

export function prefetchOverlays() {
  void loadOpenOverlay();
  void loadAuthSheet();
  void loadAddFundsSheet();
}
