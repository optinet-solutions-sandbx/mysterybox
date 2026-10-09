/**
 * Brand settings. Name: Grail Noir (grailnoir.com). Mark: crown-and-mask (components/brand/logo-mark).
 * Palette and voice come from the "Royal Blue Luxury" board. Every user-facing brand string
 * must come from here.
 */
export const brand = {
  name: "Grail Noir",
  domain: "grailnoir.com",
  tagline: "Life is too short. Go Noir.",
  /** The slogan as a two-tier lockup: setup, then punchline. */
  taglineLines: ["Life is too short.", "Go Noir."],
  descriptor: "A bolder kind of luxury.",
  /** Line printed on the side of the box (from the board). */
  sideline: "Mystery beyond the ordinary",
  description:
    "Authenticated bags, watches, jewelry and beauty. Open a box online, then have the piece shipped to you or sell it back for credit.",
  legalEntity: "Grail Noir [legal entity TBD]",
  supportEmail: "support@grailnoir.com",
  minimumAge: 18,
  market: "United States",
} as const;
