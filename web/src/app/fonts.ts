import { Cinzel, Geist_Mono, Jost, Manrope, Playfair_Display, Sora, Source_Sans_3 } from "next/font/google";
import { brandPack } from "@/config/brand-pack";

/*
 * Font pairs a brand pack can choose with "fonts" in brand.json. next/font needs every face
 * declared here at build time; only the active pair is applied to the page. The inscription pair
 * (the default brand's) is preloaded; the others load on first use.
 */

// inscription: Cinzel's engraved capitals for headings and prices, Jost for text.
const inscriptionDisplay = Cinzel({ variable: "--font-display-face", subsets: ["latin"] });
const inscriptionBody = Jost({ variable: "--font-body", subsets: ["latin"], style: ["normal", "italic"] });

// editorial: a high-contrast magazine serif with a plain humanist sans.
const editorialDisplay = Playfair_Display({ variable: "--font-display-face", subsets: ["latin"], preload: false });
const editorialBody = Source_Sans_3({ variable: "--font-body", subsets: ["latin"], style: ["normal", "italic"], preload: false });

// modern: geometric sans for both, for tech or streetwear niches.
const modernDisplay = Sora({ variable: "--font-display-face", subsets: ["latin"], preload: false });
const modernBody = Manrope({ variable: "--font-body", subsets: ["latin"], preload: false });

// Only for genuinely technical strings (seed hashes).
const numeric = Geist_Mono({ variable: "--font-numeric", subsets: ["latin"], preload: false });

const pairs = {
  inscription: [inscriptionDisplay, inscriptionBody],
  editorial: [editorialDisplay, editorialBody],
  modern: [modernDisplay, modernBody],
} as const;

const [display, body] = pairs[brandPack.fonts] ?? pairs.inscription;

/** Class names that set --font-display-face, --font-body and --font-numeric on <html>. */
export const fontVariables = `${display.variable} ${body.variable} ${numeric.variable}`;
