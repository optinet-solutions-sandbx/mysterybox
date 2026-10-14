import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function stripText() {
  const { steps } = await import("./how-it-works-strip");
  return steps.map((s) => `${s.title} ${s.body}`).join(" ");
}

describe("box page how-it-works strip", () => {
  it("describes the open the backend runs: sealed before paying, then ship or trade in for credit", async () => {
    const text = await stripText();
    expect(text).not.toMatch(/sell|reel|spin/i);
    expect(text).toMatch(/trade/i);
    expect(text).toMatch(/can.t be withdrawn/);
  });

  it("drops trade-in when NEXT_PUBLIC_TRADE_IN=off: pieces are kept or shipped", async () => {
    vi.stubEnv("NEXT_PUBLIC_TRADE_IN", "off");
    const text = await stripText();
    expect(text).not.toMatch(/trade|sell|can.t be withdrawn/i);
    expect(text).toMatch(/ship/i);
  });
});
