import { describe, expect, it } from "vitest";
import { createMockBoxApi, type MockHost } from "@/box-api/mock";
import { emptyMockState, type MockWorld } from "@/box-api/mock-server";
import type { PendingOpen } from "@/store/session";
import { prepareOpen, runOpen } from "./open-flow";

const SLUG = "first-edition";

function harness() {
  let world: Omit<MockWorld, "now"> = { accountId: "a", usd: 1_000_000, transactions: [], inventory: [], box: emptyMockState() };
  let clock = Date.parse("2026-10-13T12:00:00Z");
  let n = 0;
  const host: MockHost = { read: () => world, write: (w) => (world = w) };
  const api = createMockBoxApi(host, {
    now: () => clock,
    latencyMs: () => 0,
    deps: { randomHex: () => (++n).toString(16).padStart(64, "0"), uuid: () => `id-${++n}` },
  });
  let pending: PendingOpen | undefined;
  const save = (p: PendingOpen) => (pending = p);
  return { api, world: () => world, advance: (ms: number) => (clock += ms), pending: () => pending, save };
}

describe("box page open flow", () => {
  it("prepares a fresh open (the seal shown before paying) when none is pending", async () => {
    const h = harness();
    const p = await prepareOpen(h.api, SLUG, undefined);
    expect(p.kind).toBe("ready");
    if (p.kind !== "ready") return;
    expect(p.open.status).toBe("created");
    expect(p.pending).toEqual({ openId: p.open.openId, payKey: null });
    expect(p.notice).toBeNull();
  });

  it("keeps the same prepared open across a reload", async () => {
    const h = harness();
    const first = await prepareOpen(h.api, SLUG, undefined);
    if (first.kind !== "ready") throw new Error("not ready");
    const again = await prepareOpen(h.api, SLUG, first.pending);
    expect(again).toMatchObject({ kind: "ready", open: { openId: first.open.openId } });
  });

  it("quietly replaces an expired open the player never tried to pay", async () => {
    const h = harness();
    const first = await prepareOpen(h.api, SLUG, undefined);
    if (first.kind !== "ready") throw new Error("not ready");
    h.advance(16 * 60 * 1000);
    const again = await prepareOpen(h.api, SLUG, first.pending);
    expect(again.kind).toBe("ready");
    if (again.kind !== "ready") return;
    expect(again.open.openId).not.toBe(first.open.openId);
    expect(again.notice).toBeNull();
  });

  it("says so when an open expired after the player tried to pay", async () => {
    const h = harness();
    const first = await prepareOpen(h.api, SLUG, undefined);
    if (first.kind !== "ready") throw new Error("not ready");
    h.advance(16 * 60 * 1000);
    const again = await prepareOpen(h.api, SLUG, { ...first.pending, payKey: "tried" });
    expect(again).toMatchObject({ kind: "ready", notice: expect.stringMatching(/expired/) });
  });

  it("opens: sets the seed, pays once with a stored key, spins", async () => {
    const h = harness();
    const p = await prepareOpen(h.api, SLUG, undefined);
    if (p.kind !== "ready") throw new Error("not ready");
    h.save(p.pending);
    const r = await runOpen(h.api, { pending: p.pending, seed: "my-seed", method: "card", newKey: () => "key-1", savePending: h.save });
    expect(r).toMatchObject({ status: "resolved", clientSeed: "my-seed", clientSeedSource: "player" });
    expect(h.pending()?.payKey).toBe("key-1");
    expect(h.world().usd).toBe(1_000_000 - r.priceCents);
  });

  it("after a reload mid-open, resumes to the same result and never charges twice", async () => {
    const h = harness();
    const p = await prepareOpen(h.api, SLUG, undefined);
    if (p.kind !== "ready") throw new Error("not ready");
    const first = await runOpen(h.api, { pending: p.pending, seed: "", method: "card", newKey: () => "key-1", savePending: h.save });
    const resumed = await prepareOpen(h.api, SLUG, h.pending());
    expect(resumed).toEqual({ kind: "resolved", result: first });
    const retried = await runOpen(h.api, { pending: h.pending()!, seed: "", method: "card", newKey: () => "key-2", savePending: h.save });
    expect(retried).toEqual(first);
    expect(h.world().transactions.filter((t) => t.type === "box_open")).toHaveLength(1);
  });
});
