import { describe, expect, it } from "vitest";
import { authenticitySummary } from "./authenticity";

describe("authenticity details", () => {
  it("reads as reference then condition, and only what staff filled in", () => {
    expect(authenticitySummary({ reference: "126200", condition: "unworn" })).toBe("Ref. 126200 · Unworn");
    expect(authenticitySummary({ condition: "pre-owned-excellent" })).toBe("Pre-owned, excellent");
    expect(authenticitySummary({ reference: "M44875" })).toBe("Ref. M44875");
    expect(authenticitySummary({})).toBeNull();
  });
});
