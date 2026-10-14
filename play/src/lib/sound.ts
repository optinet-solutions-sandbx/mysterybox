import { useSyncExternalStore } from "react";
import type { Rarity } from "@/domain/types";

/**
 * Sound and vibration for the opening, synthesised with Web Audio (no audio files, nothing
 * third-party). One switch covers both; it is remembered in this browser. The audio context is
 * created on the first call, which always follows a tap, so autoplay rules are respected.
 * Vibration works where the browser supports it (Android Chrome; not iOS Safari).
 */

const KEY = "grailnoir-play-sound";
const EVENT = "grailnoir-play-sound-change";

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {}
  window.dispatchEvent(new Event(EVENT));
  if (on) sfx.tap();
}

export function useSoundEnabled(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener(EVENT, onChange);
      return () => window.removeEventListener(EVENT, onChange);
    },
    soundEnabled,
    () => true,
  );
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): { ac: AudioContext; out: GainNode } | null {
  if (typeof window === "undefined" || !soundEnabled()) return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.6;
      // A gentle compressor keeps stacked chimes from clipping.
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return { ac: ctx, out: master! };
  } catch {
    return null;
  }
}

function envelope(ac: AudioContext, at: number, peak: number, attack: number, decay: number) {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  return g;
}

function tone(freq: number, delay: number, decay: number, peak = 0.2, type: OscillatorType = "sine", glideTo?: number) {
  const a = audio();
  if (!a) return;
  const at = a.ac.currentTime + delay;
  const osc = a.ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, at + decay);
  const g = envelope(a.ac, at, peak, 0.006, decay);
  osc.connect(g).connect(a.out);
  osc.start(at);
  osc.stop(at + decay + 0.05);
}

/** A struck bell: the fundamental plus inharmonic partials that die away faster. */
function bell(freq: number, delay = 0, peak = 0.16, decay = 1.4) {
  tone(freq, delay, decay, peak);
  tone(freq * 2.76, delay, decay * 0.45, peak * 0.35);
  tone(freq * 5.4, delay, decay * 0.2, peak * 0.15);
}

function noise(delay: number, dur: number, from: number, to: number, peak = 0.12, q = 1.2) {
  const a = audio();
  if (!a) return;
  const at = a.ac.currentTime + delay;
  const buf = a.ac.createBuffer(1, Math.ceil(a.ac.sampleRate * dur), a.ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.ac.createBufferSource();
  src.buffer = buf;
  const filter = a.ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, at);
  filter.frequency.exponentialRampToValueAtTime(to, at + dur);
  const g = envelope(a.ac, at, peak, dur * 0.3, dur * 0.7);
  src.connect(filter).connect(g).connect(a.out);
  src.start(at);
  src.stop(at + dur + 0.05);
}

// Pentatonic steps in D, so any stack of chimes sounds consonant.
const D5 = 587.33;
const SCALE = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2, 3];

export const sfx = {
  /** Soft click for taps and toggles. */
  tap() {
    tone(1900, 0, 0.05, 0.05, "triangle");
  },
  /** The lid notches as it is swiped up (step 0–3). */
  notch(step: number) {
    tone(700 + step * 160, 0, 0.07, 0.07, "triangle");
  },
  /** Carousel: a short air swish. */
  swish() {
    noise(0, 0.22, 900, 3200, 0.05, 0.8);
  },
  /** The lid swings open: a low thump, a rising whoosh and a shimmer of light. */
  open() {
    tone(110, 0, 0.35, 0.22, "sine", 55);
    noise(0.02, 0.7, 260, 3800, 0.14, 0.9);
    [0, 2, 4, 5, 7].forEach((s, i) => tone(D5 * SCALE[s], 0.25 + i * 0.07, 0.6, 0.05));
  },
  /** The piece arrives: bigger tiers ring longer and climb higher. */
  reveal(rarity: Rarity) {
    const steps: Record<Rarity, number[]> = {
      common: [0],
      uncommon: [0, 3],
      rare: [0, 2, 4],
      epic: [0, 2, 4, 5, 7],
      grail: [0, 2, 4, 5, 7, 8],
    };
    steps[rarity].forEach((s, i) => bell(D5 * SCALE[s], i * 0.09, 0.13, rarity === "grail" ? 2.2 : 1.4));
    if (rarity === "epic" || rarity === "grail") {
      tone(73.4, 0, 1.2, 0.2, "sine");
      noise(0.1, 1.4, 4000, 9000, 0.05, 0.6);
    }
  },
  /** Sold: two quick bright coin notes. */
  sell() {
    bell(D5 * 3, 0, 0.12, 0.5);
    bell(D5 * 4, 0.08, 0.12, 0.7);
  },
};

export function haptic(pattern: number | number[]) {
  if (!soundEnabled()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}

export const HAPTIC = {
  tick: 8,
  open: [18, 40, 28],
  reveal: { common: 20, uncommon: 30, rare: [30, 50, 40], epic: [40, 50, 40, 50, 80], grail: [60, 40, 60, 40, 120] } as Record<Rarity, number | number[]>,
  sell: [12, 30, 24],
};
