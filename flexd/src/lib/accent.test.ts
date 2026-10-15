import { describe, expect, it } from "vitest";
import { splitAccent } from "./accent";

describe("splitAccent", () => {
  it("accents the last word of a name", () => {
    expect(splitAccent("The Time Room")).toEqual({ lead: "The Time", accent: "Room" });
  });
  it("leaves a one-word name alone", () => {
    expect(splitAccent("Vanity")).toEqual({ lead: "Vanity", accent: null });
  });
  it("ignores padding", () => {
    expect(splitAccent("  Grail Reserve ")).toEqual({ lead: "Grail", accent: "Reserve" });
  });
  it("copes with an empty name", () => {
    expect(splitAccent("")).toEqual({ lead: "", accent: null });
  });
});
