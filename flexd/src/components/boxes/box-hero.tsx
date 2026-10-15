"use client";

import { useInView } from "motion/react";
import { useRef, ViewTransition } from "react";
import { Chest } from "@/components/chest/chest";
import type { Box } from "@/domain/types";

/** The box page's stage: the box floats and follows the pointer (a still; the 3D model runs on the opening screen). */
export function BoxHero({ box }: { box: Box }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  return (
    <div
      ref={ref}
      className="relative h-[340px] overflow-hidden rounded-[36px] border border-line/70 bg-[var(--card)] md:h-[480px]"
    >
      <div aria-hidden className="absolute inset-x-[8%] bottom-[6%] h-2/3 bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--glow)_42%,transparent),transparent)]" />
      <ViewTransition name={`chest-${box.slug}`} share="morph" default="none">
        <Chest finish={box.material} still float={inView} tilt priority sizes="(min-width: 1024px) 560px, 92vw" className="size-full" label={`${box.name} box`} />
      </ViewTransition>
    </div>
  );
}
