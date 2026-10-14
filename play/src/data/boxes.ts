import { economy } from "@/config/economy";
import { expectedValue, normalizeWeights, priceForRtp } from "@/domain/odds";
import type { Box } from "@/domain/types";
import { items } from "./items";

type Draft = Omit<Box, "id" | "price" | "entries"> & {
  /** [itemId, relative weight]; weights are normalised to economy.oddsScale. */
  odds: [string, number][];
};

const valueOf = new Map(items.map((i) => [i.id, i.value]));

/** Normalises the authored odds and prices the box at the target RTP. */
function defineBox({ odds, ...rest }: Draft): Box {
  const weights = normalizeWeights(odds.map(([, w]) => w));
  const entries = odds.map(([itemId], i) => ({ itemId, weight: weights[i] }));
  const ev = expectedValue(
    entries.map((e) => {
      const value = valueOf.get(e.itemId);
      if (value === undefined) throw new Error(`Box ${rest.slug}: unknown item ${e.itemId}`);
      return { value, weight: e.weight };
    }),
  );
  return { ...rest, id: rest.slug, price: priceForRtp(ev, economy.targetRtp), entries };
}

/** Ordered by price: the Boxes screen and the carousel walk this list. */
export const boxes: Box[] = [
  defineBox({
    slug: "vanity",
    name: "Vanity",
    tagline: "Fragrance, skincare and the Airwrap.",
    shelf: "beauty",
    material: "ivory",
    odds: [
      ["labubu", 26],
      ["chanel-rouge-coco", 24],
      ["ralph-romance", 16],
      ["tiffany-rose-gold", 11],
      ["dior-hortensia", 8],
      ["sisley-oil", 5],
      ["augustinus-bader", 3.6],
      ["la-mer", 2.4],
      ["lv-spell-on-you", 1.6],
      ["baccarat-rouge", 1.2],
      ["la-prairie-eye", 0.7],
      ["dyson-airwrap", 0.5],
    ],
  }),
  defineBox({
    slug: "first-edition",
    name: "First Edition",
    tagline: "The way in, with a Chanel Classic Flap at the very top.",
    shelf: "bags",
    material: "navy",
    odds: [
      ["labubu", 34],
      ["chanel-rouge-coco", 26],
      ["ralph-romance", 15],
      ["tiffany-rose-gold", 10],
      ["baccarat-rouge", 6],
      ["chanel-cat-eye", 4],
      ["hermes-clic-h", 2.5],
      ["lv-pochette", 1.6],
      ["offwhite-jitney", 0.6],
      ["lady-dior", 0.25],
      ["chanel-classic-flap", 0.05],
    ],
  }),
  defineBox({
    slug: "sun-club",
    name: "Sun Club",
    tagline: "Cartier and Chanel frames for the season.",
    shelf: "eyewear",
    material: "sapphire",
    odds: [
      ["la-prairie-eye", 30],
      ["chanel-cat-eye", 26],
      ["hermes-clic-h", 14],
      ["lv-shawl", 10],
      ["cartier-santos-sun", 7],
      ["dior-saddle-strap", 5],
      ["cartier-panthere-sun", 3.5],
      ["cartier-clash-sun", 2.5],
      ["cartier-panthere-cateye", 1.5],
      ["cartier-love-small", 0.5],
    ],
  }),
  defineBox({
    slug: "atelier",
    name: "The Atelier",
    tagline: "Loewe, Celine, Bottega Veneta and Dior.",
    shelf: "bags",
    material: "obsidian",
    odds: [
      ["offwhite-jitney", 38],
      ["lv-pochette", 22],
      ["miumiu-arcadie", 10],
      ["loewe-squeeze", 8],
      ["celine-triomphe", 6],
      ["loewe-puzzle", 5],
      ["dior-book-tote", 4],
      ["prada-galleria", 3],
      ["bv-jodie", 2],
      ["bv-sardine", 1],
      ["bv-andiamo", 0.7],
      ["lady-dior", 0.3],
    ],
  }),
  defineBox({
    slug: "flap-room",
    name: "The Flap Room",
    tagline: "From the Wallet on Chain to the Classic Flap.",
    shelf: "bags",
    material: "navy",
    odds: [
      ["chanel-cat-eye", 30],
      ["chanel-woc", 26],
      ["chanel-boy-woc", 20],
      ["chanel-22-small", 14],
      ["chanel-classic-flap", 10],
    ],
  }),
  defineBox({
    slug: "jewel-vault",
    name: "Jewel Vault",
    tagline: "Love, Juste un Clou, HardWear and Kelly.",
    shelf: "jewelry",
    material: "plum",
    odds: [
      ["hermes-clic-h", 42],
      ["cartier-love-small", 20],
      ["tiffany-lock", 11],
      ["cartier-love", 10],
      ["cartier-clou", 7],
      ["tiffany-hardwear", 6],
      ["hermes-kelly-bracelet", 4],
    ],
  }),
  defineBox({
    slug: "time-room",
    name: "The Time Room",
    tagline: "Rolex and Cartier.",
    shelf: "watches",
    material: "obsidian",
    odds: [
      ["cartier-panthere-watch", 40],
      ["rolex-op-31", 28],
      ["rolex-datejust-36", 17],
      ["rolex-lady-datejust-28", 10],
      ["rolex-datejust-31", 5],
    ],
  }),
  defineBox({
    slug: "grail-reserve",
    name: "Grail Reserve",
    tagline: "Birkin, Kelly and Constance. This week only.",
    shelf: "bags",
    material: "gold",
    drop: true,
    odds: [
      ["hermes-picotin-18", 32],
      ["lady-dior", 22],
      ["chanel-classic-flap", 16],
      ["hermes-mini-lindy", 12],
      ["rolex-datejust-31", 9],
      ["hermes-constance-18", 6],
      ["hermes-birkin-25", 2.4],
      ["hermes-kelly-28", 0.6],
    ],
  }),
];
