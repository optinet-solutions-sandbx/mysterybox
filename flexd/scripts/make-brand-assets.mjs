// Builds the FLEXD logo files from the client's crown-and-mask artwork (gold on transparency):
// public/brand/flexd-mark.webp (720x480; also the chest lid's inlay mask, through its alpha)
// and src/app/icon.png (512) / src/app/apple-icon.png (180), the mark on the ground colour.
// Run from flexd/: npm run brand:assets -- <artwork.png|webp>
// Without a file it keeps the current flexd-mark.webp and redraws the icons from it.
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const at = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const MARK = at("public/brand/flexd-mark.webp");
const SIZE = { width: 720, height: 480 };
const GROUND = "#0A0510";
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

const artwork = process.argv[2];
if (artwork) {
  const trimmed = await sharp(artwork).ensureAlpha().trim({ threshold: 8 }).toBuffer();
  await sharp(trimmed)
    .resize({ ...SIZE, fit: "contain", background: CLEAR })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(MARK);
}

async function icon(size, file) {
  const room = Math.round(size * 0.84);
  const mark = await sharp(MARK).resize({ width: room, height: room, fit: "inside" }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: GROUND } })
    .composite([{ input: mark, gravity: "center" }])
    .png({ palette: true, quality: 95, effort: 10 }) // the tab icon loads on every page
    .toFile(at(file));
}

await icon(512, "src/app/icon.png");
await icon(180, "src/app/apple-icon.png");
console.log(`${artwork ? "wrote public/brand/flexd-mark.webp, " : ""}src/app/icon.png, src/app/apple-icon.png`);
