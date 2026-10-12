import { describe, expect, it } from "vitest";
import { buildDemoPlayers } from "@/data/demo-players";
import { boxes } from "@/data/boxes";
import { getItem } from "@/services/catalog";
import { economy } from "@/config/economy";
import { boxPerformance, dailyMetrics, kpis, overviewRow, presetRange } from "./analytics";

const today = "2026-10-12";
const players = buildDemoPlayers({ today });

describe("demo players", () => {
  it("are the same for everyone on a given day", () => {
    expect(buildDemoPlayers({ today })).toEqual(players);
    expect(buildDemoPlayers({ today: "2026-10-13" })[0]).not.toEqual(players[0]);
  });

  it("only act after registering and before today, and keep their books balanced", () => {
    for (const p of players) {
      for (const o of p.plays) {
        expect(o.at >= p.registeredAt).toBe(true);
        expect(o.at < `${today}T00:00:00Z`).toBe(true);
      }
      const money = p.money.filter((m) => m.status !== "cancelled").reduce((s, m) => s + m.amountCents, 0);
      const played = p.plays.reduce((s, o) => s + o.priceCents, 0);
      expect(p.balanceCents).toBe(money - played);
      expect(p.balanceCents).toBeGreaterThanOrEqual(0);
    }
  });

  it("look like a real funnel: most players play, returns land near the 90% target", () => {
    const k = kpis(players, presetRange("all", today, "2026-01-01"));
    expect(k.playersPlayedEver / k.registeredTotal).toBeGreaterThan(0.55);
    expect(k.playersPlayedEver / k.registeredTotal).toBeLessThan(0.8);
    expect(k.earnedCents / k.playedCents).toBeGreaterThan(0.7);
    expect(k.earnedCents / k.playedCents).toBeLessThan(1.1);
    expect(k.pendingWithdrawals).toBeGreaterThan(0);
  });
});

describe("back-office numbers", () => {
  const range = presetRange("30d", today, "2026-01-01");

  it("daily metrics add up to the KPIs for the same range", () => {
    const k = kpis(players, range);
    const days = dailyMetrics(players, range);
    expect(days).toHaveLength(30);
    const total = (key: keyof (typeof days)[number]) => days.reduce((s, d) => s + (d[key] as number), 0);
    expect(total("registrations")).toBe(k.registeredInRange);
    expect(total("openings")).toBe(k.openings);
    expect(total("playedCents")).toBe(k.playedCents);
    expect(total("earnedCents")).toBe(k.earnedCents);
    expect(total("depositsCents")).toBe(k.depositsCents);
  });

  it("the player overview adds up to all-time KPIs", () => {
    const all = kpis(players, presetRange("all", today, "2026-01-01"));
    const rows = players.map(overviewRow);
    expect(rows.reduce((s, r) => s + r.openings, 0)).toBe(all.openings);
    expect(rows.reduce((s, r) => s + r.houseNetCents, 0)).toBe(all.houseNetCents);
    expect(rows.filter((r) => r.openings > 0)).toHaveLength(all.playersPlayedEver);
  });

  it("box performance shows each box's configured return (priced at or just under 90%) next to actual returns", () => {
    const perf = boxPerformance(players, presetRange("all", today, "2026-01-01"), boxes, (id) => getItem(id).value, economy.oddsScale);
    for (const b of perf) {
      expect(b.expectedRtp).toBeLessThanOrEqual(economy.targetRtp + 1e-9);
      expect(b.expectedRtp).toBeGreaterThan(economy.targetRtp - 0.05);
    }
    expect(perf.reduce((s, b) => s + b.openings, 0)).toBe(kpis(players, presetRange("all", today, "2026-01-01")).openings);
  });
});
