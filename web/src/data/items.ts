import { referenceImage } from "@/config/media";
import { imageAspect } from "./image-meta";
import type { Item } from "@/domain/types";

/**
 * Mock catalog. Values are approximate US retail/resale figures in cents, for demo only.
 * The real assortment is not decided; replace this file (or the service behind it) wholesale.
 */
const catalog: Item[] = [
  // Site credit — the low-value floor that keeps cheaper boxes viable.
  { id: "credit-2", name: "$2 Site Credit", brand: "Credit", category: "credit", value: 200 },
  { id: "credit-5", name: "$5 Site Credit", brand: "Credit", category: "credit", value: 500 },
  { id: "credit-10", name: "$10 Site Credit", brand: "Credit", category: "credit", value: 1_000 },
  { id: "credit-25", name: "$25 Site Credit", brand: "Credit", category: "credit", value: 2_500 },
  { id: "credit-50", name: "$50 Site Credit", brand: "Credit", category: "credit", value: 5_000 },
  { id: "credit-100", name: "$100 Site Credit", brand: "Credit", category: "credit", value: 10_000 },

  // Beauty & fragrance
  { id: "chanel-rouge-coco", name: "Rouge Coco Lipstick", brand: "Chanel", category: "beauty", value: 5_000, art: "perfume" },
  { id: "ralph-romance", name: "Romance Eau de Parfum", brand: "Ralph Lauren", category: "beauty", value: 14_000, art: "perfume" },
  { id: "tiffany-rose-gold", name: "Rose Gold Eau de Parfum", brand: "Tiffany & Co.", category: "beauty", value: 16_000, art: "perfume" },
  { id: "dior-hortensia", name: "Hortensia Candle", brand: "Dior", category: "beauty", value: 17_500, art: "perfume" },
  { id: "sisley-oil", name: "Black Rose Precious Face Oil", brand: "Sisley", category: "beauty", value: 26_500, art: "perfume" },
  { id: "augustinus-bader", name: "The Rich Cream 50ml", brand: "Augustinus Bader", category: "beauty", value: 31_500, art: "perfume" },
  { id: "la-mer", name: "Crème de la Mer 60ml", brand: "La Mer", category: "beauty", value: 41_000, art: "perfume" },
  { id: "lv-spell-on-you", name: "Spell On You Eau de Parfum", brand: "Louis Vuitton", category: "beauty", value: 43_000, art: "perfume" },
  { id: "baccarat-rouge", name: "Baccarat Rouge 540 Extrait", brand: "Maison Francis Kurkdjian", category: "beauty", value: 49_500, art: "perfume" },
  { id: "la-prairie-eye", name: "Skin Caviar Eye Set", brand: "La Prairie", category: "beauty", value: 56_000, art: "perfume" },
  { id: "dyson-airwrap", name: "Airwrap Multi-Styler", brand: "Dyson", category: "beauty", value: 60_000, art: "perfume" },

  // Eyewear
  { id: "chanel-cat-eye", name: "Cat-Eye Sunglasses", brand: "Chanel", category: "eyewear", value: 56_000, art: "sunglasses" },
  { id: "cartier-santos-sun", name: "Santos de Cartier Sunglasses", brand: "Cartier", category: "eyewear", value: 115_000, art: "sunglasses" },
  { id: "cartier-panthere-sun", name: "Panthère de Cartier Sunglasses", brand: "Cartier", category: "eyewear", value: 128_000, art: "sunglasses" },
  { id: "cartier-clash-sun", name: "Clash de Cartier Sunglasses", brand: "Cartier", category: "eyewear", value: 132_000, art: "sunglasses" },
  { id: "cartier-panthere-cateye", name: "Panthère Cat-Eye Sunglasses", brand: "Cartier", category: "eyewear", value: 139_000, art: "sunglasses" },

  // Accessories
  { id: "labubu", name: "The Monsters Macarons Figure", brand: "Pop Mart", category: "accessories", value: 4_500, art: "card" },
  { id: "lv-shawl", name: "Monogram Denim Shawl", brand: "Louis Vuitton", category: "accessories", value: 87_000, art: "scarf" },
  { id: "dior-saddle-strap", name: "Saddle Bag Strap, Oblique", brand: "Dior", category: "accessories", value: 125_000, art: "belt" },

  // Bags
  { id: "offwhite-jitney", name: "Jitney 0.5 Micro", brand: "Off-White", category: "bags", value: 95_000, art: "bag-pouch" },
  { id: "lv-pochette", name: "Pochette Accessoires", brand: "Louis Vuitton", category: "bags", value: 113_000, art: "bag-pouch" },
  { id: "miumiu-arcadie", name: "Arcadie Matelassé", brand: "Miu Miu", category: "bags", value: 310_000, art: "bag-flap" },
  { id: "loewe-squeeze", name: "Squeeze Small", brand: "Loewe", category: "bags", value: 320_000, art: "bag-pouch" },
  { id: "loewe-puzzle", name: "Puzzle Edge Small", brand: "Loewe", category: "bags", value: 365_000, art: "bag-top" },
  { id: "celine-triomphe", name: "Teen Triomphe", brand: "Celine", category: "bags", value: 370_000, art: "bag-flap" },
  { id: "dior-book-tote", name: "Book Tote Medium, Oblique", brand: "Dior", category: "bags", value: 390_000, art: "bag-tote" },
  { id: "chanel-woc", name: "Classic Wallet on Chain", brand: "Chanel", category: "bags", value: 410_000, art: "bag-flap" },
  { id: "bv-jodie", name: "Small Jodie", brand: "Bottega Veneta", category: "bags", value: 410_000, art: "bag-pouch" },
  { id: "chanel-boy-woc", name: "Boy Wallet on Chain", brand: "Chanel", category: "bags", value: 430_000, art: "bag-flap" },
  { id: "prada-galleria", name: "Galleria Medium", brand: "Prada", category: "bags", value: 460_000, art: "bag-top" },
  { id: "bv-sardine", name: "Sardine with Chain", brand: "Bottega Veneta", category: "bags", value: 490_000, art: "bag-pouch" },
  { id: "hermes-picotin-18", name: "Picotin Lock 18", brand: "Hermès", category: "bags", value: 490_000, art: "bag-tote" },
  { id: "bv-andiamo", name: "Small Andiamo", brand: "Bottega Veneta", category: "bags", value: 530_000, art: "bag-top" },
  { id: "chanel-22-small", name: "Chanel 22 Small", brand: "Chanel", category: "bags", value: 680_000, art: "bag-tote" },
  { id: "lady-dior", name: "Lady Dior Medium", brand: "Dior", category: "bags", value: 680_000, art: "bag-top" },
  { id: "hermes-mini-lindy", name: "Mini Lindy, Étoupe Swift", brand: "Hermès", category: "bags", value: 1_100_000, art: "bag-pouch" },
  { id: "chanel-classic-flap", name: "Classic Flap Bag, Medium", brand: "Chanel", category: "bags", value: 1_170_000, art: "bag-flap" },
  { id: "hermes-constance-18", name: "Constance 18, Étoupe Epsom", brand: "Hermès", category: "bags", value: 1_650_000, art: "bag-flap" },
  { id: "hermes-birkin-25", name: "Birkin 25", brand: "Hermès", category: "bags", value: 3_200_000, art: "bag-top" },
  { id: "hermes-kelly-28", name: "Kelly 28 Sellier", brand: "Hermès", category: "bags", value: 3_450_000, art: "bag-top" },

  // Jewelry
  { id: "hermes-clic-h", name: "Clic H Bracelet", brand: "Hermès", category: "jewelry", value: 79_000, art: "bracelet" },
  { id: "cartier-love-small", name: "Love Bracelet, Small Model", brand: "Cartier", category: "jewelry", value: 455_000, art: "bracelet" },
  { id: "cartier-love", name: "Love Bracelet, Yellow Gold", brand: "Cartier", category: "jewelry", value: 760_000, art: "bracelet" },
  { id: "tiffany-lock", name: "Tiffany Lock Bangle", brand: "Tiffany & Co.", category: "jewelry", value: 780_000, art: "bracelet" },
  { id: "cartier-clou", name: "Juste un Clou Bracelet", brand: "Cartier", category: "jewelry", value: 860_000, art: "bracelet" },
  { id: "tiffany-hardwear", name: "HardWear Small Link Bracelet", brand: "Tiffany & Co.", category: "jewelry", value: 890_000, art: "bracelet" },
  { id: "hermes-kelly-bracelet", name: "Kelly Bracelet PM, Diamonds", brand: "Hermès", category: "jewelry", value: 985_000, art: "bracelet" },

  // Watches
  { id: "cartier-panthere-watch", name: "Panthère de Cartier, Small", brand: "Cartier", category: "watches", value: 525_000, art: "watch" },
  { id: "rolex-op-31", name: "Oyster Perpetual 31", brand: "Rolex", category: "watches", value: 645_000, art: "watch" },
  { id: "rolex-datejust-36", name: "Datejust 36", brand: "Rolex", category: "watches", value: 1_050_000, art: "watch" },
  { id: "rolex-lady-datejust-28", name: "Lady-Datejust 28, Rolesor", brand: "Rolex", category: "watches", value: 1_330_000, art: "watch" },
  { id: "rolex-datejust-31", name: "Datejust 31, Everose Rolesor", brand: "Rolex", category: "watches", value: 1_560_000, art: "watch" },
];

export const items: Item[] = catalog.map((item) =>
  item.category === "credit" ? item : { ...item, image: referenceImage(item.id), imageAspect: imageAspect[item.id] },
);
