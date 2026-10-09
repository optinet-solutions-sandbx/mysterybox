import { economy } from "@/config/economy";
import { expectedValue, normalizeWeights, priceForRtp } from "@/domain/odds";
import type { Box } from "@/domain/types";
import { items } from "./items";

type Draft = Omit<Box, "id" | "price" | "entries"> & {
  /** [itemId, relative weight] — weights are normalised to economy.oddsScale. */
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

export const boxes: Box[] = [
  defineBox({
    slug: "first-edition",
    name: "The First Edition",
    tagline: "The entry box, with a Chanel Classic Flap at the very top.",
    category: "mixed",
    material: "obsidian",
    badge: "new",
    featured: true,
    odds: [
      ["credit-2", 48],
      ["credit-5", 26],
      ["credit-10", 12],
      ["labubu", 5],
      ["chanel-rouge-coco", 4],
      ["ralph-romance", 2],
      ["tiffany-rose-gold", 1.5],
      ["baccarat-rouge", 0.8],
      ["chanel-cat-eye", 0.5],
      ["lv-pochette", 0.15],
      ["lady-dior", 0.03],
      ["chanel-classic-flap", 0.01],
    ],
  }),
  defineBox({
    slug: "beauty-cabinet",
    name: "Beauty Cabinet",
    tagline: "Fragrance, skincare and the Airwrap.",
    category: "beauty",
    material: "ivory",
    featured: true,
    odds: [
      ["credit-5", 25],
      ["credit-10", 20],
      ["chanel-rouge-coco", 18],
      ["ralph-romance", 10],
      ["tiffany-rose-gold", 8],
      ["dior-hortensia", 6],
      ["sisley-oil", 4.5],
      ["augustinus-bader", 3.5],
      ["la-mer", 2.5],
      ["lv-spell-on-you", 1.5],
      ["baccarat-rouge", 1],
      ["la-prairie-eye", 0.6],
      ["dyson-airwrap", 0.4],
    ],
  }),
  defineBox({
    slug: "sun-club",
    name: "Sun Club",
    tagline: "Cartier and Chanel frames for the season.",
    category: "eyewear",
    material: "sapphire",
    odds: [
      ["credit-10", 45],
      ["credit-25", 25],
      ["chanel-cat-eye", 15],
      ["cartier-santos-sun", 5],
      ["cartier-panthere-sun", 4],
      ["cartier-clash-sun", 3],
      ["cartier-panthere-cateye", 2.5],
      ["hermes-clic-h", 0.5],
    ],
  }),
  defineBox({
    slug: "atelier",
    name: "The Atelier",
    tagline: "Contemporary icons from Loewe, Celine, Bottega Veneta and Dior.",
    category: "bags",
    material: "navy",
    badge: "hot",
    featured: true,
    odds: [
      ["credit-25", 30],
      ["offwhite-jitney", 18],
      ["lv-pochette", 14],
      ["miumiu-arcadie", 9],
      ["loewe-squeeze", 7],
      ["celine-triomphe", 6],
      ["loewe-puzzle", 5],
      ["dior-book-tote", 4],
      ["prada-galleria", 3],
      ["bv-jodie", 2],
      ["bv-sardine", 1.2],
      ["bv-andiamo", 0.8],
      ["lady-dior", 0.5],
    ],
  }),
  defineBox({
    slug: "flap-room",
    name: "The Flap Room",
    tagline: "From the Wallet on Chain to the Classic Flap.",
    category: "bags",
    material: "obsidian",
    featured: true,
    odds: [
      ["credit-50", 30],
      ["chanel-rouge-coco", 20],
      ["chanel-cat-eye", 20],
      ["chanel-woc", 12],
      ["chanel-boy-woc", 9],
      ["chanel-22-small", 6],
      ["chanel-classic-flap", 3],
    ],
  }),
  defineBox({
    slug: "jewel-vault",
    name: "The Jewel Vault",
    tagline: "Love, Juste un Clou, HardWear and Kelly.",
    category: "jewelry",
    material: "sapphire",
    featured: true,
    odds: [
      ["credit-50", 25],
      ["hermes-clic-h", 30],
      ["cartier-love-small", 14],
      ["tiffany-lock", 9],
      ["cartier-love", 8],
      ["cartier-clou", 6],
      ["tiffany-hardwear", 5],
      ["hermes-kelly-bracelet", 3],
    ],
  }),
  defineBox({
    slug: "time-room",
    name: "The Time Room",
    tagline: "Rolex and Cartier, authenticated.",
    category: "watches",
    material: "obsidian",
    odds: [
      ["credit-100", 40],
      ["cartier-panthere-watch", 22],
      ["rolex-op-31", 18],
      ["rolex-datejust-36", 11],
      ["rolex-lady-datejust-28", 6],
      ["rolex-datejust-31", 3],
    ],
  }),
  defineBox({
    slug: "grail-reserve",
    name: "Grail Reserve",
    tagline: "The top shelf: Birkin, Kelly and Constance.",
    category: "mixed",
    material: "gold",
    badge: "limited",
    featured: true,
    odds: [
      ["hermes-picotin-18", 30],
      ["lady-dior", 20],
      ["chanel-classic-flap", 15],
      ["hermes-mini-lindy", 12],
      ["rolex-datejust-31", 10],
      ["hermes-constance-18", 7],
      ["hermes-birkin-25", 4],
      ["hermes-kelly-28", 2],
    ],
  }),
];
