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
  it("sets amounts rendered inside a Cinzel element in Playfair too (CountUp adds tabular itself)", () => {
    const amount = /<CountUp\b|formatUsd|formatBalance|formatUsdCompact/;
    const offenders = grepSource(/\bfont-display\b/, ["src/app", "src/components"]).filter((hit) => {
      const [file, line] = hit.split(":");
      const lines = readFileSync(join(process.cwd(), file), "utf8").split(/\r?\n/);
      const at = Number(line) - 1;
      // The element's own content: its line, plus the next line when the tag doesn't close there.
      const own = /<\/\w+>\s*$|\/>\s*$/.test(lines[at]) ? [lines[at]] : [lines[at], lines[at + 1] ?? ""];
      return own.some((l) => amount.test(l));
    });
    expect(offenders).toEqual([]);
  });

  it("defines the price face and the amethyst word", () => {
    expect(css).toMatch(/--font-price:/);
    expect(css).toMatch(/\.accent-word\s*\{/);
  });
  it("sets names in Cinzel, whose lower case are small capitals, and big headlines in Playfair capitals", () => {
    const block = (name: string) => css.slice(css.indexOf(`@utility ${name}`), css.indexOf("}", css.indexOf(`@utility ${name}`)));
    expect(block("font-punch")).toMatch(/font-family:\s*var\(--font-display\)/);
    expect(block("font-punch")).not.toMatch(/text-transform/);
    expect(block("font-hero")).toMatch(/font-family:\s*var\(--font-price\)/);
    expect(block("font-hero")).toMatch(/text-transform:\s*uppercase/);
  });
});
