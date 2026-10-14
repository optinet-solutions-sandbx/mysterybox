import { describe, expect, it } from "vitest";
import { demoClock, economy } from "@/config/economy";
import {
  cashOutError,
  charge,
  formatTimeLeft,
  isVaultExpired,
  levelFor,
  payoutCompleted,
  pointsFor,
  shipmentStage,
  shippingQuote,
  vaultDeadline,
} from "./wallet";

describe("charge", () => {
  it("spends credit before withdrawable", () => {
    const r = charge({ credit: 10_000, withdrawable: 5_000 }, 12_000);
    expect(r).toEqual({ ok: true, balances: { credit: 0, withdrawable: 3_000 }, fromCredit: 10_000, fromWithdrawable: 2_000 });
  });

  it("leaves withdrawable alone when credit covers it", () => {
    const r = charge({ credit: 10_000, withdrawable: 5_000 }, 4_000);
    expect(r.ok && r.balances).toEqual({ credit: 6_000, withdrawable: 5_000 });
  });

  it("reports the shortfall", () => {
    expect(charge({ credit: 1_000, withdrawable: 500 }, 2_000)).toEqual({ ok: false, short: 500 });
  });

  it("rejects non-positive or fractional amounts", () => {
    expect(() => charge({ credit: 1, withdrawable: 1 }, 0)).toThrow();
    expect(() => charge({ credit: 1, withdrawable: 1 }, 1.5)).toThrow();
  });
});

describe("shippingQuote", () => {
  it("charges one base fee and a small fee per extra piece", () => {
    const q = shippingQuote([4_500, 5_000]);
    expect(q).toMatchObject({ base: 1_500, extra: 500, insurance: 0, total: 2_000 });
  });

  it("insures pieces of $500 or more at 1.5% of their value", () => {
    const q = shippingQuote([50_000, 49_999, 1_170_000]);
    expect(q.insuredPieces).toBe(2);
    expect(q.insurance).toBe(750 + 17_550);
    expect(q.total).toBe(1_500 + 1_000 + 18_300);
  });

  it("needs at least one piece", () => {
    expect(() => shippingQuote([])).toThrow();
  });
});

describe("cashOutError", () => {
  it("enforces the minimum and the withdrawable balance", () => {
    expect(cashOutError(10_000, economy.minWithdrawal - 1)).toMatch(/smallest/);
    expect(cashOutError(10_000, 10_001)).toMatch(/more than/);
    expect(cashOutError(10_000, 0)).toMatch(/amount/);
    expect(cashOutError(10_000, economy.minWithdrawal)).toBeNull();
    expect(cashOutError(10_000, 10_000)).toBeNull();
  });
});

describe("vault", () => {
  const keptAt = "2026-10-01T12:00:00.000Z";

  it("expires exactly vaultDays after the piece was kept", () => {
    const deadline = vaultDeadline(keptAt);
    expect(deadline - Date.parse(keptAt)).toBe(economy.vaultDays * 86_400_000);
    expect(isVaultExpired(keptAt, deadline - 1)).toBe(false);
    expect(isVaultExpired(keptAt, deadline)).toBe(true);
  });

  it("formats the time left with its two largest units", () => {
    expect(formatTimeLeft((6 * 24 + 23) * 3_600_000 + 59_000)).toBe("6d 23h");
    expect(formatTimeLeft(4 * 3_600_000 + 12 * 60_000)).toBe("4h 12m");
    expect(formatTimeLeft(38_000)).toBe("38s");
    expect(formatTimeLeft(-5)).toBe("0s");
  });
});

describe("demo clock", () => {
  const at = "2026-10-14T10:00:00.000Z";
  const t0 = Date.parse(at);

  it("moves shipments from preparing to shipped to delivered", () => {
    expect(shipmentStage(at, t0)).toBe("preparing");
    expect(shipmentStage(at, t0 + demoClock.shipmentShippedAfterMs)).toBe("shipped");
    expect(shipmentStage(at, t0 + demoClock.shipmentDeliveredAfterMs)).toBe("delivered");
  });

  it("completes payouts after the demo delay", () => {
    expect(payoutCompleted(at, t0)).toBe(false);
    expect(payoutCompleted(at, t0 + demoClock.payoutCompletesAfterMs)).toBe(true);
  });
});

describe("levels", () => {
  it("awards a point per whole dollar spent", () => {
    expect(pointsFor(14_799)).toBe(147);
  });

  it("finds the level and progress to the next", () => {
    expect(levelFor(0)).toMatchObject({ level: { name: "Ivory" }, next: { name: "Navy" }, progress: 0 });
    expect(levelFor(250).progress).toBe(0.5);
    expect(levelFor(500).level.name).toBe("Navy");
    expect(levelFor(60_000)).toMatchObject({ level: { name: "Gold" }, next: null, progress: 1 });
  });
});
