"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect } from "react";
import { brand } from "@/config/brand";
import { LogoMark } from "@/components/brand/logo-mark";
import { button } from "@/components/ui/button";
import { useMounted } from "@/components/ui/sheet";
import { confirmAge, rememberReferral, sweepVaults, useApp, useHydrated } from "@/store/app";
import { clearToast, useUi } from "@/store/ui";

/** Reads this browser's accounts, remembers a referral code from the link, and sells expired vault pieces. */
export function AppHydrator() {
  useEffect(() => {
    let alive = true;
    void Promise.resolve(useApp.persist.rehydrate()).then(() => {
      if (!alive) return;
      rememberReferral(new URLSearchParams(window.location.search).get("ref"));
      sweepVaults();
    });
    // Once the page is idle, fetch the opening screen's code (not three.js) so the first tap on
    // Buy opens instantly.
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    idle(() => void import("@/components/open/open-overlay"));
    const timer = setInterval(() => sweepVaults(), 30_000);
    // A slow device can take longer than the browser allows for a screen transition; the page
    // still changes, only the slide is skipped, so that abort isn't an error worth surfacing.
    const quietAbort = (e: PromiseRejectionEvent) => {
      if (e.reason instanceof DOMException && /Transition was aborted/.test(e.reason.message)) e.preventDefault();
    };
    window.addEventListener("unhandledrejection", quietAbort);
    // Development only: lets the frame-capture scripts stage a reveal of any rarity.
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __playUi: useUi });
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("unhandledrejection", quietAbort);
    };
  }, []);
  return null;
}

export function PrototypeBanner() {
  return (
    <p className="relative z-50 bg-surface-2 px-4 py-1.5 text-center text-xs text-muted">
      Prototype: no real money. Accounts stay in this browser.
    </p>
  );
}

/** Adults only: shown once per browser before anything else. */
export function AgeGate() {
  const hydrated = useHydrated();
  const ageOk = useApp((s) => s.ageOk);
  if (!hydrated || ageOk) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="age-title" className="fixed inset-0 z-[90] grid place-items-center bg-bg bg-[radial-gradient(60%_50%_at_50%_30%,color-mix(in_oklab,var(--primary)_30%,transparent),transparent_70%)] px-6">
      <div className="w-full max-w-sm text-center">
        <LogoMark className="mx-auto w-28" sizes="112px" />
        <h1 id="age-title" className="mt-8 font-punch text-4xl">
          Are you {brand.minimumAge} or older?
        </h1>
        <p className="mt-3 text-muted">
          Opening a box is a purchase with a random result, so {brand.name} is for adults in the {brand.market} only.
        </p>
        <div className="mt-8 grid gap-3">
          <button type="button" onClick={confirmAge} className={button({ size: "lg" })}>
            I&apos;m {brand.minimumAge} or older
          </button>
          <a href="https://www.google.com" className={button({ variant: "outline", size: "lg" })}>
            Leave
          </a>
        </div>
      </div>
    </div>
  );
}

export function Toast() {
  const toast = useUi((s) => s.toast);
  const mounted = useMounted();
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => clearToast(toast.id), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  if (!mounted) return null;
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[calc(4.75rem+env(safe-area-inset-top))] z-[80] flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.p
            key={toast.id}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-md rounded-pill border border-line bg-surface-2 px-5 py-3 text-center text-sm font-medium shadow-[0_16px_40px_-16px_var(--shadow-strong)]"
          >
            {toast.text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line/60">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 md:grid-cols-[1fr_2fr] md:px-8">
        <div className="flex items-center gap-3">
          <LogoMark className="w-12" sizes="48px" />
          <span className="font-display tracking-[0.14em]">{brand.name}</span>
        </div>
        <div className="space-y-3 text-sm text-muted">
          <p>
            For adults {brand.minimumAge}+ in the {brand.market}. Every box shows its odds and value range before you buy.
            Most openings return a piece worth less than the box price, so only spend what you are happy to spend.
          </p>
          <p>
            Prototype: no real money moves, payments are simulated and accounts stay in this browser. Product photos are
            placeholders until licensed photography arrives.
          </p>
          <p className="flex flex-wrap gap-x-5 gap-y-2 text-fg">
            <Link href="/help" className="hover:text-accent">
              Help
            </Link>
            <Link href="/showroom" className="hover:text-accent">
              Showroom
            </Link>
            <a href={`mailto:${brand.supportEmail}`} className="hover:text-accent">
              {brand.supportEmail}
            </a>
          </p>
          <p className="text-subtle">{brand.legalEntity}</p>
        </div>
      </div>
    </footer>
  );
}
