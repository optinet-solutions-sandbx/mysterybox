import { loadAuthSheet, loadOpenOverlay } from "@/components/shell/overlay-code";
import { NotEnoughFunds, openBox, useApp } from "./app";
import { openAddFunds, openAuth, startOpening, toast, useUi } from "./ui";

/**
 * Buy and open a box from any screen: sign-up first, top-up when short, then the opening overlay.
 * Resolves once that screen can show, so the Buy button stays busy until then; nothing is charged
 * if the opening screen's code can't load.
 */
export async function buyBox(slug: string) {
  if (!useApp.getState().currentId) {
    await loadAuthSheet().catch(() => undefined);
    openAuth("sign-up");
    return;
  }
  try {
    await loadOpenOverlay();
  } catch {
    toast("Couldn't load the opening screen. Check your connection and try again.");
    return;
  }
  try {
    const pull = await openBox(slug);
    startOpening({ slug, pull });
  } catch (e) {
    if (e instanceof NotEnoughFunds) {
      toast(e.message);
      openAddFunds();
      return;
    }
    toast(e instanceof Error ? e.message : "That didn't work. Try again.");
  }
}

export function closeOpening() {
  useUi.setState({ opening: null });
}
