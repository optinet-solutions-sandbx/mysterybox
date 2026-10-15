import { readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { LOGO_SIZE, LOGO_SRC, MARK } from "./mark";

const root = process.cwd();

describe("FLEXD mark", () => {
  it("has a gold raster at LOGO_SIZE on transparency (the chest lid uses its alpha)", async () => {
    const file = join(root, "public", LOGO_SRC);
    const meta = await sharp(file).metadata();
    expect([meta.width, meta.height]).toEqual([LOGO_SIZE.width, LOGO_SIZE.height]);
    expect(meta.hasAlpha).toBe(true);
    const { data } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(data[3]).toBe(0); // top-left pixel is transparent
  });

  it("has square app icons at 512 and 180", async () => {
    expect((await sharp(join(root, "src/app/icon.png")).metadata()).width).toBe(512);
    expect((await sharp(join(root, "src/app/icon.png")).metadata()).height).toBe(512);
    expect((await sharp(join(root, "src/app/apple-icon.png")).metadata()).width).toBe(180);
  });

  it("ships only FLEXD logo files", () => {
    expect(readdirSync(join(root, "public/brand")).filter((f) => !f.startsWith("flexd-"))).toEqual([]);
  });

  it("draws every path with a fill rule", () => {
    expect(MARK.paths.length).toBeGreaterThanOrEqual(3);
    for (const p of MARK.paths) expect(["nonzero", "evenodd"]).toContain(p.rule);
  });
});
