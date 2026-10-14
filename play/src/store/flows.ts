import { NotEnoughFunds, openBox, useApp } from "./app";
import { openAddFunds, openAuth, toast, useUi } from "./ui";

/** Buy and open a box from any screen: sign-up first, top-up when short, then the opening overlay. */
export async function buyBox(slug: string) {
  if (!useApp.getState().currentId) {
    openAuth("sign-up");
    return;
  }
  try {
    const pull = await openBox(slug);
    useUi.setState({ opening: { slug, pull } });
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
