import { describe, expect, it } from "vitest";
import { steps } from "./how-it-works-strip";

describe("box page how-it-works strip", () => {
  it("describes the open the backend runs: sealed before paying, then ship or trade in for credit", () => {
    const text = steps.map((s) => `${s.title} ${s.body}`).join(" ");
    expect(text).not.toMatch(/sell|reel/i);
    expect(text).toMatch(/trade/i);
    expect(text).toMatch(/can.t be withdrawn/);
  });
});
