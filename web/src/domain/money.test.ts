import { describe, expect, it } from "vitest";
import { formatDisplayedOdds, formatExactOdds, formatUsd } from "./money";

describe("formatUsd", () => {
  it("drops zero cents and keeps real ones", () => {
    expect(formatUsd(1_000_000)).toBe("$10,000");
    expect(formatUsd(180)).toBe("$1.80");
  });
});

describe("odds formats", () => {
  it("displayed odds round to 2 decimals and never read 0%", () => {
    expect(formatDisplayedOdds(0.3)).toBe("30%");
    expect(formatDisplayedOdds(0.00396)).toBe("0.4%");
    expect(formatDisplayedOdds(0.0004)).toBe("0.04%");
    expect(formatDisplayedOdds(0.0001)).toBe("0.01%");
    expect(formatDisplayedOdds(0.00004)).toBe("<0.01%");
  });

  it("back-office odds are exact to 3 decimals", () => {
    expect(formatExactOdds(0.3)).toBe("30.000%");
    expect(formatExactOdds(0.00396)).toBe("0.396%");
    expect(formatExactOdds(0.0001)).toBe("0.010%");
  });
});
