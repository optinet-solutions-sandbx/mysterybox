import { describe, expect, it } from "vitest";
import { economy } from "@/config/economy";
import { expectedValue, rtp } from "@/domain/odds";
import { boxes } from "./boxes";
import { itemById, items } from "./items";
import { imageAspect } from "./image-meta";

describe("catalog integrity", () => {
  it("has unique item ids and a photo size for every piece", () => {
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    for (const item of items) expect(imageAspect[item.id], item.id).toBeGreaterThan(0);
  });

  it("has unique box slugs", () => {
    expect(new Set(boxes.map((b) => b.slug)).size).toBe(boxes.length);
  });

  it.each(boxes.map((b) => [b.slug, b] as const))("%s: weights sum to the odds scale and every entry is drawable", (_, box) => {
    expect(box.entries.reduce((s, e) => s + e.weight, 0)).toBe(economy.oddsScale);
    for (const e of box.entries) {
      expect(itemById(e.itemId), e.itemId).toBeDefined();
      expect(e.weight).toBeGreaterThan(0);
    }
  });

  it.each(boxes.map((b) => [b.slug, b] as const))("%s: RTP sits just under the target", (_, box) => {
    const ev = expectedValue(box.entries.map((e) => ({ value: itemById(e.itemId)!.value, weight: e.weight })));
    const r = rtp(ev, box.price);
    expect(r).toBeLessThanOrEqual(economy.targetRtp);
    expect(r).toBeGreaterThan(economy.targetRtp - 0.01);
  });

  it("lists boxes from cheapest to dearest", () => {
    const prices = boxes.map((b) => b.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("has exactly one limited drop", () => {
    expect(boxes.filter((b) => b.drop)).toHaveLength(1);
  });
});
