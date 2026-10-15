import { describe, expect, it } from "vitest";
import { brand } from "@/config/brand";
import { grepSource } from "@/test-utils/source";

const SELF = ["src/no-leftovers.test.ts"];

describe("FLEXD carries nothing of Grail Noir", () => {
  it("is called FLEXD and has no slogan", () => {
    expect(brand.name).toBe("FLEXD");
    expect(brand).not.toHaveProperty("tagline");
  });

  it("names no Grail Noir brand, domain, slogan or storage key", () => {
    expect(grepSource(/grail ?noir|grailnoir|go noir/i, ["src", "public"], SELF)).toEqual([]);
  });

  it("keeps none of Grail Noir's burgundy", () => {
    const burgundy =
      /burgundy|onyx-wine|garnet|crimson|--cream\b|#(1c0a10|3d1520|800020|9f1d35|650015|c73a52|4a0010|cbb9b0)\b|0x(4a0f1e|650015|c73a52|9f1d35|4a0010|b02a45|1c0a10)\b/i;
    expect(grepSource(burgundy, ["src"], SELF)).toEqual([]);
  });

  it("has no theme switch or light boot path", () => {
    // The light colour block in globals.css goes in Task 5 (tokens.test.ts checks it).
    expect(grepSource(/setTheme|ThemeSwitch|themeBootScript|prefers-color-scheme: light/, ["src"], SELF)).toEqual([]);
  });
});
