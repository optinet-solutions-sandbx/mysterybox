import { describe, expect, it } from "vitest";
import { CLASP, FINISHES } from "./chest-finishes";

const all = Object.entries(FINISHES);

function luminance(color: string | number): number {
  const hex = typeof color === "number" ? color.toString(16).padStart(6, "0") : color.slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe("box finishes follow the client's screens", () => {
  it.each(all)("%s is holographic foil", (_key, finish) => {
    expect(finish.metalness).toBeGreaterThanOrEqual(0.85);
    expect(finish.iridescence).toBeGreaterThan(0);
    expect(finish.streaks.length).toBeGreaterThanOrEqual(3);
  });

  it.each(all)("%s is a notch less glossy than a mirror (the client's ask)", (_key, finish) => {
    expect(finish.roughness).toBeGreaterThanOrEqual(0.18);
  });

  it.each(all)("%s prints its crown and text in a colour that stands out from the foil", (_key, finish) => {
    expect(Math.abs(luminance(finish.base[0]) - luminance(finish.ink.color))).toBeGreaterThan(0.25);
  });

  it("has a satin champagne-gold clasp", () => {
    expect(CLASP.metalness).toBe(1);
    expect(CLASP.roughness).toBeGreaterThanOrEqual(0.2);
  });
});
