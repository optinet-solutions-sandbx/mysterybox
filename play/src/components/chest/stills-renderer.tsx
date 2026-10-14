"use client";

import { useEffect, useRef } from "react";
import type { BoxMaterial } from "@/domain/types";

const FINISHES: BoxMaterial[] = ["ivory", "navy", "sapphire", "obsidian", "gold", "plum"];
const SIZE = 1100;

declare global {
  interface Window {
    __stills?: Record<string, string>;
    __stillsReady?: boolean;
  }
}

/** Renders every finish at rest into a transparent PNG and exposes them on window for the script. */
export function StillsRenderer() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    void import("./chest-scene").then(async ({ ChestScene }) => {
      const out: Record<string, string> = {};
      for (const finish of FINISHES) {
        const canvas = document.createElement("canvas");
        canvas.style.width = canvas.style.height = `${SIZE}px`;
        host.current?.appendChild(canvas);
        const scene = new ChestScene(canvas, { finish, capture: true });
        // ?open=0.6 previews the open lid (for checking the model; the saved stills are closed).
        scene.open = Number(new URLSearchParams(window.location.search).get("open") ?? 0);
        scene.renderer.setPixelRatio(1);
        scene.resize(SIZE, SIZE);
        await Promise.race([scene.ready, new Promise((r) => setTimeout(r, 8000))]);
        await new Promise((r) => setTimeout(r, 200));
        scene.requestRender();
        out[finish] = canvas.toDataURL("image/png");
        scene.dispose();
        if (cancelled) return;
      }
      window.__stills = out;
      window.__stillsReady = true;
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return <div ref={host} className="flex flex-wrap gap-4 bg-bg p-4" />;
}
