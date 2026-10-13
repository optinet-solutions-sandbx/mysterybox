import { describe, expect, it } from "vitest";
import { economy } from "@/config/economy";
import { boxes } from "@/data/boxes";
import { items } from "@/data/items";
import { boxStats, catalogBox, outcomeArt, resolveEntries } from "./catalog";

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

describe("catalogue in the backend kit's format", () => {
  it.each(boxes.map((b) => [b.slug, b] as const))("%s: outcome percents sum to 100 and ids are unique", (_, box) => {
    const { outcomes } = catalogBox(box);
    expect(Math.abs(outcomes.reduce((s, o) => s + o.percent, 0) - 100)).toBeLessThan(1e-6);
    expect(new Set(outcomes.map((o) => o.id)).size).toBe(outcomes.length);
  });

  it.each(boxes.map((b) => [b.slug, b] as const))("%s: stored order is the authored order, percent = weight / 1000", (_, box) => {
    expect(catalogBox(box).outcomes.map((o) => [o.id, o.percent])).toEqual(box.entries.map((e) => [e.itemId, e.weight / 1000]));
  });

  it.each(boxes.map((b) => [b.slug, b] as const))("%s: credit rows carry credit, not a cash value", (_, box) => {
    for (const o of catalogBox(box).outcomes) {
      if (o.kind === "item") {
        expect(o.valueCents).toBeGreaterThan(0);
        expect(o.credits).toBe(0);
      } else {
        expect(o.valueCents).toBeNull();
        expect(o.credits).toBeGreaterThan(0);
        expect(o.kind).toBe(o.freeSpins > 0 ? "bonus" : "credit");
      }
    }
  });

  it.each(boxes.filter((b) => b.slug !== "grail-reserve").map((b) => [b.slug, b] as const))(
    "%s: has one free-spin row and one two-free-spin row, and a free-spin table that sums to 100",
    (_, box) => {
      const { outcomes, bonus } = catalogBox(box);
      expect(outcomes.filter((o) => o.freeSpins === 1)).toHaveLength(1);
      expect(outcomes.filter((o) => o.freeSpins === 2)).toHaveLength(1);
      expect(bonus).toHaveLength(5);
      expect(bonus.reduce((s, b) => s + b.percent, 0)).toBeCloseTo(100, 9);
      for (const b of bonus) expect(b.credits).toBeGreaterThanOrEqual(1);
    },
  );

  it("gives the all-pieces box (Grail Reserve) no free spins", () => {
    const grail = catalogBox(boxes.find((b) => b.slug === "grail-reserve")!);
    expect(grail.outcomes.every((o) => o.freeSpins === 0)).toBe(true);
    expect(grail.bonus).toEqual([]);
  });

  it.each(boxes.map((b) => [b.slug, b] as const))("%s: the return counts free spins and stays in the band", (_, box) => {
    const { maths } = catalogBox(box);
    expect(maths.returnFace).toBeLessThanOrEqual(economy.targetRtp);
    expect(maths.returnFace).toBeGreaterThan(economy.targetRtp - 0.05);
    expect(boxStats(box).rtp).toBe(maths.returnFace);
  });

  it("looks pieces up locally for art and never throws on an unknown id", () => {
    expect(outcomeArt("lady-dior").brand).toBe("Dior");
    expect(() => outcomeArt("not-a-piece")).not.toThrow();
    expect(outcomeArt("not-a-piece").category).toBe("credit");
  });
});
