import { LOGO_FILE } from "./mark-file";
import mark from "./mark.json";

/**
 * FLEXD mark: the client's crown-and-mask artwork (2026-10-15). The lilac-chrome raster in public/brand
 * (scripts/make-brand-assets.mjs) is the logo and, through its alpha, the chest lid's inlay; these
 * paths are its traced outline, for the solid (ink) tone.
 */
export const MARK = mark as {
  viewBox: { width: number; height: number };
  paths: { d: string; rule: "nonzero" | "evenodd" }[];
};

export const LOGO_SRC = `/brand/${LOGO_FILE}`;
export const LOGO_SIZE = { width: 720, height: 480 } as const;
export const LOGO_ASPECT = LOGO_SIZE.width / LOGO_SIZE.height;
