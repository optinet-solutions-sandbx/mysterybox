import { describe, expect, it } from "vitest";
import { latest, singleFlight } from "./guards";

describe("box page guards", () => {
  it("runs one task at a time and drops calls made while one is in flight", async () => {
    const flight = singleFlight();
    let runs = 0;
    let release!: () => void;
    const first = flight(() => new Promise<void>((r) => { runs++; release = r; }));
    expect(await flight(async () => { runs++; })).toBeUndefined();
    expect(runs).toBe(1);
    release();
    await first;
    await flight(async () => { runs++; });
    expect(runs).toBe(2);
  });

  it("treats every token but the newest as stale", () => {
    const l = latest();
    const a = l.next();
    const b = l.next();
    expect(l.isCurrent(a)).toBe(false);
    expect(l.isCurrent(b)).toBe(true);
  });
});
