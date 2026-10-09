import { describe, expect, it } from "vitest";
import { buildReel } from "./reel";

function seeded(seed: number) {
  return () => {
    seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
    return seed / 2 ** 31;
  };
}

describe("buildReel", () => {
  const entries = [
    { id: "common", weight: 90 },
    { id: "grail", weight: 10 },
  ];

  it("places the winner at the requested index", () => {
    const reel = buildReel(entries, entries[1], { length: 40, winnerIndex: 32, random: seeded(1) });
    expect(reel).toHaveLength(40);
    expect(reel[32]).toBe(entries[1]);
  });

  it("samples fillers with the real odds", () => {
    const reel = buildReel(entries, entries[0], { length: 5_000, winnerIndex: 0, random: seeded(42) });
    const grailShare = reel.filter((e) => e.id === "grail").length / reel.length;
    expect(grailShare).toBeGreaterThan(0.07);
    expect(grailShare).toBeLessThan(0.13);
  });

  it("rejects an out-of-range winner index", () => {
    expect(() => buildReel(entries, entries[0], { length: 10, winnerIndex: 10, random: Math.random })).toThrow();
  });
});
