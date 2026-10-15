import { describe, expect, it } from "vitest";
import { countdownParts, dropEndsAt } from "./drops";

describe("dropEndsAt", () => {
  it("ends on the coming Sunday at the last millisecond", () => {
    const end = new Date(dropEndsAt(new Date(2026, 9, 14, 9, 30)));
    expect(end.getDay()).toBe(0);
    expect(end.getDate()).toBe(18);
    expect([end.getHours(), end.getMinutes(), end.getSeconds()]).toEqual([23, 59, 59]);
  });

  it("ends the same day when it is already Sunday", () => {
    const end = new Date(dropEndsAt(new Date(2026, 9, 18, 10, 0)));
    expect(end.getDate()).toBe(18);
  });
});

describe("countdownParts", () => {
  it("splits milliseconds into days, hours, minutes and seconds", () => {
    expect(countdownParts(((2 * 24 + 3) * 3_600 + 4 * 60 + 5) * 1000)).toEqual({ d: 2, h: 3, m: 4, s: 5 });
    expect(countdownParts(-1)).toEqual({ d: 0, h: 0, m: 0, s: 0 });
  });
});
