"use client";

import { animate, useReducedMotion, type MotionValue } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { BoxMaterial } from "@/domain/types";
import { cn } from "@/lib/cn";
import { useUi } from "@/store/ui";
import type { ChestScene } from "./chest-scene";
import { STILLS_VERSION } from "./stills-version";

export function chestStill(finish: BoxMaterial) {
  return `/boxes/${finish}-${STILLS_VERSION}.webp`;
}

/**
 * The chest, live in WebGL. First paint is a pre-rendered still of the same model
 * (public/boxes, from scripts/render_box_stills.py); three.js loads afterwards and the live canvas
 * fades in over it. Renders only while on screen, pauses behind the opening overlay, and stays on
 * the still where WebGL is unavailable.
 */
export function Chest({
  finish,
  open = 0,
  float = false,
  tilt = false,
  peek = false,
  shake = false,
  still = false,
  foreground = false,
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
  /** Lift the lid a crack (hover). */
  peek?: boolean;
  shake?: boolean;
  /** Only the image, no WebGL (grids, thumbnails). */
  still?: boolean;
  /** Keeps rendering while the opening overlay is up (the overlay's own chest). */
  foreground?: boolean;
  priority?: boolean;
  sizes?: string;
  label?: string;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const scene = useRef<ChestScene | null>(null);
  const [live, setLive] = useState(false);
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();
  const covered = useUi((s) => s.opening !== null) && !foreground;

  // Build the scene once three.js has loaded; tear it down on unmount.
  useEffect(() => {
    if (still || !canvas.current || !wrap.current) return;
    let disposed = false;
    let ro: ResizeObserver | null = null;
    const el = canvas.current;
    const box = wrap.current;
    import("./chest-scene")
      .then(({ ChestScene }) => {
        if (disposed) return;
        const s = new ChestScene(el, { finish });
        s.onFrame = () => {
          setLive(true);
          s.onFrame = null;
        };
        scene.current = s;
        ro = new ResizeObserver(([entry]) => s.resize(entry.contentRect.width, entry.contentRect.height));
        ro.observe(box);
      })
      .catch(() => {
        // No WebGL (or it failed): the still stays.
      });
    return () => {
      disposed = true;
      ro?.disconnect();
      scene.current?.dispose();
      scene.current = null;
    };
  }, [finish, still]);

  useEffect(() => {
    if (still || !wrap.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "80px" });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, [still]);

  // Run the render loop only when something moves and the chest can be seen.
  const animated = (float && !reduce) || shake || typeof open !== "number";
  useEffect(() => {
    const s = scene.current;
    if (!s) return;
    s.float = float && !reduce;
    s.shake = shake && !reduce;
    if (visible && !covered && animated) s.start();
    else {
      s.stop();
      s.requestRender();
    }
  }, [live, visible, covered, animated, float, shake, reduce]);

  // Lid: follow a MotionValue directly, or ease to a number (peek adds a crack of light).
  useEffect(() => {
    const s = scene.current;
    if (!s) return;
    if (typeof open !== "number") {
      s.open = open.get();
      s.requestRender();
      return open.on("change", (v) => {
        s.open = v;
        s.requestRender();
      });
    }
    const target = Math.max(open, peek ? 0.14 : 0);
    if (reduce) {
      s.open = target;
      s.requestRender();
      return;
    }
    const controls = animate(s.open, target, {
      type: "spring",
      stiffness: 140,
      damping: 18,
      onUpdate: (v) => {
        s.open = v;
        s.requestRender();
      },
    });
    return () => controls.stop();
  }, [open, peek, live, reduce]);

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!tilt || reduce || e.pointerType !== "mouse" || !scene.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    scene.current.setPointer(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
  }

  return (
    <div
      ref={wrap}
      role="img"
      aria-label={label}
      onPointerMove={onPointerMove}
      onPointerLeave={() => scene.current?.setPointer(0, 0)}
      className={cn("relative", className)}
    >
      <Image
        src={chestStill(finish)}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        draggable={false}
        className={cn("object-contain transition-opacity duration-500", live ? "opacity-0" : "opacity-100")}
      />
      {!still && (
        <canvas
          ref={canvas}
          aria-hidden
          className={cn("absolute inset-0 size-full transition-opacity duration-500", live ? "opacity-100" : "opacity-0")}
        />
      )}
    </div>
  );
}
