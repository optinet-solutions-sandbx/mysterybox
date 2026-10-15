import { describe, expect, it } from "vitest";
import { FINISHES } from "./chest-finishes";

const all = Object.entries(FINISHES);
const velvets = all.filter(([key]) => key !== "gold");

describe("box finishes are less shiny", () => {
  it.each(all)("%s has no clear coat, iridescence or transmission", (_key, finish) => {
    const b = finish.body();
    expect(b.clearcoat ?? 0).toBe(0);
    expect(b.iridescence ?? 0).toBe(0);
    expect(b.transmission ?? 0).toBe(0);
  });

  it.each(velvets)("%s is matte velvet", (_key, finish) => {
    const b = finish.body();
    expect(b.metalness ?? 0).toBe(0);
    expect(b.roughness).toBeGreaterThanOrEqual(0.85);
    expect(b.sheen).toBeGreaterThan(0);
  });

  it("gold is brushed, not mirror", () => {
    const b = FINISHES.gold.body();
    expect(b.metalness).toBe(1);
    expect(b.roughness).toBeGreaterThanOrEqual(0.45);
  });

  it.each(all)("%s keeps a metallic gold crown", (_key, finish) => {
    expect(finish.crown.metalness).toBe(1);
  });
});
