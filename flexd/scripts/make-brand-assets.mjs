// Draws the FLEXD placeholder mark (src/config/mark.json) to the files the site serves:
// public/brand/flexd-mark.webp (gold on transparency, 720x480; also the chest lid's inlay mask)
// and src/app/icon.png (512) / src/app/apple-icon.png (180), gold on the ground colour.
// Run from flexd/: npm run brand:assets
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const at = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const mark = JSON.parse(await readFile(at("src/config/mark.json"), "utf8"));
const SHEEN = [["0", "#8C6A2E"], ["0.3", "#E6CF9A"], ["0.5", "#B08A45"], ["0.7", "#F0DDAE"], ["1", "#9C7838"]];
const GROUND = "#0A0510";

function svg(width, height, background) {
  const { width: vw, height: vh } = mark.viewBox;
  const room = background ? 0.8 : 1;
  const scale = Math.min((width * room) / vw, (height * room) / vh);
  const tx = (width - vw * scale) / 2;
  const ty = (height - vh * scale) / 2;
  const stops = SHEEN.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("");
  const paths = mark.paths.map((p) => `<path d="${p.d}" fill-rule="${p.rule}" fill="url(#sheen)"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs><linearGradient id="sheen" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${vw}" y2="${vh}">${stops}</linearGradient></defs>
${background ? `<rect width="100%" height="100%" fill="${background}"/>` : ""}
<g transform="translate(${tx} ${ty}) scale(${scale})">${paths}</g></svg>`;
}

await sharp(Buffer.from(svg(720, 480))).webp({ quality: 92, alphaQuality: 100 }).toFile(at("public/brand/flexd-mark.webp"));
await sharp(Buffer.from(svg(512, 512, GROUND))).png().toFile(at("src/app/icon.png"));
await sharp(Buffer.from(svg(180, 180, GROUND))).png().toFile(at("src/app/apple-icon.png"));
console.log("wrote public/brand/flexd-mark.webp, src/app/icon.png, src/app/apple-icon.png");
