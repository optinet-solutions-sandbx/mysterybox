"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Headline lines rise out of a mask, one after another. `onLoad` plays at mount (the hero's
 * single orchestrated moment); otherwise it plays once when scrolled into view.
 */
export function LineReveal({
  lines,
  className,
  lineClassName,
  delay = 0,
  onLoad = false,
}: {
  lines: ReactNode[];
  className?: string;
  lineClassName?: string;
  delay?: number;
  onLoad?: boolean;
}) {
  const reduce = useReducedMotion();
  const trigger = onLoad ? { animate: { y: "0%" } } : { whileInView: { y: "0%" }, viewport: { once: true, margin: "-10% 0px" } };
  return (
    <span className={cn("block", className)}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          <motion.span
            className={cn("block", lineClassName)}
            initial={reduce ? false : { y: "110%" }}
            {...trigger}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: delay + i * 0.12 }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
