import { describe, expect, it } from "vitest";
import { sha256Hex } from "@/domain/fair";
import type { InventoryItem } from "@/domain/types";
import { drawOpen } from "@/engine/draw";
import { catalogBox, getBox, getItem } from "@/services/catalog";
import { freshSnapshot } from "@/store/session";
import { BoxApiError, type BoxApi } from "./contract";
import { createMockBoxApi, type MockHost } from "./mock";
import { emptyMockState, type MockWorld } from "./mock-server";

const SLUG = "first-edition";
const box = catalogBox(getBox(SLUG)!);
const seedOf = (n: number) => n.toString(16).padStart(64, "0");

/** First test seed (from 1 up) whose open lands on an outcome of the wanted kind. */
async function seedFor(kind: "item" | "credit" | "bonus"): Promise<string> {
  for (let n = 1; n < 2_000; n++) {
    const r = await drawOpen({ slug: SLUG, serverSeed: seedOf(n), clientSeed: "alice", outcomes: box.outcomes, bonus: box.bonus });
    if (r.outcome.kind === kind) return seedOf(n);
  }
  throw new Error(`no ${kind} seed found`);
}

type World = Omit<MockWorld, "now">;

function harness(opts: { usd?: number; seeds?: string[] } = {}) {
  let world: World = { accountId: "acct-1", usd: opts.usd ?? 100_000, transactions: [], inventory: [], box: emptyMockState() };
  let clock = Date.parse("2026-10-13T12:00:00Z");
  const seeds = [...(opts.seeds ?? [])];
  let ids = 0;
  const host: MockHost = { read: () => world, write: (w) => (world = w) };
  const api: BoxApi = createMockBoxApi(host, {
    now: () => clock,
    latencyMs: () => 0,
    deps: { randomHex: () => seeds.shift() ?? seedOf(999_999), uuid: () => `id-${++ids}` },
  });
  return { api, world: () => world, setWorld: (w: World) => (world = w), advance: (ms: number) => (clock += ms) };
}

async function rejects(p: Promise<unknown>, status: number) {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(BoxApiError);
  expect((err as BoxApiError).status).toBe(status);
}

describe("mock box API: create and seed", () => {
  it("commits to the secret's hash, pins the price and tables, and never returns the secret", async () => {
    const h = harness({ seeds: [seedOf(7)] });
    const open = await h.api.createOpen(SLUG);
    expect(open).toMatchObject({ status: "created", boxSlug: SLUG, priceCents: box.priceCents, nonce: 1, clientSeed: null });
    expect(open.serverHash).toBe(await sha256Hex(seedOf(7)));
    expect(open.tableHash).toBe((await h.api.getBox(SLUG)).tableHash);
    expect(Date.parse(open.expiresAt) - Date.parse("2026-10-13T12:00:00Z")).toBe(15 * 60 * 1000);
    expect(JSON.stringify(open)).not.toContain(seedOf(7));
    expect(JSON.stringify(await h.api.getOpen(open.openId))).not.toContain(seedOf(7));
  });

  it("refuses to create an open when nobody is signed in", async () => {
    const h = harness();
    h.setWorld({ ...h.world(), accountId: null });
    await rejects(h.api.createOpen(SLUG), 401);
  });

  it("takes a client seed of 1 to 64 characters, only before payment", async () => {
    const h = harness();
    const { openId } = await h.api.createOpen(SLUG);
    await rejects(h.api.setClientSeed(openId, ""), 422);
    await rejects(h.api.setClientSeed(openId, "x".repeat(65)), 422);
    await h.api.setClientSeed(openId, "alice");
    expect((await h.api.getOpen(openId)).clientSeed).toBe("alice");
    await h.api.pay(openId, { method: "card", idempotencyKey: "k1" });
    await rejects(h.api.setClientSeed(openId, "bob"), 409);
  });
});

describe("mock box API: pay", () => {
  it("charges the demo balance once per idempotency key, even for two calls at the same time", async () => {
    const h = harness({ usd: 100_000 });
    const { openId } = await h.api.createOpen(SLUG);
    const [a, b] = await Promise.all([
      h.api.pay(openId, { method: "card", idempotencyKey: "same" }),
      h.api.pay(openId, { method: "card", idempotencyKey: "same" }),
    ]);
    expect(a).toEqual(b);
    expect(h.world().usd).toBe(100_000 - box.priceCents);
    expect(h.world().transactions.filter((t) => t.type === "box_open")).toHaveLength(1);
    expect((await h.api.getOpen(openId)).status).toBe("paid");
  });

  it("refuses a card payment the demo balance can't cover, and changes nothing", async () => {
    const h = harness({ usd: box.priceCents - 1 });
    const { openId } = await h.api.createOpen(SLUG);
    const before = JSON.stringify(h.world());
    await rejects(h.api.pay(openId, { method: "card", idempotencyKey: "k" }), 402);
    expect(JSON.stringify(h.world())).toBe(before);
  });

  it("refuses to pay an open that expired (15 minutes)", async () => {
    const h = harness();
    const { openId } = await h.api.createOpen(SLUG);
    h.advance(15 * 60 * 1000 + 1);
    expect((await h.api.getOpen(openId)).status).toBe("expired");
    await rejects(h.api.pay(openId, { method: "card", idempotencyKey: "k" }), 409);
  });

  it("pays with site credit when there is enough, and refuses when there isn't", async () => {
    const credit = await seedFor("credit");
    const h = harness({ seeds: [credit, seedOf(3), seedOf(4)] });
    const first = await h.api.createOpen(SLUG);
    await h.api.pay(first.openId, { method: "card", idempotencyKey: "a" });
    const won = await h.api.spin(first.openId);
    const balance = (await h.api.myCredits()).balance;
    expect(balance).toBe(won.creditsAwarded);
    const second = await h.api.createOpen(SLUG);
    if (balance * 100 >= box.priceCents) {
      const paid = await h.api.pay(second.openId, { method: "credit", idempotencyKey: "b" });
      expect(paid.creditBalance).toBe(balance - box.priceCents / 100);
    } else {
      await rejects(h.api.pay(second.openId, { method: "credit", idempotencyKey: "b" }), 402);
      expect((await h.api.myCredits()).balance).toBe(balance);
    }
  });
});

describe("mock box API: spin", () => {
  it("refuses to spin before payment", async () => {
    const h = harness();
    const { openId } = await h.api.createOpen(SLUG);
    await rejects(h.api.spin(openId), 409);
  });

  it("resolves exactly as the engine does, fills the published default seed, and reveals the secret", async () => {
    const h = harness({ seeds: [seedOf(11)] });
    const { openId } = await h.api.createOpen(SLUG);
    expect("serverSeed" in (await h.api.getOpen(openId))).toBe(false);
    await h.api.pay(openId, { method: "card", idempotencyKey: "k" });
    const r = await h.api.spin(openId);
    const expected = await drawOpen({ slug: SLUG, serverSeed: seedOf(11), clientSeed: "grailnoir-default", outcomes: box.outcomes, bonus: box.bonus });
    expect(r).toMatchObject({ status: "resolved", serverSeed: seedOf(11), clientSeed: "grailnoir-default", clientSeedSource: "server-default", digest: expected.digest, roll: expected.roll });
    expect(r.outcome.id).toBe(expected.outcome.id);
    expect(r.bonusSpins).toEqual(expected.bonusSpins);
    expect((await h.api.getOpen(openId)) as typeof r).toMatchObject({ serverSeed: seedOf(11) });
  });

  it("is safe to retry: a second spin returns the identical stored result", async () => {
    const h = harness({ seeds: [seedOf(5)] });
    const { openId } = await h.api.createOpen(SLUG);
    await h.api.pay(openId, { method: "card", idempotencyKey: "k" });
    const first = await h.api.spin(openId);
    expect(await h.api.spin(openId)).toEqual(first);
    expect(h.world().box.ledger.length + h.world().inventory.length).toBeLessThanOrEqual(2);
  });

  it("puts a piece in the inventory with its trade-in rate", async () => {
    const h = harness({ seeds: [await seedFor("item")] });
    const { openId } = await h.api.createOpen(SLUG);
    await h.api.setClientSeed(openId, "alice");
    await h.api.pay(openId, { method: "card", idempotencyKey: "k" });
    const r = await h.api.spin(openId);
    expect(r.outcome.kind).toBe("item");
    expect(r.creditsAwarded).toBe(0);
    const inv = h.world().inventory.find((i) => i.uid === r.itemAward?.awardId);
    expect(inv).toMatchObject({ itemId: r.outcome.id, status: "held", openId, boxId: SLUG });
    expect(r.itemAward).toEqual({ awardId: inv!.uid, valueCents: r.outcome.valueCents, tradeInCredits: Math.floor((r.outcome.valueCents! * 0.9) / 100) });
  });

  it("pays credit and free-spin credit into the ledger", async () => {
    const h = harness({ seeds: [await seedFor("bonus")] });
    const { openId } = await h.api.createOpen(SLUG);
    await h.api.setClientSeed(openId, "alice");
    await h.api.pay(openId, { method: "card", idempotencyKey: "k" });
    const r = await h.api.spin(openId);
    expect(r.outcome.kind).toBe("bonus");
    expect(r.bonusSpins).toHaveLength(r.outcome.freeSpins);
    expect(r.creditsAwarded).toBe(r.outcome.credits + r.bonusSpins.reduce((s, b) => s + b.credits, 0));
    const { balance, ledger } = await h.api.myCredits();
    expect(balance).toBe(r.creditsAwarded);
    expect(ledger.map((e) => e.reason).sort()).toEqual(["bonus-award", "box-award"]);
    expect(h.world().inventory).toHaveLength(0);
  });
});

describe("mock box API: trade-in, awards and verify", () => {
  it("trades a piece in once, at 90% of listed value in whole credits", async () => {
    const h = harness({ seeds: [await seedFor("item")] });
    const { openId } = await h.api.createOpen(SLUG);
    await h.api.setClientSeed(openId, "alice");
    await h.api.pay(openId, { method: "card", idempotencyKey: "k" });
    const r = await h.api.spin(openId);
    const out = await h.api.tradeIn(r.itemAward!.awardId);
    expect(out).toEqual({ credits: r.itemAward!.tradeInCredits, creditBalance: r.itemAward!.tradeInCredits });
    expect(h.world().inventory[0].status).toBe("traded");
    expect((await h.api.listAwards())[0]).toMatchObject({ awardId: r.itemAward!.awardId, status: "traded" });
    await rejects(h.api.tradeIn(r.itemAward!.awardId), 409);
  });

  it("trades in a piece from before the box API (no open id)", async () => {
    const h = harness();
    const legacy: InventoryItem = { uid: "old-1", itemId: "lady-dior", boxId: "atelier", acquiredAt: "2026-10-10T00:00:00Z", status: "held", draw: { serverSeedHash: "x", clientSeed: "y", nonce: 0, roll: 0 } };
    h.setWorld({ ...h.world(), inventory: [legacy] });
    const out = await h.api.tradeIn("old-1");
    expect(out.credits).toBe(Math.floor((getItem("lady-dior").value * 0.9) / 100));
  });

  it("verifies a resolved open, and rejects a tampered secret", async () => {
    const h = harness({ seeds: [seedOf(21)] });
    const { openId } = await h.api.createOpen(SLUG);
    await h.api.pay(openId, { method: "card", idempotencyKey: "k" });
    const r = await h.api.spin(openId);
    const q = { slug: SLUG, serverSeed: r.serverSeed, clientSeed: r.clientSeed, tableHash: r.tableHash, serverHash: r.serverHash, outcomeId: r.outcome.id };
    expect(await h.api.verify(q)).toMatchObject({ ok: true, outcomeId: r.outcome.id, digest: r.digest });
    const bad = await h.api.verify({ ...q, serverSeed: seedOf(22) });
    expect(bad.ok).toBe(false);
    expect(bad.reason).toBeTruthy();
    expect((await h.api.getTable(r.tableHash)).entries).toEqual(box.outcomes.map(({ id, percent }) => ({ id, percent })));
  });
});

describe("per-account storage", () => {
  it("starts every account with an empty credit ledger", () => {
    expect(freshSnapshot().boxApi.ledger).toEqual([]);
    expect(freshSnapshot().pendingOpens).toEqual({});
  });

  it("fills the box API fields when swapping in an account saved before they existed", () => {
    const { boxApi: _drop, pendingOpens: _p, preferredClientSeed: _s, ...legacy } = freshSnapshot();
    const swapped = { ...freshSnapshot(), ...legacy };
    expect(swapped.boxApi).toEqual(emptyMockState());
    expect(swapped.pendingOpens).toEqual({});
  });
});
