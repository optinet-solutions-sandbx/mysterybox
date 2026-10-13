import { describe, expect, it } from "vitest";
import { sha256Hex } from "@/domain/fair";
import vectors from "./test-vectors.json";
import {
  DEFAULT_CLIENT_SEED,
  bands,
  bonusHash,
  canonicalJson,
  digestOf,
  drawKey,
  drawOpen,
  resolve,
  rollOf,
  tableHash,
  verifyOpen,
} from "./draw";
import { bonusEv, boxMaths } from "./maths";

// The backend kit's vectors (kit v1.0), MISTY's product names stripped. Every value must match byte for byte.
const { slug, price, entries, bonus: kitBonus, tableHash: liveTableHash } = vectors.box;
const bonus = kitBonus.map((b) => ({ credits: b.mistees, percent: b.weight }));
const table = entries.map(({ id, percent }) => ({ id, percent }));
const outcomes = entries.map(({ id, percent }) => ({ id, percent, freeSpins: 0 }));

describe("engine: the backend kit's draw recipe", () => {
  describe.each(vectors.vectors)("server seed $serverSeed, client seed '$clientSeed'", (v) => {
    it("commits to the SHA-256 of the server seed", async () => {
      expect(await sha256Hex(v.serverSeed)).toBe(v.serverHash);
    });

    it.each(v.spins)("nonce $nonce: key, digest, roll, outcome and free-spin credits", async (s) => {
      expect(drawKey(slug, v.serverSeed, v.clientSeed, s.nonce)).toBe(s.key);
      const digest = await digestOf(slug, v.serverSeed, v.clientSeed, s.nonce);
      expect(digest).toBe(s.digest);
      expect(rollOf(digest)).toBe(s.roll);
      expect(resolve(entries, s.roll).id).toBe(s.outcomeId);
      expect(resolve(bonus, s.roll).credits).toBe(s.bonusIfFreeSpin);
    });
  });

  it("hashes the live table with the price in dollars, as the kit's vector does", async () => {
    expect(await tableHash(slug, price, table)).toBe(liveTableHash);
  });

  it("reproduces the kit's full open", async () => {
    const f = vectors.fullOpen.spin;
    const r = await drawOpen({ slug: f.boxSlug, serverSeed: f.serverSeed, clientSeed: f.clientSeed, outcomes, bonus });
    expect(r.digest).toBe(f.digest);
    expect(r.roll).toBe(f.roll);
    expect(r.outcome.id).toBe(f.outcomeId);
    expect(r.bonusSpins).toEqual([]);
  });

  it("plays free spins with the same seeds at nonce 2 and up, against the free-spin table", async () => {
    const v = vectors.vectors[0];
    const withSpin = outcomes.map((o) => (o.id === v.spins[0].outcomeId ? { ...o, freeSpins: 1 } : o));
    const r = await drawOpen({ slug, serverSeed: v.serverSeed, clientSeed: v.clientSeed, outcomes: withSpin, bonus });
    expect(r.outcome.id).toBe(v.spins[0].outcomeId);
    expect(r.bonusSpins).toEqual([{ nonce: 2, digest: v.spins[1].digest, roll: v.spins[1].roll, credits: v.spins[1].bonusIfFreeSpin }]);
  });

  it("walks bands in stored order from 0 to the total and never lands on a 0% row", () => {
    const rows = [
      { id: "a", percent: 10 },
      { id: "z", percent: 0 },
      { id: "b", percent: 90 },
    ];
    expect(bands(rows).map((x) => [x.entry.id, x.from, x.to])).toEqual([
      ["a", 0, 10],
      ["z", 10, 10],
      ["b", 10, 100],
    ]);
    expect(resolve(rows, 0.0999).id).toBe("a");
    expect(resolve(rows, 0.1).id).toBe("b");
    expect(resolve(rows, 0.999999).id).toBe("b");
  });

  it("serialises canonical JSON with sorted keys and no whitespace", () => {
    expect(canonicalJson({ b: 1, a: [{ y: 2, x: "s" }] })).toBe('{"a":[{"x":"s","y":2}],"b":1}');
  });

  it("hashes the free-spin table stably, and the hash changes with the table", async () => {
    const h = await bonusHash(slug, bonus);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(await bonusHash(slug, bonus)).toBe(h);
    expect(await bonusHash(slug, bonus.slice(1))).not.toBe(h);
  });

  it("verifies the kit's full open, and rejects a secret that doesn't match the seal", async () => {
    const f = vectors.fullOpen.spin;
    const q = { slug, priceDollars: price, serverSeed: f.serverSeed, serverHash: f.serverHash, clientSeed: f.clientSeed, tableHash: f.tableHash, table, bonus, outcomeId: f.outcomeId };
    expect(await verifyOpen(q)).toMatchObject({ ok: true, outcomeId: f.outcomeId, digest: f.digest, roll: f.roll, reason: null });
    const tampered = await verifyOpen({ ...q, serverSeed: "00" + f.serverSeed.slice(2) });
    expect(tampered.ok).toBe(false);
    expect(tampered.reason).toMatch(/seal/);
  });

  it("rejects an open whose pinned table hash isn't the table being checked", async () => {
    const f = vectors.fullOpen.spin;
    const r = await verifyOpen({ slug, priceDollars: 25, serverSeed: f.serverSeed, clientSeed: f.clientSeed, tableHash: f.tableHash, table, bonus });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/table/);
  });

  it("publishes a default client seed for opens where the player set none", () => {
    expect(DEFAULT_CLIENT_SEED).toBe("grailnoir-default");
  });
});

describe("engine: per-open maths", () => {
  it("adds up worth × chance (the kit's Little Box pays back 79% on screen)", () => {
    const m = boxMaths({
      priceCents: 1_000,
      bonus: [],
      outcomes: [
        { id: "watch", label: "Watch", kind: "item", credits: 0, freeSpins: 0, valueCents: 40_000, percent: 1 },
        { id: "perfume", label: "Perfume", kind: "item", credits: 0, freeSpins: 0, valueCents: 5_000, percent: 4 },
        { id: "c2", label: "2 credit", kind: "credit", credits: 2, freeSpins: 0, valueCents: null, percent: 95 },
      ],
    });
    expect(m.payFaceCents).toBeCloseTo(790, 9);
    expect(m.returnFace).toBeCloseTo(0.79, 12);
    expect(m.pItem).toBeCloseTo(0.05, 12);
    expect(m.evItemsCents).toBeCloseTo(600, 9);
    expect(m.evCredits).toBeCloseTo(1.9, 12);
    expect(m.rows.map((r) => Math.round(r.costCents * 1e6) / 1e6)).toEqual([400, 200, 190]);
  });

  it("counts a free spin at the free-spin table's average", () => {
    const misty = [
      { credits: 1, percent: 70 },
      { credits: 2, percent: 22 },
      { credits: 5, percent: 6 },
      { credits: 10, percent: 1.8 },
      { credits: 20, percent: 0.2 },
    ];
    expect(bonusEv(misty)).toBeCloseTo(1.66, 12);
    const m = boxMaths({
      priceCents: 1_000,
      bonus: misty,
      outcomes: [{ id: "fs", label: "1 credit + free spin", kind: "bonus", credits: 1, freeSpins: 1, valueCents: null, percent: 100 }],
    });
    expect(m.rows[0].worthCents).toBeCloseTo(266, 9);
    expect(m.evCredits).toBeCloseTo(2.66, 12);
    expect(m.bonusEvCredits).toBeCloseTo(1.66, 12);
  });
});
