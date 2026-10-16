import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { BOX_ARTS } from "./box-art";

const arts = Object.entries(BOX_ARTS);

describe("the box pictures (cut from the client's screens)", () => {
  it("gives every finish its own picture", () => {
    expect(new Set(arts.map(([, a]) => a.src)).size).toBe(arts.length);
  });

  it.each(arts)("%s is on transparency at the size the site expects", async (_finish, art) => {
    const meta = await sharp(join(process.cwd(), "public", art.src)).metadata();
    expect([meta.width, meta.height]).toEqual([art.width, art.height]);
    expect(meta.hasAlpha).toBe(true);
  });

  it.each(arts)("%s has a lid seam that runs left to right inside the picture", (_finish, art) => {
    const xs = art.seam.map(([x]) => x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    for (const point of [...art.seam, art.lid, art.back]) {
      for (const v of point) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
