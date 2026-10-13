import { describe, expect, it } from "vitest";
import { formatCredit, formatDisplayedOdds, formatExactOdds, formatExactPercent, formatOneIn, formatPercent, formatUsd } from "./money";

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

describe("box API odds formats (percent in, as the backend sends them)", () => {
  it("shows small chances with enough digits, never as 0% or <0.01%", () => {
    expect(formatPercent(0.00405)).toBe("0.00405%");
    expect(formatPercent(0.0154)).toBe("0.0154%");
    expect(formatPercent(0.579465)).toBe("0.579%");
    expect(formatPercent(9)).toBe("9%");
    expect(formatPercent(30.83042011764706)).toBe("30.83%");
    expect(formatPercent(0)).toBe("0%");
  });

  it("reads 1 in N as 100 divided by the percent, rounded", () => {
    expect(formatOneIn(0.00405)).toBe("1 in 24,691");
    expect(formatOneIn(30.83)).toBe("1 in 3");
    expect(formatOneIn(1.65)).toBe("1 in 61");
  });

  it("shows the exact stored percent to at most 8 decimals", () => {
    expect(formatExactPercent(0.015365)).toBe("0.015365%");
    expect(formatExactPercent(30.83042011764706)).toBe("30.83042012%");
    expect(formatExactPercent(48)).toBe("48%");
  });

  it("shows site credit as dollars of credit", () => {
    expect(formatCredit(12)).toBe("$12 credit");
    expect(formatCredit(1_250)).toBe("$1,250 credit");
  });
});
