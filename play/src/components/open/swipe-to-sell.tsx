"use client";

import { ChevronsRight } from "lucide-react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useRef, useState, type MouseEvent } from "react";
import { economy } from "@/config/economy";
import { formatUsd } from "@/domain/money";

/**
 * Selling is a swipe, never a tap, so a piece isn't sold by accident. Keyboard users press the
 * handle (Enter or Space) to sell; a mouse click without a drag only nudges the handle as a hint.
 */
export function SwipeToSell({ offer, onSell }: { offer: number; onSell: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const reduce = useReducedMotion();
  const [done, setDone] = useState(false);
  const fade = useTransform(x, [0, 120], [1, 0]);

  /** How far the handle can travel inside the track. */
  function range() {
    const t = track.current;
    const handle = t?.querySelector<HTMLElement>("[data-handle]");
    return t && handle ? t.clientWidth - handle.offsetWidth - 8 : 0;
  }

  function sell() {
    if (done) return;
    setDone(true);
    const r = range();
    if (reduce) {
      x.set(r);
      onSell();
      return;
    }
    void animate(x, r, { type: "spring", stiffness: 500, damping: 40 }).then(onSell);
  }

  function onClick(e: MouseEvent) {
    if (e.detail === 0) {
      sell();
      return;
    }
    if (reduce || x.get() > 4) return;
    void animate(x, [0, 28, 0], { duration: 0.5, ease: [0.22, 1, 0.36, 1] });
  }

  return (
    <div>
      <div
        ref={track}
        className="relative flex h-16 items-center rounded-pill border border-accent/35 bg-surface/80 p-1"
      >
        <motion.button
          type="button"
          data-handle
          aria-label={`Sell for ${formatUsd(offer)}`}
          className="btn-foil z-10 flex h-full w-[54%] items-center justify-center gap-1.5 rounded-pill font-semibold text-on-accent"
          style={{ x }}
          drag={done ? false : "x"}
          dragConstraints={track}
          dragElastic={0.04}
          dragMomentum={false}
          onDragEnd={() => {
            if (x.get() >= range() * 0.72) sell();
            else void animate(x, 0, { type: "spring", stiffness: 500, damping: 36 });
          }}
          onClick={onClick}
        >
          {done ? "Sold" : "Swipe to sell"}
          {!done && <ChevronsRight className="size-5" />}
        </motion.button>
        <motion.div style={{ opacity: fade }} className="pointer-events-none ml-auto pr-6 text-right">
          <span className="block text-xs text-muted">{Math.round(economy.sellBackRate * 100)}% offer</span>
          <span className="font-display text-xl font-semibold tabular">{formatUsd(offer)}</span>
        </motion.div>
      </div>
      <p className="mt-2 text-center text-xs text-subtle">Swiping sells this piece for {formatUsd(offer)}. Sales are final.</p>
    </div>
  );
}
