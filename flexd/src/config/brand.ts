/**
 * Brand settings. The palette, type and mark are Grail Noir's for now (2026-10-14: "use grail noir
 * for now"); this site is expected to get its own brand later, so every user-facing brand string
 * comes from here.
 */
export const brand = {
  name: "Grail Noir",
  domain: "grailnoir.com",
  tagline: "Life is too short. Go Noir.",
  /** Line printed on the side of the box. */
  sideline: "Mystery beyond the ordinary",
  description:
    "Pick a box, open it, then keep the piece or sell it back. Bags, watches, jewelry and beauty from the houses you know.",
  legalEntity: "Grail Noir [legal entity TBD]",
  supportEmail: "support@grailnoir.com",
  minimumAge: 18,
  market: "United States",
} as const;
