"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { formatUsd } from "@/domain/money";

const formats = {
  int: (n: number) => Math.round(n).toLocaleString("en-US"),
  usd: (cents: number) => formatUsd(Math.round(cents)),
  percent: (n: number) => `${Math.round(n)}%`,
} as const;

/**
 * Counts from 0 to `to` when scrolled into view (or on mount with `auto`). Writes to the DOM
 * directly; an invisible copy of the final value reserves the width so nothing shifts.
 */
export function CountUp({
  to,
  format = "int",
  duration = 1.6,
  auto = false,
  foil = false,
  className,
}: {
  to: number;
  format?: keyof typeof formats;
  duration?: number;
  auto?: boolean;
  /** Gold foil on the animated digits (background-clip:text can't reach them from a parent). */
  foil?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const reduce = useReducedMotion();
  const fmt = formats[format];

  useEffect(() => {
    const el = ref.current;
    if (!el || !(inView || auto)) return;
    if (reduce) {
      el.textContent = fmt(to);
      return;
    }
    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = fmt(v);
      },
    });
    return () => controls.stop();
  }, [inView, auto, reduce, to, duration, fmt]);

  return (
    <span className={`relative inline-block tabular ${className ?? ""}`}>
      <span className="invisible">{fmt(to)}</span>
      <span ref={ref} aria-hidden className={`absolute inset-0 text-left ${foil ? "text-foil" : ""}`}>
        {fmt(0)}
      </span>
      <span className="sr-only">{fmt(to)}</span>
    </span>
  );
}
