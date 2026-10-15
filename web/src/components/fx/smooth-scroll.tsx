"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { useEffect } from "react";

let instance: Lenis | null = null;

/** Pause/resume page scrolling (modals). No-op when smooth scrolling is off. */
export function lockScroll(locked: boolean) {
  if (locked) instance?.stop();
  else instance?.start();
}

/** Scroll the page to a position in pixels (smoothly when Lenis runs). */
export function scrollToY(top: number, duration = 1.2) {
  if (instance) instance.scrollTo(top, { duration });
  else window.scrollTo({ top, behavior: "smooth" });
}

/** Bring an element into view (smoothly when Lenis runs). */
export function scrollToElement(el: HTMLElement, offset = -120) {
  if (instance) instance.scrollTo(el, { offset, duration: 1.1 });
  else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: "smooth" });
}

/**
 * Inertial wheel scrolling. Scroll-linked scenes (the ritual, the keyhole) scrub smoothly
 * instead of jumping 100px per wheel notch. Off for reduced motion, and on touch screens, where it
 * smooths nothing (touch scrolling stays native) but would still run a loop every frame.
 */
export function SmoothScroll() {
  const reduce = useReducedMotion();
  const pathname = usePathname();

  useEffect(() => {
    if (reduce || !window.matchMedia("(pointer: fine)").matches) return;
    const lenis = new Lenis({ lerp: 0.14, smoothWheel: true, autoRaf: true });
    instance = lenis;
    return () => {
      lenis.destroy();
      instance = null;
    };
  }, [reduce]);

  useEffect(() => {
    instance?.scrollTo(0, { immediate: true });
  }, [pathname]);

  return null;
}
