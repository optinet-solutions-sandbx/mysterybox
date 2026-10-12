import { describe, expect, it } from "vitest";
import type { PlayerRecord } from "./analytics";
import { accountSummary, autoTags, loyaltyPoints, maskEmail, playerNumber, segmentsFor } from "./player-insights";

const now = Date.parse("2026-10-13T12:00:00Z");

function player(over: Partial<PlayerRecord> = {}): PlayerRecord {
  return {
    id: "p-1",
    email: "pat.doe@gmail.com",
    firstName: "Pat",
    lastName: "Doe",
    phoneDial: "+1",
    phoneNumber: "2125550147",
    state: "NY",
    status: "active",
    kycStatus: "not_started",
    marketingOptIn: false,
    registeredAt: "2026-10-01T10:00:00Z",
    lastSeenAt: null,
    balanceCents: 5_000,
    heldCents: 0,
    plays: [
      { at: "2026-10-02T10:00:00Z", boxId: "first-edition", priceCents: 2_800, itemId: "credit-2", valueCents: 200 },
      { at: "2026-10-10T10:00:00Z", boxId: "first-edition", priceCents: 2_800, itemId: "labubu", valueCents: 30_000 },
    ],
    money: [
      { id: "d1", at: "2026-10-01T11:00:00Z", type: "deposit", amountCents: 10_000, status: "completed" },
      { id: "d2", at: "2026-10-09T11:00:00Z", type: "deposit", amountCents: 5_000, status: "pending" },
      { id: "s1", at: "2026-10-02T10:05:00Z", type: "sell_back", amountCents: 180, status: "completed" },
      { id: "w1", at: "2026-10-11T10:00:00Z", type: "withdrawal", amountCents: -6_000, status: "completed" },
      { id: "w2", at: "2026-10-12T10:00:00Z", type: "withdrawal", amountCents: -2_500, status: "pending" },
    ],
    source: "browser",
    ...over,
  };
}

describe("player identity", () => {
  it("masks emails like the reference title", () => {
    expect(maskEmail("pat.doe@gmail.com")).toBe("p******@g****.c**");
    expect(maskEmail("a@b.io")).toBe("a*@b*.i*");
  });

  it("gives every player a stable 6-digit number", () => {
    const n = playerNumber("2f6c1a9e-1d0b-4c55-9d7f-0d1e2a3b4c5d");
    expect(n).toBe(playerNumber("2f6c1a9e-1d0b-4c55-9d7f-0d1e2a3b4c5d"));
    expect(n).toBeGreaterThanOrEqual(100_000);
    expect(n).toBeLessThan(1_000_000);
  });
});

describe("accountSummary", () => {
  it("splits money the way the reference Accounts row does", () => {
    expect(accountSummary(player())).toMatchObject({
      depositsSum: 10_000,
      unreceivedDepositsSum: 5_000,
      cashoutsSum: 6_000,
      pendingCashoutsSum: 2_500,
      spentOnBoxes: 5_600,
      earned: 30_200,
      houseProfit: -24_600,
      avgBoxPrice: 2_800,
      soldBackSum: 180,
      bonusRatio: 0,
    });
  });

  it("earns 1 loyalty point per dollar spent, in micropoints", () => {
    expect(loyaltyPoints(player())).toEqual({ status: 56_000_000, redeemable: 56_000_000 });
  });
});

describe("tags and groups", () => {
  it("flags a high withdrawal ratio and the player's state", () => {
    const labels = autoTags(player(), now).map((t) => t.label);
    expect(labels).toContain("HighWDRatio");
    expect(labels).toContain("Locale US-NY");
    expect(labels).not.toContain("New");
  });

  it("puts players in the right groups", () => {
    const ids = segmentsFor(player(), now).map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["depositors", "active-7d", "big-pull", "pending-cashout"]));
    expect(ids).not.toContain("reload");
    expect(ids).not.toContain("never-played");
    expect(segmentsFor(player({ plays: [], money: [] }), now).map((s) => s.id)).toContain("never-played");
  });
});
