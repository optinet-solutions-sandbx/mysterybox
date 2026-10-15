"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import type { Item } from "@/domain/types";
import { formatUsd } from "@/domain/money";
import { brand } from "@/config/brand";
import { BOX_WIDTH, Box3D } from "@/components/box3d/box-3d";
import { ItemArt } from "@/components/item/item-art";
import { LineReveal } from "@/components/fx/line-reveal";
import { MarblePreload } from "@/components/layout/marble-preload";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { cn } from "@/lib/cn";

export interface ShowcaseCategory {
  id: string;
  label: string;
  items: Item[];
}

const INTRO_MS = 1500;
const OPEN_MS = 3600;
const CLOSED_MS = 900;

/**
 * The page's one orchestrated moment: the headline rises out of its mask, the box settles,
 * then opens — light, gold dust, and a piece lifts out. Afterwards it cycles slowly through
 * categories; picking a chip takes over the cycle.
 */
export function Hero({ categories }: { categories: ShowcaseCategory[] }) {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (reduce) return;
    let timer = window.setTimeout(function cycle() {
      setIsOpen(true);
      timer = window.setTimeout(() => {
        setIsOpen(false);
        timer = window.setTimeout(() => {
          setTick((t) => t + 1);
          cycle();
        }, CLOSED_MS);
      }, OPEN_MS);
    }, INTRO_MS);
    return () => window.clearTimeout(timer);
  }, [reduce]);

  const open = reduce || isOpen;
  const category = categories[pick ?? tick % categories.length];
  const item = category.items[tick % category.items.length];

  return (
    <section className="relative isolate -mt-16 overflow-hidden pt-16">
      <MarblePreload />
      {/* Light: sapphire aurora behind, a cold spotlight onto the box, marble underfoot. */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute -top-1/3 left-[10%] h-[100vh] w-[90vw] animate-aurora bg-[radial-gradient(closest-side,var(--aurora-a),transparent)]" />
        <div className="absolute top-[15%] -right-1/4 h-[90vh] w-[70vw] animate-aurora bg-[radial-gradient(closest-side,var(--aurora-b),transparent)] [animation-delay:-9s]" />
        <div className="absolute inset-x-0 bottom-0 h-[45%] bg-marble opacity-40 [mask-image:linear-gradient(to_top,black,transparent)]" />
      </div>

      <Container className="grid min-h-[calc(100svh-4rem)] items-center gap-6 py-12 lg:grid-cols-[1.08fr_1fr] lg:py-0">
        <div className="relative z-10">
          <h1 className="font-display font-medium">
            <LineReveal
              onLoad
              delay={0.15}
              lines={[brand.taglineLines[0]]}
              className="text-[clamp(1.55rem,3.3vw,3.1rem)] leading-tight text-fg"
            />
            <LineReveal
              onLoad
              delay={0.32}
              lines={[brand.taglineLines[1]]}
              className="mt-1 text-[clamp(3.4rem,7.6vw,7.4rem)] leading-[0.95] tracking-[-0.01em]"
              lineClassName="text-foil"
            />
          </h1>
          <div className="animate-fade-up [animation-delay:0.75s]">
            <p className="mt-7 text-2xl font-light text-fg italic">{brand.descriptor}</p>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">{brand.description}</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <ButtonLink href="/boxes" size="lg">
                Open your first box
              </ButtonLink>
              <ButtonLink href="/how-it-works" variant="ghost" size="lg">
                See how it works
              </ButtonLink>
            </div>
            <p className="mt-8 text-sm text-subtle">
              Every box lists its odds. {brand.minimumAge}+ only.
            </p>
          </div>
        </div>

        <div className="relative animate-drop-in [animation-delay:0.35s]">
          <div className="relative mx-auto h-[360px] w-full max-w-[560px] sm:h-[500px] lg:h-[600px]" data-cursor="box">
            <div className="absolute top-[64%] left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.56] sm:scale-90 lg:scale-100 lg:top-[60%]">
              <Box3D width={BOX_WIDTH.stage} open={open ? 1 : 0} tilt float />
            </div>

            <AnimatePresence mode="popLayout">
              {open && (
                <motion.div
                  key={`${category.id}-${item.id}`}
                  className="absolute top-[3%] left-1/2 z-10 w-[min(44%,220px)] -translate-x-1/2"
                  initial={reduce ? false : { opacity: 0, y: 150, scale: 0.4 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 110, scale: 0.55, transition: { duration: 0.5, ease: [0.55, 0, 0.75, 0.2] } }}
                  transition={{ type: "spring", stiffness: 120, damping: 17, delay: reduce ? 0 : 0.3 }}
                >
                  <figure className="overflow-hidden rounded-[18px] bg-surface shadow-[0_30px_80px_-20px_var(--shadow-strong)] ring-1 ring-accent/30">
                    <ItemArt item={item} rarity="legendary" showBrand={false} sizes="220px" />
                    <figcaption className="border-t border-line px-4 py-3">
                      <p className="truncate font-display text-[11px] tracking-[0.18em] text-accent">{item.brand}</p>
                      <p className="mt-0.5 truncate text-sm text-fg">{item.name}</p>
                      <p className="mt-1 font-display text-lg text-foil tabular">{formatUsd(item.value)}</p>
                    </figcaption>
                  </figure>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative z-10 -mt-6 flex justify-center gap-1.5" role="group" aria-label="Preview a category">
            {categories.map((c, i) => {
              const active = category.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setPick(i);
                    setTick((t) => t + 1);
                  }}
                  className={cn(
                    "relative rounded-pill px-4 py-2 text-sm transition-colors",
                    active ? "text-on-accent" : "text-muted hover:text-fg",
                  )}
                >
                  {active && (
                    <motion.span layoutId="hero-chip" className="absolute inset-0 -z-10 rounded-pill bg-foil" transition={{ type: "spring", stiffness: 400, damping: 34 }} />
                  )}
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
