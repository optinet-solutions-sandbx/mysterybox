import { describe, expect, it } from "vitest";
import { addressErrors, emailError, inAppBrowser, normalizeReferralCode, referralCodeFor, usernameError } from "./account";

describe("sign-up validation", () => {
  it("checks usernames", () => {
    expect(usernameError("jo")).toMatch(/3/);
    expect(usernameError("noir_fan_2026")).toBeNull();
    expect(usernameError("bad name")).toMatch(/letters/);
    expect(usernameError("x".repeat(21))).toMatch(/20/);
  });

  it("checks emails", () => {
    expect(emailError("john@flexd.com")).toBeNull();
    expect(emailError("john@flexd")).not.toBeNull();
  });
});

describe("referral codes", () => {
  it("derives the code from the username", () => {
    expect(referralCodeFor(" noir_fan ")).toBe("NOIR_FAN");
  });

  it("normalises codes from links and rejects junk", () => {
    expect(normalizeReferralCode("noir_fan")).toBe("NOIR_FAN");
    expect(normalizeReferralCode("<script>")).toBeNull();
    expect(normalizeReferralCode(null)).toBeNull();
  });
});

describe("addressErrors", () => {
  const ok = { name: "Jordan Lee", line1: "123 Fulton St", line2: "", city: "Brooklyn", state: "NY", zip: "11201" };

  it("accepts a complete US address", () => {
    expect(addressErrors(ok)).toEqual({});
  });

  it("flags each bad field", () => {
    const e = addressErrors({ ...ok, state: "XX", zip: "1120", city: "" });
    expect(Object.keys(e).sort()).toEqual(["city", "state", "zip"]);
  });
});

describe("inAppBrowser", () => {
  it("recognises the social apps' browsers", () => {
    expect(inAppBrowser("Mozilla/5.0 (iPhone) Instagram 312.0")).toBe("instagram");
    expect(inAppBrowser("Mozilla/5.0 (iPhone) [FBAN/FBIOS;FBAV/450.0]")).toBe("facebook");
    expect(inAppBrowser("Mozilla/5.0 (Linux; Android 14) musical_ly_2023")).toBe("tiktok");
    expect(inAppBrowser("Mozilla/5.0 (Macintosh) Safari/605.1.15")).toBeNull();
  });
});
