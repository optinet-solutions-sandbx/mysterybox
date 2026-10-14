import { describe, expect, it } from "vitest";
import { staticCatalog } from "@/services/catalog";
import { freshSnapshot } from "@/store/session";
import type { StoredOpen } from "@/box-api/mock-server";
import type { Account } from "@/store/auth";
import { browserRecord } from "./data";

const account = { id: "a1", email: "p@example.com", firstName: "P", lastName: "Q", createdAt: "2026-10-13T10:00:00.000Z", status: "active" } as Account;

function open(over: Partial<StoredOpen>, outcomeId: string, creditsAwarded: number): StoredOpen {
  return {
    openId: `o-${outcomeId}`,
    boxSlug: "first-edition",
    accountId: "a1",
    createdAt: 0,
    expiresAt: 0,
    priceCents: 2_800,
    serverSeed: "s",
    serverHash: "h",
    tableHash: "t",
    bonusHash: "b",
    clientSeed: null,
    clientSeedSource: null,
    status: "resolved",
    resolved: { digest: "d", roll: 0, outcomeId, bonusSpins: [], creditsAwarded, awardId: null, resolvedAt: Date.parse("2026-10-13T12:00:00Z") },
    ...over,
  };
}

describe("back-office plays from the box system", () => {
  it("count every resolved open, credit and free spins included, at the price paid", () => {
    const snap = freshSnapshot();
    snap.boxApi.opens = [
      open({}, "credit-5", 5),
      open({}, "labubu", 0),
      open({ status: "created", resolved: undefined }, "never", 0),
    ];
    const plays = browserRecord(account, snap, staticCatalog).plays;
    expect(plays).toHaveLength(2);
    expect(plays.map((p) => p.priceCents)).toEqual([2_800, 2_800]);
    expect(plays.find((p) => p.itemId === "credit-5")!.valueCents).toBe(500);
    expect(plays.find((p) => p.itemId === "labubu")!.valueCents).toBe(staticCatalog.getItem("labubu").value);
  });

  it("fall back to inventory for accounts from before the box system", () => {
    const snap = freshSnapshot();
    snap.inventory = [{ uid: "u1", itemId: "labubu", boxId: "first-edition", acquiredAt: "2026-10-12T10:00:00.000Z", status: "held", draw: { serverSeedHash: "", clientSeed: "", nonce: 0, roll: 0 } }];
    expect(browserRecord(account, snap, staticCatalog).plays).toHaveLength(1);
  });
});
