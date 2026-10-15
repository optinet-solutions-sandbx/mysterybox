"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRef } from "react";
import { Chest } from "@/components/chest/chest";
import { button } from "@/components/ui/button";
import { countdownParts, dropEndsAt } from "@/domain/drops";
import { formatUsd } from "@/domain/money";
import { cn } from "@/lib/cn";
import { useNow } from "@/lib/clock";
import { allBoxes, valueRange } from "@/services/catalog";
import { FORWARD } from "@/components/shell/page-transition";
import { BuyButton } from "./buy-button";

/** One digit pair that rolls up when it changes. */
function Unit({ value, label }: { value: number; label: string }) {
  const reduce = useReducedMotion();
  const text = String(value).padStart(2, "0");
  return (
    <div className="text-center">
      <div className="relative h-[1.05em] overflow-hidden text-5xl leading-none font-extrabold tabular md:text-6xl">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={text}
            className="block"
            initial={reduce ? false : { y: "100%" }}
            animate={{ y: 0 }}
            exit={reduce ? undefined : { y: "-100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            {text}
          </motion.span>
        </AnimatePresence>
      </div>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

/** Compact "Ends in 3d 4h 12m" line for the drop box wherever it is shown. */
export function DropTimer({ className }: { className?: string }) {
  const now = useNow();
  if (!now) return <p className={cn("h-7", className)} />;
  const { d, h, m } = countdownParts(dropEndsAt(new Date(now)) - now);
  return (
    <p className={cn("inline-flex h-7 items-center gap-2 rounded-lg bg-accent-soft px-2.5 text-xs font-semibold text-accent", className)}>
      <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-current" />
      This week only: ends in {d}d {h}h {m}m
    </p>
  );
}

/** The weekly limited drop, with a rolling countdown to Sunday midnight. */
export function DropBand() {
  const drop = allBoxes().find((b) => b.drop)!;
  const { min, max } = valueRange(drop);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const now = useNow();
  const parts = now ? countdownParts(dropEndsAt(new Date(now)) - now) : null;

  return (
    <section ref={ref} aria-labelledby="drop-title" className="relative overflow-hidden rounded-[36px] border border-event/40 bg-[var(--card)]">
      <div aria-hidden className="absolute -top-1/3 right-0 h-[140%] w-2/3 bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--event)_34%,transparent),transparent)]" />
      <div className="relative grid grid-cols-1 items-center gap-6 p-6 md:grid-cols-[1.1fr_1fr] md:p-10">
        <div>
          <p className="font-display text-lg uppercase tracking-[0.04em] text-event">This week&apos;s drop</p>
          <h2 id="drop-title" className="mt-2 font-display text-3xl md:text-5xl">
            {drop.name}
          </h2>
          <p className="mt-3 max-w-md text-muted">
            {drop.tagline} Pieces from {formatUsd(min)} to {formatUsd(max)}. When Sunday ends, so does this box.
          </p>
          <div className="mt-6 flex gap-5 md:gap-7" aria-label={parts ? `Ends in ${parts.d} days ${parts.h} hours ${parts.m} minutes` : undefined}>
            {parts ? (
              <>
                <Unit value={parts.d} label="days" />
                <Unit value={parts.h} label="hours" />
                <Unit value={parts.m} label="minutes" />
                <Unit value={parts.s} label="seconds" />
              </>
            ) : (
              <div className="h-[4.5rem]" />
            )}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <BuyButton box={drop} />
            <Link href={`/box/${drop.slug}`} transitionTypes={FORWARD} className={button({ variant: "outline", size: "lg" })}>
              See what&apos;s inside
            </Link>
          </div>
        </div>
        <div className="grid place-items-center">
          <Chest finish={drop.material} still sizes="(min-width: 768px) 420px, 80vw" className={cn("h-64 w-full max-w-md md:h-80", inView && "animate-float")} label={`${drop.name} box`} />
        </div>
      </div>
    </section>
  );
}
