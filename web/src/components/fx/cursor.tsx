"use client";

import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";

const FINE = "(pointer: fine)";

function subscribeFine(onChange: () => void) {
  const query = window.matchMedia(FINE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * A gold ring that trails the pointer and swells over anything marked `data-cursor`, naming
 * what a click will do (`data-cursor-label`, default "Open"). Fine pointers only; the native
 * cursor stays visible.
 */
export function Cursor() {
  const reduce = useReducedMotion();
  const fine = useSyncExternalStore(subscribeFine, () => window.matchMedia(FINE).matches, () => false);
  const [label, setLabel] = useState<string | null>(null);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.4 });
  const enabled = fine && !reduce;

  useEffect(() => {
    if (!enabled) return;
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const target = (e.target as Element | null)?.closest?.("[data-cursor]");
      setLabel(target ? (target.getAttribute("data-cursor-label") ?? "Open") : null);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [enabled, x, y]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[70] grid place-items-center rounded-full border border-accent/80"
      style={{ x: sx, y: sy, translateX: "-50%", translateY: "-50%" }}
      animate={{
        width: label ? 78 : 24,
        height: label ? 78 : 24,
        backgroundColor: label ? "rgb(194 164 110 / 0.92)" : "rgb(194 164 110 / 0)",
      }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <AnimatePresence>
        {label && (
          <motion.span
            className="font-display text-[11px] font-semibold tracking-[0.18em] text-[#0b0b0d]"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
