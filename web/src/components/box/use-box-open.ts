"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { boxApi, BoxApiError, type OpenCommitted, type OpenResolved, type PayMethod } from "@/box-api";
import { formatCredit } from "@/domain/money";
import { useSession } from "@/store/session";
import { prepareOpen, runOpen } from "./open-flow";

/**
 * idle → ready (seal shown) → working (seed, pay, spin) → shaking → rising → result → ready.
 * Nothing moves until the spin response is in, and the reveal always ends on that outcome.
 */
export type OpenPhase = "idle" | "ready" | "working" | "shaking" | "rising" | "result" | "error";

export interface Notice {
  tone: "error" | "ok";
  text: string;
  topUp?: boolean;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function messageFor(e: unknown): Notice {
  if (e instanceof BoxApiError) {
    if (e.status === 402 && e.code === "insufficient_credit") return { tone: "error", text: "Not enough site credit for this box. Pay with the demo balance instead." };
    if (e.status === 402) return { tone: "error", text: "Not enough demo balance. Top up or pay with site credit.", topUp: true };
    if (e.status === 409 && e.code === "expired") return { tone: "error", text: "This open expired before payment. A new one is ready." };
    if (e.status === 401) return { tone: "error", text: "Sign in to open this box." };
  }
  return { tone: "error", text: "Something went wrong. Your open is safe: try again." };
}

export function useBoxOpen(slug: string, { enabled, quick }: { enabled: boolean; quick: boolean }) {
  const reduce = useReducedMotion();
  const setPendingOpen = useSession((s) => s.setPendingOpen);
  const seed = useSession((s) => s.preferredClientSeed);
  const setSeed = useSession((s) => s.setPreferredClientSeed);
  const credit = useSession((s) => s.boxApi.ledger.reduce((sum, e) => sum + e.delta, 0));
  const [phase, setPhase] = useState<OpenPhase>("idle");
  const [open, setOpen] = useState<OpenCommitted | null>(null);
  const [result, setResult] = useState<OpenResolved | null>(null);
  const [history, setHistory] = useState<OpenResolved[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  const remember = useCallback((r: OpenResolved) => setHistory((h) => (h.some((x) => x.openId === r.openId) ? h : [...h, r])), []);

  /** Shows the open that is waiting (or resumes one interrupted by a reload). State changes only after an await. */
  const prepare = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      try {
        const p = await prepareOpen(boxApi, slug, useSession.getState().pendingOpens[slug]);
        if (isCancelled()) return;
        if (p.kind === "ready") {
          setPendingOpen(slug, p.pending);
          setOpen(p.open);
          setPhase("ready");
          if (p.notice) setNotice({ tone: "error", text: p.notice });
        } else {
          setResult(p.result);
          remember(p.result);
          setPhase("result");
        }
      } catch (e) {
        if (isCancelled()) return;
        setNotice(messageFor(e));
        setPhase("error");
      }
    },
    [slug, setPendingOpen, remember],
  );

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    // Started from a callback: every state change comes from the async result, never from the effect body.
    void Promise.resolve().then(() => prepare(() => cancelled));
    return () => {
      cancelled = true;
    };
  }, [enabled, prepare]);

  const start = useCallback(
    async (method: PayMethod) => {
      const pending = useSession.getState().pendingOpens[slug];
      if (!pending || running.current) return;
      running.current = true;
      setBusy(true);
      setNotice(null);
      setPhase("working");
      try {
        const r = await runOpen(boxApi, {
          pending,
          seed: useSession.getState().preferredClientSeed.trim(),
          method,
          newKey: () => crypto.randomUUID(),
          savePending: (p) => setPendingOpen(slug, p),
        });
        setResult(r);
        remember(r);
        setPhase("shaking");
        await wait(reduce ? 0 : quick ? 250 : 800);
        setPhase("rising");
        await wait(reduce ? 0 : quick ? 450 : 1100);
        setPhase("result");
      } catch (e) {
        setNotice(messageFor(e));
        if (e instanceof BoxApiError && (e.status === 404 || (e.status === 409 && e.code === "expired"))) {
          setPendingOpen(slug, null);
          await prepare();
        } else {
          setPhase("ready");
        }
      } finally {
        running.current = false;
        setBusy(false);
      }
    },
    [slug, quick, reduce, setPendingOpen, remember, prepare],
  );

  /** Closes the result and prepares the next open (a new seal). */
  const next = useCallback(async () => {
    setPhase("idle");
    setResult(null);
    setPendingOpen(slug, null);
    await prepare();
  }, [slug, setPendingOpen, prepare]);

  const openAgain = useCallback(
    async (method: PayMethod) => {
      await next();
      await start(method);
    },
    [next, start],
  );

  const tradeIn = useCallback(
    async (awardId: string) => {
      setBusy(true);
      try {
        const r = await boxApi.tradeIn(awardId);
        setNotice({ tone: "ok", text: `Traded in for ${formatCredit(r.credits)}. Site credit buys boxes and can't be withdrawn.` });
      } catch (e) {
        setNotice(messageFor(e));
      } finally {
        setBusy(false);
      }
      await next();
    },
    [next],
  );

  const ship = useCallback(
    async (awardId: string, label: string) => {
      // Stub: there is no shipping endpoint in the backend's contract yet; this reuses the demo shipping request.
      useSession.getState().requestShipping(awardId);
      setNotice({ tone: "ok", text: `Shipping requested for ${label}. Demo only: nothing ships.` });
      await next();
    },
    [next],
  );

  const keep = useCallback(
    async (label: string) => {
      setNotice({ tone: "ok", text: `${label} is in your inventory.` });
      await next();
    },
    [next],
  );

  return { phase, open, result, history, notice, busy, seed, setSeed, credit, start, next, openAgain, tradeIn, ship, keep };
}
