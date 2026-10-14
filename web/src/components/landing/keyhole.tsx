"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { brand } from "@/config/brand";
import { ButtonLink } from "@/components/ui/button";
import { GoldDust } from "@/components/fx/gold-dust";
import { LOGO_SRC, logoHeightAt } from "@/components/brand/logo-mark";

/** One outline: a r=40 circle at (800, 488) flowing into a flared slot down to y=620. */
const KEYHOLE = "M782 523.7 A40 40 0 1 1 818 523.7 L840 620 L760 620 Z";

/**
 * Finale: the lid of the box fills the screen; scrolling pushes the camera through its keyhole
 * into the lit interior, where the call to action waits.
 */
export function Keyhole() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const scale = useTransform(p, [0.05, 0.72], [1, 42], { ease: (t) => t * t * t });
  const doorOpacity = useTransform(p, [0.68, 0.78], [1, 0]);
  const hint = useTransform(p, [0, 0.12], [1, 0]);
  const ctaOpacity = useTransform(p, [0.55, 0.78], [0, 1]);
  const ctaScale = useTransform(p, [0.55, 0.85], [0.82, 1]);

  const glow = (
    <>
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_55%,rgb(255_240_205/0.3),var(--aurora-b)_45%,var(--bg)_88%)]" />
      <GoldDust count={40} className="inset-0" />
    </>
  );
  const message = (
    <div className="relative">
      <h2 className="font-display text-5xl leading-[0.95] text-foil sm:text-8xl">
        What’s in
        <br />
        yours?
      </h2>
      <p className="mx-auto mt-6 max-w-md text-lg text-muted">{brand.descriptor}</p>
      <ButtonLink href="/boxes" size="lg" className="mt-9">
        Choose your box
      </ButtonLink>
    </div>
  );

  if (reduce)
    return (
      <section className="relative grid h-[80svh] place-items-center overflow-hidden px-6 text-center">
        {glow}
        {message}
      </section>
    );

  return (
    <section ref={ref} className="relative h-[300vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* The lit interior is always there, so light shows through the keyhole from the start. */}
        {glow}
        <motion.div className="absolute inset-0 grid place-items-center px-6 text-center" style={{ opacity: ctaOpacity, scale: ctaScale }}>
          {message}
        </motion.div>

        <motion.div className="pointer-events-none absolute inset-0" style={{ scale, opacity: doorOpacity, transformOrigin: "50% 53%" }}>
          <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
            <defs>
              <linearGradient id="kh-leather" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#1d2e68" />
                <stop offset="0.6" stopColor="#0f1c3f" />
                <stop offset="1" stopColor="#081028" />
              </linearGradient>
              <linearGradient id="kh-foil" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#8a6d3f" />
                <stop offset="0.35" stopColor="#efdcae" />
                <stop offset="0.55" stopColor="#c2a46e" />
                <stop offset="0.8" stopColor="#f5e7c3" />
                <stop offset="1" stopColor="#a7884d" />
              </linearGradient>
              <mask id="kh-mask">
                <rect width="1600" height="1000" fill="white" />
                <path d={KEYHOLE} fill="black" />
              </mask>
            </defs>
            <rect width="1600" height="1000" fill="url(#kh-leather)" mask="url(#kh-mask)" />
            <rect x="40" y="40" width="1520" height="920" fill="none" stroke="url(#kh-foil)" strokeOpacity="0.5" strokeWidth="1.5" mask="url(#kh-mask)" />
            <path d={KEYHOLE} fill="none" stroke="url(#kh-foil)" strokeWidth="3" />
            <ellipse cx="800" cy="535" rx="92" ry="128" fill="none" stroke="url(#kh-foil)" strokeWidth="2" mask="url(#kh-mask)" />
            <image href={LOGO_SRC} x="650" y={Math.round(220 - logoHeightAt(300) / 2)} width="300" height={logoHeightAt(300)} />
            <text x="800" y="370" textAnchor="middle" fill="#c2a46e" style={{ font: "400 20px var(--font-body)", letterSpacing: "0.4em" }}>
              {brand.tagline.toUpperCase()}
            </text>
          </svg>
        </motion.div>

        <motion.p style={{ opacity: hint }} className="absolute inset-x-0 bottom-10 text-center text-sm text-muted">
          Scroll to look inside
        </motion.p>
      </div>
    </section>
  );
}
