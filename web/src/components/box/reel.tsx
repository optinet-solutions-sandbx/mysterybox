"use client";

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  useVelocity,
  type MotionValue,
} from "motion/react";
import { forwardRef, useEffect, useEffectEvent, useRef, useState } from "react";
import type { ResolvedEntry } from "@/domain/types";
import { formatUsd } from "@/domain/money";
import { ItemArt } from "@/components/item/item-art";
import { rarityBorder } from "@/components/item/rarity-tag";
import { cn } from "@/lib/cn";

const TILE = 140;
const GAP = 12;
const STEP = TILE + GAP;
/** Long, soft deceleration. Mirrors --ease-reel in globals.css. */
const REEL_EASE = [0.08, 0.82, 0.17, 1] as const;

export interface ReelSpin {
  key: number;
  tiles: ResolvedEntry[];
  winnerIndex: number;
  /** Where inside the winning tile the marker lands, as a fraction of a tile (±0.35). */
  jitter: number;
  duration: number;
}

/**
 * Horizontal opening reel, drawn as a drum: tiles turn away and dim toward the edges. The
 * outcome is decided before a spin arrives; this only animates to it.
 */
export const Reel = forwardRef<
  HTMLDivElement,
  { spin: ReelSpin | null; preview: ResolvedEntry[]; onSettled: () => void; skip?: boolean }
>(function Reel({ spin, preview, onSettled, skip = false }, outerRef) {
    const viewport = useRef<HTMLDivElement>(null);
    const controlsRef = useRef<ReturnType<typeof animate> | null>(null);
    const reduce = useReducedMotion();
    const x = useMotionValue(0);
    const velocity = useVelocity(x);
    const blur = useTransform(velocity, (v) => `blur(${Math.min(Math.abs(v) / 2600, 2.2)}px)`);
    const [half, setHalf] = useState(600);
    const [settledKey, setSettledKey] = useState<number | null>(null);
    const settle = useEffectEvent((key: number) => {
      setSettledKey(key);
      onSettled();
    });

    useEffect(() => {
      const el = viewport.current;
      if (!el) return;
      const ro = new ResizeObserver(([e]) => setHalf(e.contentRect.width / 2));
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    useEffect(() => {
      if (!spin || !viewport.current) return;
      const width = viewport.current.clientWidth;
      const target = -(spin.winnerIndex * STEP + TILE / 2 + spin.jitter * TILE - width / 2);
      x.jump(0);
      const controls = animate(x, target, { duration: reduce ? 0 : spin.duration, ease: REEL_EASE });
      controlsRef.current = controls;
      controls.then(() => settle(spin.key));
      return () => controls.stop();
    }, [spin, reduce, x]);

    useEffect(() => {
      if (skip) controlsRef.current?.complete();
    }, [skip]);

    const tiles = spin?.tiles ?? [...preview, ...preview, ...preview];

    return (
      <div ref={outerRef} className="relative">
        <div
          ref={viewport}
          className="relative overflow-hidden rounded-[28px] border border-line bg-[image:var(--reel-bg)] py-7"
        >
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/4 bg-gradient-to-r from-[var(--reel-edge)] to-transparent" />
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-1/4 bg-gradient-to-l from-[var(--reel-edge)] to-transparent" />
          <div aria-hidden className="pointer-events-none absolute inset-y-3 left-1/2 z-20 w-px -translate-x-1/2 bg-accent shadow-[0_0_24px_2px_var(--gold)]" />
          <div aria-hidden className="pointer-events-none absolute top-0 left-1/2 z-20 size-0 -translate-x-1/2 border-x-8 border-t-[10px] border-x-transparent border-t-accent" />
          <div aria-hidden className="pointer-events-none absolute bottom-0 left-1/2 z-20 size-0 -translate-x-1/2 border-x-8 border-b-[10px] border-x-transparent border-b-accent" />

          {spin ? (
            <motion.div className="flex gap-[12px] will-change-transform" style={{ x, filter: blur }}>
              {tiles.map((entry, i) => (
                <DrumTile
                  key={i}
                  entry={entry}
                  index={i}
                  x={x}
                  half={half}
                  highlight={settledKey === spin.key && i === spin.winnerIndex}
                  dim={settledKey === spin.key && i !== spin.winnerIndex}
                />
              ))}
            </motion.div>
          ) : (
            <div className="flex w-max animate-marquee gap-[12px] [--marquee-duration:120s]">
              {[...tiles, ...tiles].map((entry, i) => (
                <Tile key={i} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
});

function DrumTile({
  entry,
  index,
  x,
  half,
  highlight,
  dim,
}: {
  entry: ResolvedEntry;
  index: number;
  x: MotionValue<number>;
  half: number;
  highlight: boolean;
  dim: boolean;
}) {
  const offset = useTransform(x, (v) => (index * STEP + TILE / 2 + v - half) / half);
  const rotateY = useTransform(offset, (o) => Math.max(-1, Math.min(1, o)) * -38);
  const scale = useTransform(offset, (o) => 1 - Math.min(1, Math.abs(o)) * 0.16);
  return (
    <motion.div style={{ rotateY, scale, transformPerspective: 900 }}>
      <Tile entry={entry} highlight={highlight} dim={dim} />
    </motion.div>
  );
}

function Tile({ entry, highlight, dim }: { entry: ResolvedEntry; highlight?: boolean; dim?: boolean }) {
  return (
    <div
      style={{ width: TILE }}
      className={cn(
        "shrink-0 overflow-hidden rounded-[18px] border-b-[3px] bg-surface transition-[transform,opacity,box-shadow] duration-500 ease-snap",
        rarityBorder[entry.rarity],
        highlight && "scale-[1.08] shadow-[0_0_50px_-4px_var(--gold)]",
        dim && "opacity-30",
      )}
    >
      <ItemArt item={entry.item} rarity={entry.rarity} showBrand={false} sizes="140px" />
      <div className="px-3 py-2.5">
        <p className="truncate text-[11px] text-muted">{entry.item.brand}</p>
        <p className="font-display text-sm text-foil tabular">{formatUsd(entry.item.value)}</p>
      </div>
    </div>
  );
}
