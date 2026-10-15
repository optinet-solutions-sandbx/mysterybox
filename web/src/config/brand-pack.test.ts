import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { boxes } from "@/data/boxes";
import { items } from "@/data/items";
import { BRAND_PACKS } from "./brands.generated";
import { brandAsset, brandPack, categoryLabel, CREDIT_CATEGORY, cursorCss, MIXED_CATEGORY, productCategories, textureUrl, themeCss, type BrandPack } from "./brand-pack";

const PUBLIC = fileURLToPath(new URL("../../public", import.meta.url));

describe("brand packs", () => {
  it("default to Grail Noir", () => {
    expect(brandPack.id).toBe("grailnoir");
    expect(brandAsset(brandPack.logo.mark)).toBe("/brands/grailnoir/mark.webp");
  });

  it.each(Object.values(BRAND_PACKS) as unknown as BrandPack[])("$id: every logo file and texture exists", (pack) => {
    for (const file of [pack.logo.mark, pack.logo.lockup, pack.logo.icon, pack.logo.appleIcon].filter(Boolean)) {
      expect(existsSync(`${PUBLIC}/brands/${pack.id}/${file}`), file).toBe(true);
    }
    for (const mode of ["dark", "light"] as const) {
      const v = pack.theme[mode]["--marble-img"];
      const url = v?.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
      if (url) expect(existsSync(PUBLIC + url), url).toBe(true);
    }
  });

  it("cover every category the built-in catalogue uses", () => {
    const known = new Set([...productCategories, CREDIT_CATEGORY]);
    expect(items.filter((i) => !known.has(i.category)).map((i) => i.id)).toEqual([]);
    expect(boxes.filter((b) => b.category !== MIXED_CATEGORY && !productCategories.includes(b.category)).map((b) => b.slug)).toEqual([]);
    expect(categoryLabel("watches")).toBe("Watches");
    expect(categoryLabel("credit")).toBe("Credit");
    expect(categoryLabel("vintage-denim")).toBe("Vintage denim");
  });

  it("give boxes the pack's cursor, sharp on 2x screens, and the open one while pressed", () => {
    const css = cursorCss();
    expect(css).toContain(`[data-cursor="box"]`);
    expect(css).toContain(`url("/brands/grailnoir/cursor@2x.png") 2x`);
    expect(css).toContain(`[data-cursor="box"]:active`);
    expect(css).toContain(`cursor-open.png`);
    expect(themeCss()).toContain(css);
    expect(cursorCss({ ...brandPack, logo: { ...brandPack.logo, cursor: undefined } })).toBe("");
    expect(cursorCss({ ...brandPack, logo: { ...brandPack.logo, cursor: 'x.png");}body{color:red' } })).toBe("");
  });

  it("turn colours into CSS that can't break out of the style tag", () => {
    const css = themeCss({ ...brandPack, logo: { ...brandPack.logo, cursor: undefined }, theme: { dark: { "--bg": "#000</style><script>", "not-a-token": "x" }, light: { "--bg": "#fff" } } });
    expect(css).toBe('html:root{--bg:#000/stylescript}html[data-theme="light"]{--bg:#fff}');
    expect(themeCss()).toContain("--gold:#c2a46e");
    expect(textureUrl("light")).toBe("/textures/marble-light.webp");
  });
});
