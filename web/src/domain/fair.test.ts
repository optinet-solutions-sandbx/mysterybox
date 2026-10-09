import { describe, expect, it } from "vitest";
import { computeRoll, hmacSha256Hex, randomHex, rollFromHex, sha256Hex } from "./fair";

describe("hashing", () => {
  it("matches the SHA-256 test vector", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("matches RFC 4231 HMAC-SHA256 test case 2", async () => {
    expect(await hmacSha256Hex("Jefe", "what do ya want for nothing?")).toBe(
      "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    );
  });
});

describe("rollFromHex", () => {
  it("maps the first 32 bits onto [0, scale)", () => {
    expect(rollFromHex("00000000", 100_000)).toBe(0);
    expect(rollFromHex("80000000", 100_000)).toBe(50_000);
    expect(rollFromHex("ffffffff", 100_000)).toBe(99_999);
  });

  it("rejects non-hex input", () => {
    expect(() => rollFromHex("zz")).toThrow();
  });
});

describe("computeRoll", () => {
  it("is deterministic for the same seeds and nonce", async () => {
    const a = await computeRoll("server", "client", 7);
    const b = await computeRoll("server", "client", 7);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(100_000);
  });

  it("changes with the nonce", async () => {
    const rolls = await Promise.all([0, 1, 2, 3].map((n) => computeRoll("server", "client", n)));
    expect(new Set(rolls).size).toBeGreaterThan(1);
  });
});

describe("randomHex", () => {
  it("returns two hex chars per byte", () => {
    expect(randomHex(16)).toMatch(/^[0-9a-f]{32}$/);
  });
});
