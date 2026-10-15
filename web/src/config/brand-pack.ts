import { BRAND_PACKS } from "./brands.generated";

/**
 * The active brand pack: public/brands/<id>/brand.json, chosen by NEXT_PUBLIC_BRAND (default
 * grailnoir). Everything brand- or niche-specific comes from here: names and copy, logo and icon
 * files, colours for both modes, the font pair and the product categories. To start a new brand:
 * `npm run brand:new -- <id> "Name"` (docs/11-white-label.md).
 */

export interface BrandCategory {
  id: string;
  label: string;
  /** Line drawing used when a product has no photo (components/item/item-drawings). */
  drawing?: string;
  /** Shown in the landing hero's category showcase. */
  showcase?: boolean;
}

export interface BrandPack {
  id: string;
  name: string;
  domain: string;
  tagline: string;
  taglineLines: readonly string[];
  descriptor: string;
  sideline?: string;
  description: string;
  legalEntity: string;
  supportEmail: string;
  minimumAge: number;
  market?: string;
  /** Font pair (src/app/fonts.ts): inscription = Cinzel + Jost, editorial = Playfair Display + Source Sans 3, modern = Sora + Manrope. */
  fonts: "inscription" | "editorial" | "modern";
  logo: {
    mark: string;
    markWidth: number;
    markHeight: number;
    lockup?: string;
    lockupWidth?: number;
    lockupHeight?: number;
    icon: string;
    appleIcon: string;
    /** Optional one-colour outline of the mark (SVG path) for ink on light finishes. */
    silhouette?: { viewBox: string; path: string };
    /** Optional cursor over boxes, and while pressed: 32 px PNGs, each with an "@2x" 64 px twin. */
    cursor?: string;
    cursorOpen?: string;
  };
  categories: readonly BrandCategory[];
  themeColor: { dark: string; light: string };
  theme: { dark: Record<string, string>; light: Record<string, string> };
}

const requested = process.env.NEXT_PUBLIC_BRAND || "grailnoir";
const packs = BRAND_PACKS as unknown as Record<string, BrandPack>;

export const brandPack: BrandPack = packs[requested] ?? packs.grailnoir;

/** A file in the active pack's folder, as a URL. */
export const brandAsset = (file: string) => `/brands/${brandPack.id}/${file}`;

/** Credit is always a category (site credit outcomes); "mixed" is for boxes spanning categories. */
export const CREDIT_CATEGORY = "credit";
export const MIXED_CATEGORY = "mixed";

const labels: Record<string, string> = Object.fromEntries([
  ...brandPack.categories.map((c) => [c.id, c.label]),
  [CREDIT_CATEGORY, "Credit"],
  [MIXED_CATEGORY, "Mixed"],
]);

export function categoryLabel(id: string): string {
  return labels[id] ?? id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, " ");
}

/** Product categories of this niche (no credit, no mixed), in the pack's order. */
export const productCategories: string[] = brandPack.categories.map((c) => c.id);

/** The pack's colours as CSS: dark is the default (:root), light applies with [data-theme="light"]. */
export function themeCss(pack: BrandPack = brandPack): string {
  const decls = (tokens: Record<string, string>) =>
    Object.entries(tokens)
      .filter(([k]) => /^--[\w-]+$/.test(k))
      .map(([k, v]) => `${k}:${String(v).replace(/[<>{}]/g, "")}`)
      .join(";");
  // `html` raises specificity above globals.css, whose values are the fallbacks.
  return `html:root{${decls(pack.theme.dark)}}html[data-theme="light"]{${decls(pack.theme.light)}}${cursorCss(pack)}`;
}

/**
 * The pack's cursor over boxes (`data-cursor="box"`), the open one while pressed; fine pointers
 * only. 1x and 2x images so it stays sharp on high-density and scaled displays; the plain url() is
 * the fallback for browsers without image-set() in cursors. No cursor files: the native pointer.
 */
export function cursorCss(pack: BrandPack = brandPack): string {
  const safe = (f?: string) => (f && /^[\w.-]+\.png$/.test(f) ? f : null);
  const cursor = safe(pack.logo.cursor);
  if (!cursor) return "";
  const url = (f: string) => `url("/brands/${pack.id}/${f}")`;
  const decl = (f: string) => {
    const set = `${url(f)} 1x,${url(f.replace(/\.png$/, "@2x.png"))} 2x`;
    return `cursor:${url(f)} 16 16,pointer;cursor:-webkit-image-set(${set}) 16 16,pointer;cursor:image-set(${set}) 16 16,pointer`;
  };
  const on = (state: string) => `[data-cursor="box"]${state},[data-cursor="box"]${state} *`;
  const open = safe(pack.logo.cursorOpen);
  return `@media (pointer:fine){${on("")}{${decl(cursor)}}${open ? `${on(":active")}{${decl(open)}}` : ""}}`;
}

/** The marble (or other) texture URL for a mode, read from the pack's --marble-img token. */
export function textureUrl(mode: "dark" | "light"): string | null {
  const v = (mode === "light" ? brandPack.theme.light["--marble-img"] : undefined) ?? brandPack.theme.dark["--marble-img"];
  const m = v?.match(/url\(["']?([^"')]+)["']?\)/);
  return m ? m[1] : null;
}
