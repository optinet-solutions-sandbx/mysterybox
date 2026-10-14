"use client";

import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
import type { Item } from "@/domain/types";
import { formatUsd } from "@/domain/money";
import { economy } from "@/config/economy";
import { tradeInEnabled, tradeInRate } from "@/config/features";
import { BOX_WIDTH, Box3D } from "@/components/box3d/box-3d";
import { ItemArt } from "@/components/item/item-art";
import { cn } from "@/lib/cn";

const steps = [
  {
    numeral: "I",
    title: "Choose your box",
    body: "Each box lists every piece inside, what it’s worth and the exact chance of getting it. Pick the price that suits you.",
  },
  {
    numeral: "II",
    title: "Open it",
    body: "The result is fixed by seeds committed before you open, then revealed. You can check any opening yourself.",
  },
  {
    numeral: "III",
    title: tradeInEnabled ? "Ship it or trade it in" : "Ship it home",
    body: tradeInEnabled
      ? `Have the piece shipped to you, or trade it in for ${tradeInRate} of its value in site credit.`
      : "Have the piece shipped to you, or keep it in your inventory until you're ready.",
  },
];

/**
 * Pinned scroll story. The page scroll drives the box: it turns to face you (I), the lid
 * lifts and a piece rises (II), then the two choices appear (III).
 */
export function Ritual({ item, priceRange }: { item: Item; priceRange: string }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [step, setStep] = useState(0);
  useMotionValueEvent(p, "change", (v) => setStep(v < 0.34 ? 0 : v < 0.67 ? 1 : 2));

  const viewY = useTransform(p, [0, 0.3, 1], [-82, -30, -18]);
  const viewX = useTransform(p, [0, 0.3], [-6, -18]);
  const open = useTransform(p, [0.36, 0.56], [0, 1]);
  const cardY = useTransform(p, [0.48, 0.66], [140, -20]);
  const cardScale = useTransform(p, [0.48, 0.66], [0.45, 1]);
  const cardOpacity = useTransform(p, [0.46, 0.56], [0, 1]);
  const tagOpacity = useTransform(p, [0.05, 0.12, 0.28, 0.34], [0, 1, 1, 0]);
  const choices = useTransform(p, [0.7, 0.8], [0, 1]);
  const choicesY = useTransform(p, [0.7, 0.8], [24, 0]);
  const progress = useTransform(p, [0, 1], ["0%", "100%"]);

  return (
    <section ref={ref} className={cn("relative", reduce ? "" : "h-[340vh]")} aria-label="How it works">
      <div className={cn("top-0 flex items-center overflow-hidden", reduce ? "py-24" : "sticky h-[100svh]")}>
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_70%_50%,var(--aurora-b),transparent)]" />
        <div className="mx-auto grid w-full max-w-7xl items-center gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="relative order-2 flex gap-6 lg:order-1">
            <div aria-hidden className="relative w-px shrink-0 bg-line">
              <motion.div className="absolute inset-x-0 top-0 bg-accent" style={{ height: progress }} />
            </div>
            <ol className="grid gap-8 py-2 sm:gap-10">
              {steps.map((s, i) => (
                <motion.li
                  key={s.numeral}
                  animate={{ opacity: step === i || reduce ? 1 : 0.28, x: step === i ? 0 : -6 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="font-display text-sm text-foil">{s.numeral}</span>
                  <h2 className="mt-1 font-display text-3xl sm:text-4xl">{s.title}</h2>
                  <p className={cn("mt-3 max-w-md leading-relaxed text-muted", step !== i && !reduce && "max-sm:hidden")}>{s.body}</p>
                </motion.li>
              ))}
            </ol>
          </div>

          <div className="relative order-1 h-[46svh] min-h-[320px] lg:order-2 lg:h-[640px]">
            <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.62] sm:scale-85 lg:scale-110">
              <Box3D width={BOX_WIDTH.stage} material="navy" open={reduce ? 1 : open} viewX={reduce ? -18 : viewX} viewY={reduce ? -30 : viewY} />
            </div>

            <motion.p
              className="absolute top-[18%] right-[6%] rounded-pill border border-line bg-surface/80 px-4 py-2 font-display text-sm text-foil backdrop-blur"
              style={{ opacity: reduce ? 0 : tagOpacity }}
            >
              {priceRange}
            </motion.p>

            <motion.figure
              className="absolute top-[2%] left-1/2 w-[min(40%,200px)] -translate-x-1/2 overflow-hidden rounded-[18px] bg-surface shadow-[0_30px_80px_-20px_var(--shadow-strong)] ring-1 ring-accent/30"
              style={reduce ? undefined : { y: cardY, scale: cardScale, opacity: cardOpacity }}
            >
              <ItemArt item={item} rarity="legendary" showBrand={false} sizes="200px" />
              <figcaption className="border-t border-line px-3 py-2.5">
                <p className="truncate text-xs text-muted">{item.brand} {item.name}</p>
                <p className="font-display text-base text-foil tabular">{formatUsd(item.value)}</p>
              </figcaption>
            </motion.figure>

            <motion.div
              className="absolute inset-x-0 bottom-[2%] flex justify-center gap-3"
              style={reduce ? undefined : { opacity: choices, y: choicesY }}
            >
              {tradeInEnabled ? (
                <>
                  <span className="rounded-pill border border-line bg-surface/90 px-5 py-2.5 text-sm backdrop-blur">Ship it to me</span>
                  <span className="rounded-pill bg-foil px-5 py-2.5 text-sm text-on-accent">
                    Trade in · {formatUsd(Math.floor(item.value * economy.sellBackRate))}
                  </span>
                </>
              ) : (
                <>
                  <span className="rounded-pill border border-line bg-surface/90 px-5 py-2.5 text-sm backdrop-blur">Keep it for now</span>
                  <span className="rounded-pill bg-foil px-5 py-2.5 text-sm text-on-accent">Ship it to me</span>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
