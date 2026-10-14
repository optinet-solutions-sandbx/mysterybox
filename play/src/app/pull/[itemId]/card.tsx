/* eslint-disable @next/next/no-img-element -- ImageResponse (Satori) only draws plain <img>. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { brand } from "@/config/brand";
import { formatUsd } from "@/domain/money";
import { bestRarity, getItem } from "@/services/catalog";

/**
 * The share card, drawn at build time: the piece on its rarity light, its value and the brand.
 * `og` is the link preview (1200×630), `story` the 9:16 image for TikTok and Instagram stories.
 * Colours are the dark-mode tokens' values, since images can't read CSS variables.
 */
const C = {
  bg: "#1c0a10",
  navy: "#3d1520",
  ivory: "#f6ecdf",
  muted: "#cbb9b0",
  gold: "#e8c27a",
  goldLight: "#f9ecd0",
  rarity: { common: "#9c8a87", uncommon: "#e9dccb", rare: "#c08a3e", epic: "#c73a52", grail: "#e8c27a" },
} as const;

const root = process.cwd();
const fonts = Promise.all([
  readFile(join(root, "assets/fonts/Cinzel-600.ttf")),
  readFile(join(root, "assets/fonts/Jost-500.ttf")),
]);

// Parallel build workers occasionally made libvips misread a file; one conversion at a time is plenty.
sharp.concurrency(1);

/**
 * Satori can't draw WebP, so the cut-outs are converted to PNG (and capped in size) here. Retries
 * once; if conversion still fails the card is drawn without the photo rather than failing the build.
 */
async function pngDataUrl(publicPath: string, maxSide: number): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const buf = await readFile(join(root, "public", publicPath));
      const png = await sharp(buf, { failOn: "error" }).resize(maxSide, maxSide, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
      return `data:image/png;base64,${png.toString("base64")}`;
    } catch (e) {
      if (attempt === 1) console.warn(`share card: could not convert ${publicPath}:`, e);
    }
  }
  return null;
}

export async function renderCard(itemId: string, format: "og" | "story") {
  const item = getItem(itemId);
  const tone = C.rarity[bestRarity(itemId) ?? "rare"];
  const [cinzel, jost] = await fonts;
  const photo = item.image ? await pngDataUrl(item.image, 900) : null;
  const logo = await pngDataUrl("/brand/grail-noir-mark.webp", 200);
  const story = format === "story";
  const size = story ? { width: 1080, height: 1920 } : { width: 1200, height: 630 };
  const aspect = item.imageAspect ?? 1;
  const box = story ? 820 : 470;
  const imgW = aspect >= 1 ? box : Math.round(box * aspect);
  const imgH = aspect >= 1 ? Math.round(box / aspect) : box;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: story ? "column" : "row",
          justifyContent: "center",
          alignItems: "center",
          background: `radial-gradient(circle at ${story ? "50% 40%" : "30% 50%"}, ${tone}66 0%, ${C.navy} 38%, ${C.bg} 75%)`,
          color: C.ivory,
          fontFamily: "Jost",
          padding: story ? "120px 80px" : "40px 70px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: story ? "100%" : 520, height: story ? 1000 : "100%" }}>
          {photo ? <img src={photo} width={imgW} height={imgH} style={{ objectFit: "contain" }} alt="" /> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: story ? "center" : "flex-start", flex: 1, marginLeft: story ? 0 : 40, textAlign: story ? "center" : "left" }}>
          <div style={{ display: "flex", fontSize: story ? 40 : 26, color: tone, letterSpacing: 2 }}>{item.brand}</div>
          <div style={{ display: "flex", fontFamily: "Cinzel", fontSize: story ? 84 : 54, lineHeight: 1.1, marginTop: 14 }}>{item.name}</div>
          <div style={{ display: "flex", fontFamily: "Cinzel", fontSize: story ? 110 : 64, color: C.goldLight, marginTop: 24 }}>{formatUsd(item.value)}</div>
          <div style={{ display: "flex", alignItems: "center", marginTop: story ? 90 : 46 }}>
            {logo ? <img src={logo} width={story ? 96 : 64} height={story ? 64 : 42} alt="" /> : null}
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 18, alignItems: "flex-start" }}>
              <div style={{ display: "flex", fontFamily: "Cinzel", fontSize: story ? 40 : 28, color: C.gold, letterSpacing: 4 }}>{brand.name}</div>
              <div style={{ display: "flex", fontSize: story ? 30 : 20, color: C.muted }}>Pulled from a box. Open yours.</div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Cinzel", data: cinzel, weight: 600, style: "normal" },
        { name: "Jost", data: jost, weight: 500, style: "normal" },
      ],
    },
  );
}
