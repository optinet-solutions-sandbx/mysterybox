/**
 * Brand settings for FLEXD (2026-10-15). The name comes from the client's screens; domain, support
 * email and legal entity are placeholders until the client confirms them. There is no slogan.
 * Every user-facing brand string comes from here.
 */
export const brand = {
  name: "FLEXD",
  domain: "flexd.example",
  description:
    "Pick a box, open it, then keep the piece or sell it back. Bags, watches, jewelry and beauty from the houses you know.",
  legalEntity: "FLEXD [legal entity TBD]",
  supportEmail: "support@flexd.example",
  minimumAge: 18,
  market: "United States",
  /** Printed on the box's side, one per line (the client's screens). */
  boxSideLines: ["Bags", "Watches", "Jewelry", "Beauty"],
} as const;
