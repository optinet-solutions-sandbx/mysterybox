import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { BOX_ART } from "./box-art";

describe("the box picture (cut from the client's first screen)", () => {
  it("is on transparency at the size the site expects", async () => {
    const meta = await sharp(join(process.cwd(), "public", BOX_ART.src)).metadata();
    expect([meta.width, meta.height]).toEqual([BOX_ART.width, BOX_ART.height]);
    expect(meta.hasAlpha).toBe(true);
  });

  it("has a lid seam that runs left to right inside the picture", () => {
    const xs = BOX_ART.seam.map(([x]) => x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    for (const point of [...BOX_ART.seam, BOX_ART.lid, BOX_ART.back]) {
      for (const v of point) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
