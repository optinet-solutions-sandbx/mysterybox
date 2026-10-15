import mark from "./mark.json";

/**
 * FLEXD mark, a placeholder until the client supplies a logo: a crown above a masquerade mask,
 * drawn after the reference PDF. The same paths give the solid (ink) tone, the gold raster in
 * public/brand (scripts/make-brand-assets.mjs) and, through that raster's alpha, the chest lid's inlay.
 */
export const MARK = mark as {
  viewBox: { width: number; height: number };
  paths: { d: string; rule: "nonzero" | "evenodd" }[];
};

export const LOGO_SRC = "/brand/flexd-mark.webp";
export const LOGO_SIZE = { width: 720, height: 480 } as const;
export const LOGO_ASPECT = LOGO_SIZE.width / LOGO_SIZE.height;
