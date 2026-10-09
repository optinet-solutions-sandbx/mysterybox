import { describe, expect, it } from "vitest";
import { economy } from "@/config/economy";
import { boxes } from "@/data/boxes";
import { items } from "@/data/items";
import { boxStats, resolveEntries } from "./catalog";

describe("mock catalog integrity", () => {
  it("has unique item ids and box slugs", () => {
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    expect(new Set(boxes.map((b) => b.slug)).size).toBe(boxes.length);
  });

  it.each(boxes.map((b) => [b.slug, b] as const))("%s: odds sum to 100%%", (_, box) => {
    expect(box.entries.reduce((a, e) => a + e.weight, 0)).toBe(economy.oddsScale);
    expect(() => resolveEntries(box)).not.toThrow();
  });

  it.each(boxes.map((b) => [b.slug, b] as const))("%s: RTP is just under the target", (_, box) => {
    const { rtp } = boxStats(box);
    expect(rtp).toBeLessThanOrEqual(economy.targetRtp);
    expect(rtp).toBeGreaterThan(economy.targetRtp - 0.05);
  });
});
