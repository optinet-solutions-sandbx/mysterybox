/**
 * Brand settings. Palette and voice come from the "Royal Blue Luxury" board (2026-10-09).
 * The trading name is still open; every user-facing brand string must come from here so a
 * rename is a one-file change.
 */
export const brand = {
  /** Placeholder until the name is chosen. */
  name: "BRAND",
  /** Monogram shown on the box, header and favicon (from the board). */
  monogram: "M",
  tagline: "More than a box.",
  descriptor: "A bolder kind of luxury.",
  /** Line printed on the side of the box (from the board). */
  sideline: "Mystery beyond the ordinary",
  description:
    "Authenticated bags, watches, jewelry and beauty. Open a box online, then have the piece shipped to you or sell it back for credit.",
  legalEntity: "[Legal entity TBD]",
  supportEmail: "support@example.com",
  minimumAge: 18,
  market: "United States",
} as const;
