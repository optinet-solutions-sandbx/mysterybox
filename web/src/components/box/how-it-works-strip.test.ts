import { describe, expect, it } from "vitest";
import { stepsFor } from "./how-it-works-strip";

const text = (tradeIn: boolean) =>
  stepsFor(tradeIn)
    .map((s) => `${s.title} ${s.body}`)
    .join(" ");

describe("box page how-it-works strip", () => {
  it("describes the open the backend runs: sealed before paying, then ship or trade in for credit", () => {
    expect(text(true)).not.toMatch(/sell|reel|spin/i);
    expect(text(true)).toMatch(/trade/i);
    expect(text(true)).toMatch(/can.t be withdrawn/);
  });

  it("drops trade-in when the site setting turns it off: pieces are kept or shipped", () => {
    expect(text(false)).not.toMatch(/trade|sell|can.t be withdrawn/i);
    expect(text(false)).toMatch(/ship/i);
  });
});
