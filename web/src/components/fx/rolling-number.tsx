"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

const DIGITS = "0123456789";

/**
 * Odometer-style value: each digit column rolls to its new value on a spring.
 * Columns are keyed from the right so units stay aligned when the length changes.
 * `foil` is applied per glyph: background-clip:text on a parent does not reach transformed children.
 */
export function RollingNumber({ value, className, foil = false }: { value: string; className?: string; foil?: boolean }) {
  const reduce = useReducedMotion();
  const chars = value.split("");
  return (
    <span className={cn("inline-flex overflow-hidden leading-none tabular", className)} aria-label={value}>
      {chars.map((ch, i) => {
        const key = chars.length - i;
        if (!DIGITS.includes(ch)) {
          return (
            <span key={`s${key}`} aria-hidden className={cn(foil && "text-foil")}>
              {ch}
            </span>
          );
        }
        return (
          <span key={`d${key}`} aria-hidden className="relative inline-block h-[1em] w-[0.62em] overflow-hidden">
            <motion.span
              className="absolute inset-x-0 top-0 flex flex-col"
              initial={false}
              animate={{ y: `${-Number(ch)}em` }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 34 }}
            >
              {DIGITS.split("").map((d) => (
                <span key={d} className={cn("block h-[1em] text-center", foil && "text-foil")}>
                  {d}
                </span>
              ))}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}
