"use client";

import {
  isMotionValue,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useEffect, useState, type CSSProperties, type PointerEvent } from "react";
import { brand } from "@/config/brand";
import type { BoxMaterial } from "@/domain/types";
import { GoldDust } from "@/components/fx/gold-dust";
import { LogoMark } from "@/components/brand/logo-mark";
import { cn } from "@/lib/cn";
import "./box-3d.css";

const s = {
  stage: "b3d-stage",
  scene: "b3d-scene",
  face: "b3d-face",
  front: "b3d-front",
  back: "b3d-back",
  right: "b3d-right",
  left: "b3d-left",
  bottom: "b3d-bottom",
  inner: "b3d-inner",
  innerBack: "b3d-inner-back",
  innerFront: "b3d-inner-front",
  innerLeft: "b3d-inner-left",
  innerRight: "b3d-inner-right",
  opening: "b3d-opening",
  lid: "b3d-lid",
  lidTop: "b3d-lid-top",
  lidUnder: "b3d-lid-under",
  lidFront: "b3d-lid-front",
  lidBack: "b3d-lid-back",
  lidSide: "b3d-lid-side",
  mono: "b3d-mono",
  monoFoil: "b3d-mono-foil",
  monoInk: "b3d-mono-ink",
  caption: "b3d-caption",
  rule: "b3d-rule",
};

type Num = number | MotionValue<number>;

interface Material {
  front: string;
  side: string;
  top: string;
  dark: string;
  trim: string;
  /** Foil monogram on dark leathers, ink on light ones. */
  ink: "foil" | "navy";
}

export const materials: Record<BoxMaterial, Material> = {
  navy: {
    front: "linear-gradient(165deg,#1d2e68 0%,#0f1c3f 55%,#0a1430 100%)",
    side: "linear-gradient(165deg,#132250 0%,#09122c 100%)",
    top: "linear-gradient(135deg,#2a3f86 0%,#14245a 70%)",
    dark: "#060c22",
    trim: "#c2a46e",
    ink: "foil",
  },
  obsidian: {
    front: "linear-gradient(165deg,#2a2a31 0%,#141418 60%,#0b0b0d 100%)",
    side: "linear-gradient(165deg,#1b1b21 0%,#0a0a0c 100%)",
    top: "linear-gradient(135deg,#33333c 0%,#18181d 70%)",
    dark: "#050506",
    trim: "#c2a46e",
    ink: "foil",
  },
  sapphire: {
    front: "linear-gradient(165deg,#3a5fd0 0%,#1e3a8a 55%,#162c6b 100%)",
    side: "linear-gradient(165deg,#2645a6 0%,#132862 100%)",
    top: "linear-gradient(135deg,#5577e0 0%,#284aa6 70%)",
    dark: "#0b1840",
    trim: "#e3c88f",
    ink: "foil",
  },
  ivory: {
    front: "linear-gradient(165deg,#f6f1e7 0%,#e8e1d6 55%,#d5c9b5 100%)",
    side: "linear-gradient(165deg,#e2d8c7 0%,#c8baa2 100%)",
    top: "linear-gradient(135deg,#fbf7ef 0%,#e9e2d6 70%)",
    dark: "#b9ab92",
    trim: "#b0905a",
    ink: "navy",
  },
  gold: {
    front: "linear-gradient(150deg,#ecd9a8 0%,#c2a46e 45%,#94773f 100%)",
    side: "linear-gradient(165deg,#b7965b 0%,#86693a 100%)",
    top: "linear-gradient(135deg,#f6e8c4 0%,#d0b37b 70%)",
    dark: "#5f4a28",
    trim: "#fff1c9",
    ink: "navy",
  },
};

/** Accepts a number (animated with a spring) or a MotionValue (scroll, etc.). */
function useNum(value: Num, spring = true) {
  const local = useMotionValue(typeof value === "number" ? value : 0);
  useEffect(() => {
    if (typeof value === "number") local.set(value);
  }, [value, local]);
  const source = isMotionValue(value) ? value : local;
  const smoothed = useSpring(source, { stiffness: 85, damping: 15, mass: 0.9 });
  return spring ? smoothed : source;
}

/** One box size per context, so every box in a row (catalog, shelf) and every hero box match. */
export const BOX_WIDTH = { tile: 240, stage: 340 } as const;

export interface Box3DProps {
  material?: BoxMaterial;
  /** Box width in px; height and depth follow the board's proportions. */
  width?: number;
  /** 0 closed → 1 fully open. */
  open?: Num;
  /** Camera angles in degrees. */
  viewX?: Num;
  viewY?: Num;
  tilt?: boolean;
  float?: boolean;
  shake?: boolean;
  /** Light beam and gold dust when open. */
  beam?: boolean;
  className?: string;
}

export function Box3D({
  material = "navy",
  width = 300,
  open = 0,
  viewX = -18,
  viewY = -32,
  tilt = false,
  float = false,
  shake = false,
  beam = true,
  className,
}: Box3DProps) {
  const reduce = useReducedMotion();
  const m = materials[material];
  const h = Math.round(width * 0.62);
  const d = Math.round(width * 0.8);
  const l = Math.round(h * 0.24);
  const o = Math.max(2, Math.round(width * 0.014));

  const openMV = useNum(open);
  const vx = useNum(viewX, false);
  const vy = useNum(viewY, false);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const tx = useSpring(py, { stiffness: 110, damping: 18 });
  const ty = useSpring(px, { stiffness: 110, damping: 18 });
  const rotateX = useTransform(() => vx.get() - tx.get() * 9);
  const rotateY = useTransform(() => vy.get() + ty.get() * 14);

  const lidAngle = useTransform(openMV, [0, 1], [0, 104]);
  const light = useTransform(openMV, [0, 0.25, 1], [0, 0.65, 1]);
  const beamScale = useTransform(openMV, [0, 1], [0.2, 1]);
  // Only mount the gold dust while the lid is open: closed boxes would otherwise run ~22
  // invisible infinite animations each.
  const [lit, setLit] = useState(false);
  useMotionValueEvent(light, "change", (v) => setLit(v > 0.04));

  const vars = {
    "--w": `${width}px`,
    "--h": `${h}px`,
    "--d": `${d}px`,
    "--l": `${l}px`,
    "--o": `${o}px`,
    "--m-front": m.front,
    "--m-side": m.side,
    "--m-top": m.top,
    "--m-dark": m.dark,
    "--trim": m.trim,
  } as CSSProperties;

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!tilt || reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set(((e.clientX - r.left) / r.width) * 2 - 1);
    py.set(((e.clientY - r.top) / r.height) * 2 - 1);
  }

  function onPointerLeave() {
    px.set(0);
    py.set(0);
  }

  const floatAnim = float && !reduce ? { y: [0, -12, 0] } : { y: 0 };
  const shakeAnim = shake && !reduce ? { x: [0, -5, 6, -6, 5, -3, 3, 0] } : { x: 0 };

  return (
    <div
      className={cn(s.stage, className)}
      style={{ ...vars, width: width * 1.6, height: h * 2.6 }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      role="img"
      aria-label="Mystery box"
    >
      {/* Floor shadow */}
      <motion.div
        aria-hidden
        className="absolute rounded-[50%] bg-[radial-gradient(closest-side,var(--floor-shadow),transparent)]"
        style={{ width: width * 1.5, height: h * 0.5, top: "58%" }}
        animate={float && !reduce ? { scale: [1, 0.9, 1], opacity: [0.85, 0.6, 0.85] } : {}}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {beam && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 -translate-x-1/2"
          style={{ opacity: light, width: width * 1.05, height: h * 2.1, bottom: "52%" }}
        >
          <motion.div
            className="absolute inset-0 origin-bottom"
            style={{
              scaleY: beamScale,
              background:
                "radial-gradient(50% 60% at 50% 100%, rgb(255 244 214 / 0.95), rgb(226 196 127 / 0.45) 40%, rgb(61 107 255 / 0.18) 70%, transparent 100%)",
            }}
          />
          {lit && <GoldDust count={18} className="inset-x-[18%] bottom-0 h-full" />}
        </motion.div>
      )}

      <motion.div
        className={s.scene}
        style={{ rotateX, rotateY }}
        animate={{ ...floatAnim, ...shakeAnim }}
        transition={{
          y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
          x: shake ? { duration: 0.45, repeat: Infinity } : { duration: 0.2 },
        }}
      >
        <div className={cn(s.inner, s.innerBack)} />
        <div className={cn(s.inner, s.innerFront)} />
        <div className={cn(s.inner, s.innerLeft)} />
        <div className={cn(s.inner, s.innerRight)} />
        <motion.div className={s.opening} style={{ opacity: light }} />

        <div className={cn(s.face, s.back)} />
        <div className={cn(s.face, s.left)} />
        <div className={cn(s.face, s.bottom)} />
        <div className={cn(s.face, s.right)}>
          <div className="absolute flex flex-col" style={{ top: h * 0.3, left: d * 0.12, gap: h * 0.035 }}>
            {brand.sideline.split(" ").filter(Boolean).map((word) => (
              <span key={word} className={s.caption} style={{ fontSize: Math.max(6, h * 0.055) }}>
                {word}
              </span>
            ))}
            <span className={s.rule} style={{ width: d * 0.14, marginTop: h * 0.03 }} />
          </div>
        </div>
        <div className={cn(s.face, s.front, "grid place-items-center")}>
          <div className="flex flex-col items-center" style={{ marginTop: l * 0.9 }}>
            <span style={{ width: width * 0.36, color: m.ink === "foil" ? undefined : "#0f1c3f" }}>
              <LogoMark tone={m.ink === "foil" ? "foil" : "solid"} sizes="160px" className="w-full drop-shadow-[0_2px_3px_rgb(0_0_0/0.45)]" />
            </span>
            <span className={s.caption} style={{ fontSize: Math.max(6, h * 0.055), marginTop: h * 0.07 }}>
              {brand.name}
            </span>
            <span className={s.rule} style={{ width: width * 0.1, marginTop: h * 0.05 }} />
          </div>
        </div>

        <motion.div className={s.lid} style={{ z: -d / 2 - o, rotateX: lidAngle }}>
          <div className={s.lidUnder} />
          <div className={s.lidTop} />
          <div className={s.lidFront} />
          <div className={s.lidBack} />
          <div className={s.lidSide} style={{ left: -o }} />
          <div className={s.lidSide} style={{ left: width + o }} />
        </motion.div>
      </motion.div>
    </div>
  );
}
