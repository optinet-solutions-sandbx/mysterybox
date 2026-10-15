import { describe, expect, it } from "vitest";
import { formatBalance, formatDisplayedOdds, formatOneIn, formatUsd, formatUsdCompact } from "./money";

describe("formatUsd", () => {
  it("drops zero cents and keeps real ones", () => {
    expect(formatUsd(150_000)).toBe("$1,500");
    expect(formatUsd(51_750)).toBe("$517.50");
  });

  it("balances always show cents", () => {
    expect(formatBalance(250_000)).toBe("$2,500.00");
  });

  it("compacts large values", () => {
    expect(formatUsdCompact(95_000)).toBe("$950");
    expect(formatUsdCompact(1_170_000)).toBe("$11.7k");
  });
});

describe("odds formats", () => {
  it("rounds to 2 decimals and never reads 0%", () => {
    expect(formatDisplayedOdds(0.25)).toBe("25%");
    expect(formatDisplayedOdds(0.012345)).toBe("1.23%");
    expect(formatDisplayedOdds(0.00004)).toBe("<0.01%");
  });

  it("reads 1 in N", () => {
    expect(formatOneIn(0.0004)).toBe("1 in 2,500");
    expect(formatOneIn(0)).toBe("never");
  });
});
