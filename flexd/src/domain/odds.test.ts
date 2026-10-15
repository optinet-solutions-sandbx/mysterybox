import { describe, expect, it } from "vitest";
import {
  expectedValue,
  normalizeWeights,
  oddsByRarity,
  pickByRoll,
  priceForRtp,
  rarityFor,
  rollRanges,
  rtp,
  sellBackValue,
} from "./odds";

describe("normalizeWeights", () => {
  it("sums exactly to the scale and keeps proportions", () => {
    const w = normalizeWeights([1, 1, 1], 100_000);
    expect(w.reduce((a, b) => a + b, 0)).toBe(100_000);
    expect(Math.max(...w) - Math.min(...w)).toBeLessThanOrEqual(1);
  });

  it("handles awkward fractional weights", () => {
    const w = normalizeWeights([40, 28, 14, 0.01, 0.3, 17.69], 100_000);
    expect(w.reduce((a, b) => a + b, 0)).toBe(100_000);
    expect(w[3]).toBe(10);
  });

  it("rejects empty, zero and negative weights", () => {
    expect(() => normalizeWeights([])).toThrow();
    expect(() => normalizeWeights([1, 0])).toThrow();
    expect(() => normalizeWeights([1, -2])).toThrow();
  });

  it("rejects odds that would round to zero", () => {
    expect(() => normalizeWeights([1_000_000, 1], 100_000)).toThrow(/resolution/);
  });
});

describe("pickByRoll", () => {
  const entries = [
    { id: "a", weight: 50 },
    { id: "b", weight: 30 },
    { id: "c", weight: 20 },
  ];

  it("maps roll ranges to entries at the boundaries", () => {
    expect(pickByRoll(entries, 0).id).toBe("a");
    expect(pickByRoll(entries, 49).id).toBe("a");
    expect(pickByRoll(entries, 50).id).toBe("b");
    expect(pickByRoll(entries, 79).id).toBe("b");
    expect(pickByRoll(entries, 80).id).toBe("c");
    expect(pickByRoll(entries, 99).id).toBe("c");
  });

  it("throws when the roll is outside the total weight", () => {
    expect(() => pickByRoll(entries, 100)).toThrow();
  });
});

describe("expectedValue / rtp / priceForRtp", () => {
  const entries = [
    { value: 1_000, weight: 90 },
    { value: 10_000, weight: 10 },
  ];

  it("weights item values by probability", () => {
    expect(expectedValue(entries, 100)).toBe(1_900);
  });

  it("prices to the next whole dollar at or under the target RTP", () => {
    const price = priceForRtp(1_900, 0.9);
    expect(price).toBe(2_200);
    expect(rtp(1_900, price)).toBeLessThanOrEqual(0.9);
  });
});

describe("rollRanges", () => {
  it("gives contiguous inclusive ranges that agree with pickByRoll", () => {
    const entries = [
      { id: "a", weight: 50 },
      { id: "b", weight: 30 },
      { id: "c", weight: 20 },
    ];
    const ranges = rollRanges(entries);
    expect(ranges.map((r) => [r.from, r.to])).toEqual([
      [0, 49],
      [50, 79],
      [80, 99],
    ]);
    for (const r of ranges) {
      expect(pickByRoll(entries, r.from).id).toBe(r.id);
      expect(pickByRoll(entries, r.to).id).toBe(r.id);
    }
  });
});

describe("sellBackValue", () => {
  it("applies the rate and rounds down to the cent", () => {
    expect(sellBackValue(11_111, 0.9)).toBe(9_999);
    expect(sellBackValue(10_000, 1)).toBe(10_000);
  });
});

describe("rarityFor", () => {
  it("ranks by multiple of the box price", () => {
    expect(rarityFor(100, 1_000)).toBe("common");
    expect(rarityFor(500, 1_000)).toBe("uncommon");
    expect(rarityFor(1_500, 1_000)).toBe("rare");
    expect(rarityFor(5_000, 1_000)).toBe("epic");
    expect(rarityFor(25_000, 1_000)).toBe("grail");
  });
});

describe("oddsByRarity", () => {
  it("sums each tier and the tiers sum to 1", () => {
    const byTier = oddsByRarity(
      [
        { rarity: "common", weight: 70 },
        { rarity: "common", weight: 20 },
        { rarity: "rare", weight: 9 },
        { rarity: "grail", weight: 1 },
      ],
      100,
    );
    expect(byTier).toEqual({ common: 0.9, uncommon: 0, rare: 0.09, epic: 0, grail: 0.01 });
    expect(Object.values(byTier).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
});
