import { describe, expect, it } from "vitest";
import { nextIndex } from "./select-menu";

describe("select menu keyboard", () => {
  it("moves through the options and stops at the ends", () => {
    expect(nextIndex("ArrowDown", 0, 3)).toBe(1);
    expect(nextIndex("ArrowDown", 2, 3)).toBe(2);
    expect(nextIndex("ArrowUp", 1, 3)).toBe(0);
    expect(nextIndex("ArrowUp", 0, 3)).toBe(0);
    expect(nextIndex("Home", 2, 3)).toBe(0);
    expect(nextIndex("End", 0, 3)).toBe(2);
  });

  it("ignores other keys", () => {
    expect(nextIndex("a", 1, 3)).toBeNull();
    expect(nextIndex("Enter", 1, 3)).toBeNull();
  });
});
