import { brandPack } from "./brand-pack";

/**
 * Brand strings for the active brand pack (public/brands/<id>/brand.json, see config/brand-pack).
 * Every user-facing brand string must come from here; edit the pack, not this file.
 */
export const brand = {
  name: brandPack.name,
  domain: brandPack.domain,
  tagline: brandPack.tagline,
  /** The slogan as a two-tier lockup: setup, then punchline. */
  taglineLines: brandPack.taglineLines,
  descriptor: brandPack.descriptor,
  /** Line printed on the side of the box. */
  sideline: brandPack.sideline ?? "",
  description: brandPack.description,
  legalEntity: brandPack.legalEntity,
  supportEmail: brandPack.supportEmail,
  minimumAge: brandPack.minimumAge,
  market: brandPack.market ?? "",
} as const;
