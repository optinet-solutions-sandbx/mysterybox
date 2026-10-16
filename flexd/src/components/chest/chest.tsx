"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import Image from "next/image";
import { useEffect, useId, useRef, type PointerEvent } from "react";
import type { BoxMaterial } from "@/domain/types";
import { cn } from "@/lib/cn";
import { BOX_ARTS, type BoxArt } from "./box-art";

/** Starts loading the opening screen's code ahead of an opening (call on Buy intent). */
export function preloadChest() {
  void import("@/components/open/open-overlay");
}

type Point = readonly [number, number];
const pct = ([x, y]: Point, dy = 0) => `${(x * 100).toFixed(2)}% ${((y + dy) * 100).toFixed(2)}%`;
const svgPoints = (list: readonly Point[]) => list.map(([x, y]) => `${x * 100},${y * 100}`).join(" ");

/** Where a picture splits into lid and body, and the outline of the open box's mouth. */
function geometry(art: BoxArt) {
  const first = art.seam[0];
  const last = art.seam[art.seam.length - 1];
  return {
    // The lid's edge sits a hair below the seam so the halves overlap and no line shows while closed.
    lidClip: `polygon(0% 0%, 100% 0%, ${pct([1, last[1]], 0.004)}, ${[...art.seam].reverse().map((p) => pct(p, 0.004)).join(", ")}, ${pct([0, first[1]], 0.004)})`,
    bodyClip: `polygon(${pct([0, first[1]])}, ${art.seam.map((p) => pct(p)).join(", ")}, ${pct([1, last[1]])}, 100% 100%, 0% 100%)`,
    seam: svgPoints(art.seam),
    mouth: svgPoints([first, art.back, ...art.seam.slice(1).reverse()]),
    ratio: art.width / art.height,
  };
}
const GEOMETRY = Object.fromEntries(Object.entries(BOX_ARTS).map(([finish, art]) => [finish, geometry(art)])) as Record<
  BoxMaterial,
  ReturnType<typeof geometry>
>;

/**
 * The FLEXD box: the client's own box pictures, one per finish (public/boxes, cut from their
 * screens by scripts/make_box_art.py), with a CSS float and pointer tilt. On the opening screen (`still` off)
 * it opens in 2D: the lid half of the picture lifts along the seam as light spills out, the box
 * shakes, a beam rises from the lid, and the lid lifts away.
 */
export function Chest({
  finish,
  open = 0,
  float = false,
  tilt = false,
  shake = false,
  still = false,
  priority = false,
  sizes = "(min-width: 768px) 420px, 80vw",
  label = "Mystery box",
  className,
}: {
  finish: BoxMaterial;
  /** 0 closed → 1 open. A number eases there; a MotionValue drives the lid directly (swipe). */
  open?: number | MotionValue<number>;
  float?: boolean;
  tilt?: boolean;
  shake?: boolean;
  /** Only the picture, no opening (grids, carousel, box page). */
  still?: boolean;
  priority?: boolean;
  sizes?: string;
  label?: string;
  className?: string;
}) {
  const tiltLayer = useRef<HTMLDivElement>(null);
  // SVG gradient ids go inside url(#…), so keep them to plain characters.
  const id = `box${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const reduce = useReducedMotion();
  const art = BOX_ARTS[finish];
  const g = GEOMETRY[finish];
  const value = useMotionValue(typeof open === "number" ? open : open.get());

  useEffect(() => {
    if (typeof open !== "number") {
      value.set(open.get());
      return open.on("change", (v) => value.set(v));
    }
    if (reduce) {
      value.set(open);
      return;
    }
    const controls = animate(value, open, { type: "spring", stiffness: 140, damping: 18 });
    return () => controls.stop();
  }, [open, reduce, value]);

  const lidY = useTransform(value, [0, 0.6, 1], ["0%", "-8%", "-34%"]);
  const lidRotate = useTransform(value, [0, 0.6, 1], [0, -1.5, -6]);
  const lidOpacity = useTransform(value, [0, 0.72, 1], [1, 1, 0]);
  const seamLight = useTransform(value, [0, 0.06, 1], [0, 0.75, 1]);
  const seamWidth = useTransform(value, [0, 0.6, 1], [8, 34, 40]);
  const mouthLight = useTransform(value, [0, 0.3, 1], [0.15, 0.45, 0.85]);
  const seamCore = useTransform(seamWidth, (w) => w * 0.4);
  const beamOpacity = useTransform(value, [0, 0.25, 1], [0, 0.45, 1]);
  const beamScale = useTransform(value, [0, 1], [0.15, 1]);
  const bodyLight = useTransform(value, [0, 1], [0, 0.35]);

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!tilt || reduce || e.pointerType !== "mouse" || !tiltLayer.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = ((e.clientY - r.top) / r.height) * 2 - 1;
    tiltLayer.current.style.transform = `perspective(900px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg)`;
  }

  function onPointerLeave() {
    if (tiltLayer.current) tiltLayer.current.style.transform = "";
  }

  const picture = (clip?: string) => (
    <Image
      src={art.src}
      alt=""
      fill
      sizes={sizes}
      {...(priority ? { loading: "eager" as const, fetchPriority: "high" as const } : {})}
      draggable={false}
      className="object-contain"
      style={clip ? { clipPath: clip } : undefined}
    />
  );

  return (
    <div
      role="img"
      aria-label={label}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={cn("relative [container-type:size]", className)}
    >
      <div ref={tiltLayer} className="absolute inset-0 transition-transform duration-500 ease-snap">
        {/* The picture's own frame, as large as fits: the seam and light are placed in its fractions. */}
        <div
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            float && !reduce && "animate-float",
          )}
          style={{ width: `min(100cqw, calc(100cqh * ${g.ratio.toFixed(4)}))`, aspectRatio: `${art.width} / ${art.height}` }}
        >
          {still ? (
            picture()
          ) : (
            <div className={cn("absolute inset-0", shake && !reduce && "animate-shake")}>
              {picture(g.bodyClip)}
              <motion.div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_45%,var(--velvet-100),transparent_70%)]" style={{ opacity: bodyLight, clipPath: g.bodyClip }} />
              {/* Inside the box, under the lid: dark velvet lit from within. */}
              <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
                <defs>
                  <linearGradient id={`${id}-velvet`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" style={{ stopColor: "var(--velvet-900)" }} />
                    <stop offset="1" style={{ stopColor: "var(--velvet-700)" }} />
                  </linearGradient>
                  <radialGradient id={`${id}-light`} cx="0.5" cy="0.62" r="0.5">
                    <stop offset="0" style={{ stopColor: "var(--ivory-white)" }} />
                    <stop offset="0.35" style={{ stopColor: "var(--velvet-100)", stopOpacity: 0.75 }} />
                    <stop offset="1" style={{ stopColor: "var(--velvet-300)", stopOpacity: 0 }} />
                  </radialGradient>
                </defs>
                <polygon points={g.mouth} fill={`url(#${id}-velvet)`} />
                <motion.polygon points={g.mouth} fill={`url(#${id}-light)`} style={{ opacity: mouthLight }} />
              </svg>
              {/* Light from inside, along the seam: it fills the gap as the lid lifts. */}
              <motion.svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" style={{ opacity: seamLight }}>
                <clipPath id={`${id}-mouth`}>
                  <polygon points={g.mouth} />
                </clipPath>
                {/* The wide glow stays inside the box; only the thin rim line runs along the seam. */}
                <g clipPath={`url(#${id}-mouth)`}>
                  <motion.polyline points={g.seam} fill="none" stroke="var(--velvet-300)" strokeOpacity={0.45} strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ strokeWidth: seamWidth }} />
                  <motion.polyline points={g.seam} fill="none" stroke="var(--velvet-100)" strokeOpacity={0.7} strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ strokeWidth: seamCore }} />
                </g>
                <polyline points={g.seam} fill="none" stroke="var(--ivory-white)" strokeLinejoin="round" vectorEffect="non-scaling-stroke" strokeWidth={2} />
              </motion.svg>
              <motion.div
                aria-hidden
                className="absolute h-[170%] w-[80%] origin-bottom -translate-x-1/2 -translate-y-full bg-[radial-gradient(50%_100%_at_50%_100%,var(--ivory-white),color-mix(in_oklab,var(--velvet-100)_70%,transparent)_30%,transparent_72%)]"
                style={{ left: `${art.lid[0] * 100}%`, top: `${(art.lid[1] + 0.18) * 100}%`, opacity: beamOpacity, scaleY: beamScale }}
              />
              <motion.div className="absolute inset-0 origin-[60%_30%]" style={{ y: lidY, rotate: lidRotate, opacity: lidOpacity }}>
                {picture(g.lidClip)}
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
