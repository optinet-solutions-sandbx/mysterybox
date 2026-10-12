import { describe, expect, it } from "vitest";
import { formatPhoneInput, isValidEmail, isValidPassword, isValidPhone, safeNextPath, validateRegistration } from "./auth";

describe("email", () => {
  it("accepts normal addresses and rejects malformed ones", () => {
    expect(isValidEmail("jane.doe@example.com")).toBe(true);
    expect(isValidEmail(" jane@grailnoir.com ")).toBe(true);
    expect(isValidEmail("jane@")).toBe(false);
    expect(isValidEmail("jane@example")).toBe(false);
    expect(isValidEmail("jane doe@example.com")).toBe(false);
  });
});

describe("password", () => {
  it("needs 8+ characters, a letter and a number", () => {
    expect(isValidPassword("noir2026")).toBe(true);
    expect(isValidPassword("short1")).toBe(false);
    expect(isValidPassword("onlyletters")).toBe(false);
    expect(isValidPassword("12345678")).toBe(false);
  });
});

describe("phone", () => {
  it("validates North American numbers strictly", () => {
    expect(isValidPhone("+1", "(415) 555-2671")).toBe(true);
    expect(isValidPhone("+1", "415555267")).toBe(false);
    expect(isValidPhone("+1", "(115) 555-2671")).toBe(false);
  });

  it("allows 6–14 digits for other codes", () => {
    expect(isValidPhone("+63", "9171234567")).toBe(true);
    expect(isValidPhone("+44", "12345")).toBe(false);
  });

  it("formats +1 numbers progressively while typing", () => {
    expect(formatPhoneInput("+1", "415")).toBe("415");
    expect(formatPhoneInput("+1", "41555")).toBe("(415) 55");
    expect(formatPhoneInput("+1", "4155552671999")).toBe("(415) 555-2671");
    expect(formatPhoneInput("+63", "917-123")).toBe("917123");
  });
});

describe("validateRegistration", () => {
  const valid = {
    email: "jane@example.com",
    firstName: "Jane",
    lastName: "Doe",
    dial: "+1",
    phone: "(415) 555-2671",
    password: "noir2026",
    confirmedAge: true,
  };

  it("passes a complete form", () => {
    expect(validateRegistration(valid)).toEqual({});
  });

  it("reports every missing or invalid field", () => {
    const errors = validateRegistration({ ...valid, email: "x", firstName: " ", phone: "1", password: "abc", confirmedAge: false });
    expect(Object.keys(errors).sort()).toEqual(["confirmedAge", "email", "firstName", "password", "phone"]);
  });
});

describe("safeNextPath", () => {
  it("keeps same-site paths and drops everything else", () => {
    expect(safeNextPath("/boxes/time-room")).toBe("/boxes/time-room");
    expect(safeNextPath(null)).toBe("/account");
    expect(safeNextPath("https://evil.example")).toBe("/account");
    expect(safeNextPath("//evil.example", "/boxes")).toBe("/boxes");
    expect(safeNextPath("/\\evil.example")).toBe("/account");
  });
});
