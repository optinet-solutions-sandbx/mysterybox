import type { BoxMaterial } from "@/domain/types";

/**
 * FLEXD box finishes (2026-10-15, after the client's screens): holographic foil, a different tint per
 * box. Each is a metal whose colour map is the foil (a base sheen with a few rainbow streaks) plus a
 * touch of thin-film iridescence; set a notch rougher than the screens because the client asked for a
 * little less shine. Keys are the catalogue's material names.
 */
export interface Finish {
  /** The foil's base sheen, light then shade (CSS colours), laid diagonally. */
  base: [string, string];
  /** Rainbow streaks across the foil (CSS colours). */
  streaks: string[];
  metalness: number;
  roughness: number;
  iridescence: number;
  /** Lid crown and side print: dark ink on light foils, lilac chrome on the black one. */
  ink: { color: number; metalness: number; roughness: number };
}

const INK = { color: 0x1e1029, metalness: 0.5, roughness: 0.4 };
const CHROME_INK = { color: 0xb48ae8, metalness: 1, roughness: 0.28 };
const FOIL = { metalness: 0.92, roughness: 0.2, iridescence: 0.25 };

export const FINISHES: Record<BoxMaterial, Finish> = {
  /** Pearl hologram (Vanity). */
  ivory: { base: ["#fbf6f0", "#bdb1a8"], streaks: ["#e8cfff", "#cfe0ff", "#ffd3e6", "#ffe6c4"], ...FOIL, ink: INK },
  /** Lilac hologram (Sun Club). */
  sapphire: { base: ["#efe5fd", "#9d86c9"], streaks: ["#b88cff", "#9fbfff", "#f0a8e0"], ...FOIL, ink: INK },
  /** Silver hologram (The Atelier, The Time Room), the box in the client's first screen. */
  obsidian: { base: ["#f8f8fc", "#a3a2b2"], streaks: ["#c3a2ff", "#9cc2ff", "#ffb6e1", "#d4c0ff"], ...FOIL, ink: INK },
  /** Black hologram (First Edition, The Flap Room): dark foil with a rainbow sheen. */
  navy: { base: ["#3c3846", "#121016"], streaks: ["#7a4fd0", "#3f78c8", "#c0569a", "#6a5ad8"], ...FOIL, roughness: 0.3, ink: CHROME_INK },
  /** Rose hologram (Jewel Vault). */
  bronze: { base: ["#fce8ee", "#c093a1"], streaks: ["#ffb3d1", "#d8b8ff", "#ffcfb0"], ...FOIL, ink: INK },
  /** Gold hologram (Grail Reserve). */
  gold: { base: ["#f7e4b8", "#ad8644"], streaks: ["#ffd9a0", "#e6c2ff", "#c9f0d4", "#ffc7a8"], ...FOIL, ink: INK },
};

/** The champagne-gold clasp on the front, satin rather than mirror. */
export const CLASP = { color: 0xe9cd98, metalness: 1, roughness: 0.3 } as const;

/** Lining, lid underside and scene light in the FLEXD palette. */
export const INTERIOR = {
  lining: 0x2a0b45,
  liningSheen: 0x7a4bb5,
  lid: 0x1e0833,
  lidSheen: 0x5b1e92,
  rimLight: 0x8a5ad0,
  rimIntensity: 1.4,
  fillGround: 0x0a0510,
} as const;
