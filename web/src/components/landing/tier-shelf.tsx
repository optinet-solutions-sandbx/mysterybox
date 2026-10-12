"use client";

import Link from "next/link";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BoxMaterial } from "@/domain/types";
import { formatUsd } from "@/domain/money";
import { BOX_WIDTH, Box3D } from "@/components/box3d/box-3d";
import { RollingNumber } from "@/components/fx/rolling-number";
import { cn } from "@/lib/cn";

export interface ShelfBox {
  slug: string;
  name: string;
  tagline: string;
  price: number;
  material: BoxMaterial;
  top: { brand: string; name: string; value: number };
}

const ADVANCE_MS = 3400;

/**
 * Every tier on one spotlit shelf. The lit box sits ajar; price digits roll as the shelf
 * turns. Auto-advances only while visible and not hovered.
 */
export function TierShelf({ boxes }: { boxes: ShelfBox[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-20% 0px" });
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (!inView || hover || reduce) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % boxes.length), ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [inView, hover, reduce, boxes.length]);

  const current = boxes[active];
  const go = (d: number) => setActive((a) => (a + d + boxes.length) % boxes.length);

  return (
    <section className="relative py-28" aria-label="Box tiers">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="max-w-3xl font-display text-4xl leading-tight sm:text-6xl">
          Eight boxes, from {formatUsd(boxes[0].price)} to {formatUsd(boxes[boxes.length - 1].price)}.
        </h2>
      </div>

      <div
        ref={ref}
        className="relative mt-10 h-[440px] overflow-hidden sm:h-[520px]"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {/* Spotlight cone onto the active box */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-1/2 h-full w-[520px] -translate-x-1/2"
          style={{
            background:
              "conic-gradient(from 180deg at 50% -10%, transparent 160deg, rgb(255 244 214 / 0.13) 175deg, rgb(255 244 214 / 0.2) 180deg, rgb(255 244 214 / 0.13) 185deg, transparent 200deg)",
          }}
        />
        <div aria-hidden className="absolute inset-x-0 bottom-[14%] h-px bg-[image:var(--foil-edge)]" />

        {boxes.map((box, i) => {
          let offset = i - active;
          if (offset > boxes.length / 2) offset -= boxes.length;
          if (offset < -boxes.length / 2) offset += boxes.length;
          const far = Math.abs(offset) > 2;
          if (far) return null;
          return (
            <motion.button
              key={box.slug}
              type="button"
              aria-label={`Show ${box.name}`}
              aria-current={offset === 0}
              onClick={() => setActive(i)}
              className="absolute top-[54%] left-1/2 -translate-x-1/2 -translate-y-1/2"
              initial={false}
              animate={{
                x: offset * 260,
                scale: offset === 0 ? 1 : 0.6,
                opacity: far ? 0 : offset === 0 ? 1 : 0.35,
              }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 22 }}
              style={{ zIndex: 10 - Math.abs(offset), pointerEvents: far ? "none" : "auto" }}
              tabIndex={far ? -1 : 0}
            >
              <Box3D width={BOX_WIDTH.tile} material={box.material} open={offset === 0 ? 0.28 : 0} viewY={offset === 0 ? -30 : -30 + offset * 6} />
            </motion.button>
          );
        })}

        <button type="button" onClick={() => go(-1)} aria-label="Previous box" className="absolute top-1/2 left-4 z-20 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-line bg-bg/60 text-fg backdrop-blur hover:border-accent sm:left-10">
          <ChevronLeft className="size-5" />
        </button>
        <button type="button" onClick={() => go(1)} aria-label="Next box" className="absolute top-1/2 right-4 z-20 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-line bg-bg/60 text-fg backdrop-blur hover:border-accent sm:right-10">
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="mx-auto -mt-4 max-w-xl px-4 text-center" aria-live="polite">
        <p className="font-display text-2xl sm:text-3xl">{current.name}</p>
        <p className="mt-2 text-muted">{current.tagline}</p>
        <p className="mt-5 font-display text-5xl">
          <RollingNumber value={formatUsd(current.price)} foil />
        </p>
        <p className="mt-3 text-sm text-subtle">
          Top piece: {current.top.brand} {current.top.name}, {formatUsd(current.top.value)}
        </p>
        <Link
          href={`/boxes/${current.slug}`}
          data-cursor
          className="mt-7 inline-flex h-12 items-center rounded-pill border border-accent/60 px-7 text-sm text-fg transition-colors hover:bg-accent hover:text-on-accent"
        >
          View this box
        </Link>
        <div className="mt-6 flex justify-center gap-1.5">
          {boxes.map((b, i) => (
            <span key={b.slug} aria-hidden className={cn("h-1 rounded-full transition-all duration-500", i === active ? "w-8 bg-accent" : "w-2 bg-line")} />
          ))}
        </div>
      </div>
    </section>
  );
}
