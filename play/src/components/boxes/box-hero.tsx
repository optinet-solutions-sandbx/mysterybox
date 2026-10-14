"use client";

import { useInView } from "motion/react";
import { useRef, useState, ViewTransition } from "react";
import { Chest } from "@/components/chest/chest";
import type { Box } from "@/domain/types";

/** The box page's stage: the box floats, follows the pointer and lifts its lid a crack on hover. */
export function BoxHero({ box }: { box: Box }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const [peek, setPeek] = useState(false);
  return (
    <div
      ref={ref}
      onPointerEnter={(e) => e.pointerType === "mouse" && setPeek(true)}
      onPointerLeave={() => setPeek(false)}
      className="relative h-[340px] overflow-hidden rounded-[36px] border border-line/70 bg-[var(--card)] md:h-[480px]"
    >
      <div aria-hidden className="absolute inset-x-[8%] bottom-[6%] h-2/3 bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--glow)_42%,transparent),transparent)]" />
      <ViewTransition name={`chest-${box.slug}`} share="morph" default="none">
        <Chest finish={box.material} float={inView} tilt peek={peek} priority sizes="(min-width: 1024px) 560px, 92vw" className="size-full" label={`${box.name} box`} />
      </ViewTransition>
    </div>
  );
}
