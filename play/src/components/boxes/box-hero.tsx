"use client";

import { useInView } from "motion/react";
import { useRef, useState } from "react";
import { Box3D } from "@/components/box3d/box-3d";
import type { Box } from "@/domain/types";
import { useMedia } from "@/lib/use-media";

/** The box page's stage: the box floats, follows the pointer and lifts its lid a crack on hover. */
export function BoxHero({ box }: { box: Box }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const wide = useMedia("(min-width: 768px)");
  const [peek, setPeek] = useState(false);
  return (
    <div
      ref={ref}
      onPointerEnter={(e) => e.pointerType === "mouse" && setPeek(true)}
      onPointerLeave={() => setPeek(false)}
      className="relative grid h-[340px] place-items-center overflow-hidden rounded-[36px] border border-line/70 bg-[var(--card)] md:h-[480px]"
    >
      <div aria-hidden className="absolute inset-x-[8%] bottom-[6%] h-2/3 bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--glow)_42%,transparent),transparent)]" />
      <Box3D material={box.material} width={wide ? 300 : 210} float={inView} tilt open={peek ? 0.16 : 0} />
    </div>
  );
}
