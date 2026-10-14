import { ITEM_CONDITIONS, type Item } from "./types";

/** "Ref. 126200 · Unworn": the reference and condition staff entered, or null when neither is set. */
export function authenticitySummary(item: Pick<Item, "reference" | "condition">): string | null {
  const parts = [item.reference ? `Ref. ${item.reference}` : null, item.condition ? ITEM_CONDITIONS[item.condition] : null].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}
