"use client";

import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  wrap,
} from "motion/react";
import { useRef } from "react";
import type { Item } from "@/domain/types";
import { formatUsd } from "@/domain/money";
import { ItemArt } from "@/components/item/item-art";

/**
 * Two rows of pieces drifting in opposite directions. Scrolling surges them (velocity-coupled)
 * and flips their direction with the scroll direction. Paused while off-screen.
 */
export function VaultMarquee({ items }: { items: Item[] }) {
  const half = Math.ceil(items.length / 2);
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const factor = useTransform(velocity, [-2000, 0, 2000], [-5, 0, 5], { clamp: false });

  return (
    <section ref={ref} aria-label="Pieces you can find in our boxes" className="relative overflow-hidden py-16 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
      <Row items={items.slice(0, half)} baseSpeed={-2.2} factor={factor} active={inView} />
      <Row items={items.slice(half)} baseSpeed={2.2} factor={factor} active={inView} />
    </section>
  );
}

function Row({
  items,
  baseSpeed,
  factor,
  active,
}: {
  items: Item[];
  baseSpeed: number;
  factor: ReturnType<typeof useTransform<number, number>>;
  active: boolean;
}) {
  const reduce = useReducedMotion();
  const base = useMotionValue(0);
  const direction = useRef(1);
  const x = useTransform(base, (v) => `${wrap(-50, 0, v)}%`);

  useAnimationFrame((_, delta) => {
    if (!active || reduce) return;
    const f = factor.get();
    if (f < 0) direction.current = -1;
    else if (f > 0) direction.current = 1;
    const move = baseSpeed * direction.current * (delta / 1000) * (1 + Math.abs(f));
    base.set(base.get() + move * 0.6);
  });

  return (
    <div className="mb-5 flex overflow-hidden">
      <motion.div className="flex w-max gap-5" style={{ x }}>
        {[...items, ...items].map((item, i) => (
          <figure key={i} className="flex w-80 shrink-0 items-center gap-4 rounded-[18px] border border-line bg-surface/70 p-3 backdrop-blur-sm">
            <ItemArt item={item} showBrand={false} className="size-24 shrink-0 rounded-[12px]" />
            <figcaption className="min-w-0">
              <p className="truncate font-display text-[11px] tracking-[0.18em] text-accent">{item.brand}</p>
              <p className="truncate text-sm text-fg">{item.name}</p>
              <p className="mt-1 font-display text-base text-foil tabular">{formatUsd(item.value)}</p>
            </figcaption>
          </figure>
        ))}
      </motion.div>
    </div>
  );
}
