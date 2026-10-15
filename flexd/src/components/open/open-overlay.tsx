"use client";

import { ChevronUp, Share, X } from "lucide-react";
import Link from "next/link";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { economy } from "@/config/economy";
import { Chest } from "@/components/chest/chest";
import { CountUp } from "@/components/fx/count-up";
import { GoldDust } from "@/components/fx/gold-dust";
import { PiecePhoto } from "@/components/item/item-art";
import { RarityChip } from "@/components/item/rarity-tag";
import { SoundToggle } from "@/components/shell/sound-toggle";
import { button } from "@/components/ui/button";
import { useMounted } from "@/components/ui/sheet";
import { formatUsd } from "@/domain/money";
import { sellBackValue } from "@/domain/odds";
import { HAPTIC, haptic, sfx } from "@/lib/sound";
import { useMedia } from "@/lib/use-media";
import { sellPull, type Pull } from "@/store/app";
import { buyBox, closeOpening } from "@/store/flows";
import { toast, useUi } from "@/store/ui";
import { boxBySlug, getItem } from "@/services/catalog";
import { ShareSheet } from "./share-sheet";
import { SwipeToSell } from "./swipe-to-sell";

const EASE = [0.22, 1, 0.36, 1] as const;
/** How long the lid's light holds before the piece comes out. */
const OPENING_MS = 900;

/** Full-screen opening: swipe the lid open, then meet the piece and decide. */
export function OpenOverlay() {
  const opening = useUi((s) => s.opening);
  const mounted = useMounted();
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>{opening && <OpenScene key={opening.pull.id} slug={opening.slug} pull={opening.pull} />}</AnimatePresence>,
    document.body,
  );
}

type Phase = "sealed" | "opening" | "reveal";

function OpenScene({ slug, pull }: { slug: string; pull: Pull }) {
  const box = boxBySlug(slug)!;
  const item = getItem(pull.itemId);
  const reduce = useReducedMotion();
  const wide = useMedia("(min-width: 768px)");
  const [phase, setPhase] = useState<Phase>("sealed");
  const [outcome, setOutcome] = useState<"kept" | "sold" | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  // Dragging up lifts the lid with the finger, notch by notch; past half-way it opens on its own.
  const drag = useMotionValue(0);
  const progress = useTransform(drag, [0, -190], [0, 1], { clamp: true });
  const lid = useMotionValue(0);
  const lift = useTransform(drag, (v) => Math.max(-36, v * 0.2));
  const notch = useRef(0);
  useMotionValueEvent(progress, "change", (v) => {
    if (phase !== "sealed") return;
    lid.set(v * 0.6);
    const step = Math.floor(v * 4);
    if (step > notch.current) {
      sfx.notch(step);
      haptic(HAPTIC.tick);
    }
    notch.current = step;
  });

  const offer = sellBackValue(item.value);
  const tone = { "--tone": `var(--rarity-${pull.rarity})` } as CSSProperties;
  const bigPull = pull.rarity === "epic" || pull.rarity === "grail";

  function commit() {
    if (phase !== "sealed") return;
    sfx.open();
    haptic(HAPTIC.open);
    if (reduce) {
      lid.set(1);
      reveal();
      return;
    }
    void animate(lid, 1, { type: "spring", stiffness: 110, damping: 15 });
    setPhase("opening");
  }

  function reveal() {
    setPhase("reveal");
    sfx.reveal(pull.rarity);
    haptic(HAPTIC.reveal[pull.rarity]);
  }

  useEffect(() => {
    if (phase !== "opening") return;
    const t = setTimeout(() => {
      setPhase("reveal");
      sfx.reveal(pull.rarity);
      haptic(HAPTIC.reveal[pull.rarity]);
    }, OPENING_MS);
    return () => clearTimeout(t);
  }, [phase, pull.rarity]);

  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !shareOpen) closeOpening();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = before;
      window.removeEventListener("keydown", onKey);
    };
  }, [shareOpen]);

  function sell() {
    const paid = sellPull(pull.id);
    sfx.sell();
    haptic(HAPTIC.sell);
    setOutcome("sold");
    toast(`Sold. ${formatUsd(paid)} is in your withdrawable balance.`);
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Opening ${box.name}`}
      data-theme="dark"
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-bg text-fg"
      style={tone}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={() => phase === "opening" && reveal()}
    >
      {/* Velvet room light while sealed. */}
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_42%,color-mix(in_oklab,var(--glow)_34%,transparent),transparent_75%)]" />
      {/* Reveal: the whole screen floods with the piece's rarity colour, fading to black under the text. */}
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 38% at 50% 33%, color-mix(in oklab, var(--tone) 60%, var(--fg)) 0%, transparent 70%), linear-gradient(180deg, color-mix(in oklab, var(--tone) 82%, var(--obsidian)) 0%, color-mix(in oklab, var(--tone) 52%, var(--obsidian)) 40%, color-mix(in oklab, var(--tone) 14%, var(--bg)) 68%, var(--bg) 92%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "reveal" ? 1 : 0 }}
        transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
      />
      {/* A white flash on the cut for the bigger tiers. */}
      {phase === "reveal" && !reduce && pull.rarity !== "common" && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 bg-fg"
          initial={{ opacity: bigPull ? 0.9 : 0.45 }}
          animate={{ opacity: 0 }}
          transition={{ duration: bigPull ? 0.7 : 0.45, ease: "easeOut" }}
        />
      )}

      <div className="relative z-10 flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-8">
        <button
          type="button"
          onClick={closeOpening}
          aria-label={phase === "reveal" && !outcome ? "Close and keep the piece" : "Close"}
          className="grid size-11 place-items-center rounded-full bg-bg/45 text-fg"
        >
          <X className="size-5" />
        </button>
        <p className="text-sm font-bold tracking-[0.18em] text-fg/80 uppercase">{box.name}</p>
        <span className="flex items-center gap-2">
          <SoundToggle className="bg-bg/45 text-fg hover:text-fg" />
          {phase === "reveal" && (
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              aria-label="Share this pull"
              className="grid size-10 place-items-center rounded-full bg-fg text-bg"
            >
              <Share className="size-5" />
            </button>
          )}
        </span>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="relative grid flex-1 place-items-center">
          {/* Light pours out behind the box as the lid goes up. */}
          <AnimatePresence>
            {phase === "opening" && !reduce && (
              <motion.div
                key="bloom"
                aria-hidden
                className="pointer-events-none absolute inset-0"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.4 } }}
              >
                {/* Centred by position, not grid alignment: the bloom is larger than its box. */}
                <motion.div
                  className="absolute top-[40%] left-1/2 size-[130vmin] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--dust)_90%,transparent),color-mix(in_oklab,var(--gold)_38%,transparent)_32%,transparent_70%)]"
                  style={{ x: "-50%", y: "-50%" }}
                  initial={{ scale: 0.05, opacity: 0 }}
                  animate={{ scale: 1, opacity: [0, 1, 0.85] }}
                  transition={{ duration: OPENING_MS / 1000, ease: EASE }}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence mode="popLayout">
            {phase !== "reveal" ? (
              <motion.div
                key="box"
                className="relative"
                style={{ y: lift, touchAction: "none" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.25, transition: { duration: 0.22, ease: EASE } }}
                onPan={(_, info) => phase === "sealed" && drag.set(Math.min(0, info.offset.y))}
                onPanEnd={(_, info) => {
                  if (phase !== "sealed") return;
                  if (progress.get() > 0.45 || info.velocity.y < -500) commit();
                  else {
                    notch.current = 0;
                    void animate(drag, 0, { type: "spring", stiffness: 420, damping: 32 });
                  }
                }}
              >
                <Chest
                  open={lid}
                  shake={phase === "opening"}
                  priority
                  sizes="(min-width: 768px) 460px, 92vw"
                  className={wide ? "h-[420px] w-[480px]" : "h-[340px] w-[min(92vw,380px)]"}
                />
              </motion.div>
            ) : (
              <motion.div
                key="piece"
                className="relative w-[min(80vw,400px)]"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 70, scale: 0.4, rotate: -6 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 230, damping: 17, mass: 0.8 }}
              >
                {bigPull && !reduce && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-[8%] rounded-full border-2 border-fg/80"
                    initial={{ scale: 0.4, opacity: 0.9 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    transition={{ duration: 0.9, ease: EASE }}
                  />
                )}
                {pull.rarity !== "common" && !reduce && <GoldDust count={bigPull ? 28 : 14} className="inset-x-[8%] bottom-[8%] h-[92%]" />}
                <PiecePhoto item={item} sizes="(min-width: 768px) 400px, 80vw" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {phase !== "reveal" ? (
          <SealedControls phase={phase} onOpen={commit} />
        ) : (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: reduce ? 0 : 0.2, ease: EASE }}
          >
            <div className="flex items-center gap-2">
              <RarityChip rarity={pull.rarity} />
              <span className="inline-flex h-7 items-center rounded-lg bg-fg/15 px-2.5 text-xs font-bold tracking-wide text-fg">{item.brand}</span>
            </div>
            <h2 className="mt-3 text-[26px] leading-tight font-extrabold tracking-[-0.01em] text-fg md:text-3xl">{item.name}</h2>
            <p className="mt-1 font-price text-4xl font-bold text-accent">
              <CountUp to={item.value} format="usd" auto duration={0.9} />
            </p>

            <div className="mt-6">
              {outcome === null ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      sfx.tap();
                      setOutcome("kept");
                    }}
                    className={button({ variant: "solid", size: "lg", className: "w-full" })}
                  >
                    Keep it
                  </button>
                  <SwipeToSell offer={offer} onSell={sell} />
                </div>
              ) : (
                <AfterChoice outcome={outcome} offer={offer} slug={slug} price={box.price} />
              )}
            </div>
          </motion.div>
        )}
      </div>

      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} pull={pull} boxSlug={slug} />
    </motion.div>
  );
}

function SealedControls({ phase, onOpen }: { phase: Phase; onOpen: () => void }) {
  const reduce = useReducedMotion();
  return (
    <div className="pb-4 text-center" aria-live="polite">
      {phase === "sealed" ? (
        <>
          <div aria-hidden className="flex flex-col items-center text-hot">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="-my-2"
                animate={reduce ? undefined : { opacity: [0.15, 1, 0.15], y: [4, -2, 4] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: (2 - i) * 0.16, ease: "easeInOut" }}
              >
                <ChevronUp className="size-7" strokeWidth={2.6} />
              </motion.span>
            ))}
          </div>
          <p className="mt-3 text-xl font-extrabold tracking-[0.04em] uppercase">Swipe up to open</p>
          <button type="button" onClick={onOpen} className={button({ variant: "ghost", size: "sm", className: "mt-1 underline underline-offset-4" })}>
            or tap to open
          </button>
        </>
      ) : (
        <p className="text-sm font-bold tracking-[0.18em] text-muted uppercase">Tap to skip</p>
      )}
    </div>
  );
}

function AfterChoice({ outcome, offer, slug, price }: { outcome: "kept" | "sold"; offer: number; slug: string; price: number }) {
  return (
    <div className="space-y-3">
      <p className="rounded-2xl bg-fg/10 px-4 py-3 text-sm text-fg/85">
        {outcome === "kept"
          ? `It's in your vault. Ship it from Collection within ${economy.vaultDays} days, or it sells back for ${formatUsd(offer)}.`
          : `${formatUsd(offer)} went to your withdrawable balance. Cash it out or spend it on your next box.`}
      </p>
      <button type="button" onClick={() => void buyBox(slug)} className={button({ size: "lg", className: "w-full" })}>
        Open another for {formatUsd(price)}
      </button>
      <Link href={outcome === "kept" ? "/collection" : "/wallet"} onClick={closeOpening} className={button({ variant: "outline", size: "lg", className: "w-full" })}>
        {outcome === "kept" ? "Go to your vault" : "Go to your wallet"}
      </Link>
    </div>
  );
}
