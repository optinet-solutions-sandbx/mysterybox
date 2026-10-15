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
      className="relative h-[340px] md:h-[480px]"
    >
      <div aria-hidden className="absolute inset-x-[4%] bottom-[2%] h-2/3 bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--velvet-500)_34%,transparent),transparent)]" />
      <ViewTransition name={`chest-${box.slug}`} share="morph" default="none">
        <Chest still float={inView} tilt priority sizes="(min-width: 1024px) 560px, 92vw" className="size-full" label={`${box.name} box`} />
      </ViewTransition>
    </div>
  );
}
