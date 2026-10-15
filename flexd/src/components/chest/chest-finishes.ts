import * as THREE from "three";
import type { BoxMaterial } from "@/domain/types";

/**
 * FLEXD box finishes: matte velvet in the purple family and brushed gold for the top box. The client
 * asked for less shine, so no finish has a clear coat or iridescence and velvet stays rough; the
 * crown, piping and lock plate stay metallic gold. Keys are the catalogue's material names.
 */
export interface Finish {
  body: () => THREE.MeshPhysicalMaterialParameters;
  /** Crown colour and metalness on the lid. */
  crown: { color: number; metalness: number; roughness: number };
  /** A fine nap: the leather texture as a light bump map. */
  nap?: { repeat: number; scale: number };
}

const CROWN = { color: 0xe6cf9a, metalness: 1, roughness: 0.28 };
const NAP = { repeat: 6, scale: 0.12 };

function velvet(color: number, sheenColor: number) {
  return (): THREE.MeshPhysicalMaterialParameters => ({
    color,
    metalness: 0,
    roughness: 0.92,
    // A low sheen: at full strength the studio light turned the velvet into glowing violet.
    sheen: 0.45,
    sheenColor: new THREE.Color(sheenColor),
    sheenRoughness: 0.6,
  });
}

// Base colours sit darker than the palette because the studio light and tone mapping lift them;
// on screen they land near the sheet's velvet-100, -300, -500 and -900.
export const FINISHES: Record<BoxMaterial, Finish> = {
  /** Lilac velvet (Vanity). */
  ivory: { body: velvet(0x8f7aa8, 0xc9b6e0), crown: CROWN, nap: NAP },
  /** Royal velvet (First Edition, The Flap Room). */
  navy: { body: velvet(0x33105a, 0x5e3a8c), crown: CROWN, nap: NAP },
  /** Amethyst velvet (Sun Club). */
  sapphire: { body: velvet(0x5c3590, 0x9a7ac6), crown: CROWN, nap: NAP },
  /** Black velvet with a purple cast (The Atelier, The Time Room). */
  obsidian: { body: velvet(0x0e0814, 0x30223f), crown: CROWN, nap: NAP },
  /** Plum velvet, red-purple (Jewel Vault). */
  bronze: { body: velvet(0x2e0a2c, 0x5c2a55), crown: CROWN, nap: NAP },
  /** Brushed gold, satin rather than mirror (Grail Reserve); the crown is polished for contrast. */
  gold: {
    body: () => ({ color: 0xc9a75e, metalness: 1, roughness: 0.5 }),
    crown: { color: 0xf0ddae, metalness: 1, roughness: 0.2 },
  },
};

/** Lining, lid underside and scene light in the FLEXD palette. */
export const INTERIOR = {
  lining: 0x2a0b45,
  liningSheen: 0x7a4bb5,
  lid: 0x1e0833,
  lidSheen: 0x5b1e92,
  rimLight: 0x7a52b0,
  rimIntensity: 1.2,
  fillGround: 0x0a0510,
} as const;
