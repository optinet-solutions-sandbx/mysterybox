import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { grepSource } from "@/test-utils/source";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

describe("FLEXD type", () => {
  it("sets every amount in Playfair, not Cinzel", () => {
    const self = ["src/app/typography.test.ts"];
    expect(grepSource(/\bfont-display\b.*\btabular\b|\btabular\b.*\bfont-display\b/, ["src"], self)).toEqual([]);
  });
  it("defines the price face and the amethyst word", () => {
    expect(css).toMatch(/--font-price:/);
    expect(css).toMatch(/\.accent-word\s*\{/);
  });
  it("sets headlines in Cinzel capitals", () => {
    const punch = css.slice(css.indexOf("@utility font-punch"), css.indexOf("}", css.indexOf("@utility font-punch")));
    expect(punch).toMatch(/font-family:\s*var\(--font-display\)/);
    expect(punch).toMatch(/text-transform:\s*uppercase/);
  });
});
