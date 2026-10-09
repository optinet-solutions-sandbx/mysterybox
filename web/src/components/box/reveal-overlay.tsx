"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, type CSSProperties } from "react";
import type { ResolvedEntry } from "@/domain/types";
import { formatUsd } from "@/domain/money";
import { sellBackValue } from "@/domain/odds";
import { economy } from "@/config/economy";
import { Button } from "@/components/ui/button";
import { useDialog } from "@/components/ui/modal";
import { CountUp } from "@/components/fx/count-up";
import { ItemArt } from "@/components/item/item-art";

const rarityLabel = { common: "Common", uncommon: "Uncommon", rare: "Rare", epic: "Epic", legendary: "Legendary" } as const;
const BURST = 28;

/**
 * Full-screen reveal: rays turn behind the piece in its rarity colour, a burst of light, the
 * plate turns to face you and the value counts up. Bigger rarities get a flash.
 */
export function RevealOverlay({
  entry,
  open,
  onKeep,
  onSell,
  onOpenAgain,
  openAgainLabel,
}: {
  entry: ResolvedEntry | null;
  open: boolean;
  onKeep: () => void;
  onSell: () => void;
  onOpenAgain: () => void;
  openAgainLabel: string;
}) {
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  useDialog(open, onKeep, panel);
  const big = entry?.rarity === "legendary" || entry?.rarity === "epic";

  return (
    <AnimatePresence>
      {open && entry && (
        <motion.div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reveal-title"
          tabIndex={-1}
          className="fixed inset-0 z-[80] grid place-items-center overflow-hidden px-4 outline-none"
          style={{ "--tone": `var(--rarity-${entry.rarity})` } as CSSProperties}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
        >
          <div aria-hidden className="absolute inset-0 bg-bg/92 backdrop-blur-md" onClick={onKeep} />

          {!reduce && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-1/2 size-[170vmax] -translate-x-1/2 -translate-y-1/2 [mask-image:radial-gradient(closest-side,black,transparent_70%)]"
              style={{
                background:
                  "repeating-conic-gradient(from 0deg, color-mix(in oklab, var(--tone) 22%, transparent) 0deg 5deg, transparent 5deg 18deg)",
              }}
              initial={{ opacity: 0, scale: 0.6, rotate: 0 }}
              animate={{ opacity: 1, scale: 1, rotate: 360 }}
              transition={{ opacity: { duration: 0.8 }, scale: { duration: 1.2, ease: [0.22, 1, 0.36, 1] }, rotate: { duration: 60, repeat: Infinity, ease: "linear" } }}
            />
          )}
          <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 size-[90vmin] -translate-x-1/2 -translate-y-1/2" style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--tone) 34%, transparent), transparent)" }} />

          {!reduce && big && (
            <motion.div aria-hidden className="pointer-events-none absolute inset-0 bg-[#fff6dc]" initial={{ opacity: 0.85 }} animate={{ opacity: 0 }} transition={{ duration: 0.9, ease: "easeOut" }} />
          )}

          {!reduce &&
            Array.from({ length: BURST }, (_, i) => {
              const a = (i / BURST) * Math.PI * 2;
              const r = 180 + (i % 5) * 45;
              return (
                <motion.span
                  key={i}
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-1/2 size-1.5 rounded-full"
                  style={{ background: "var(--tone)", boxShadow: "0 0 12px 2px var(--tone)" }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: Math.cos(a) * r, y: Math.sin(a) * r, opacity: 0, scale: 0.3 }}
                  transition={{ duration: 1.1 + (i % 3) * 0.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                />
              );
            })}

          <div className="relative flex w-full max-w-md flex-col items-center text-center">
            <motion.p
              className="font-display text-sm tracking-[0.3em]"
              style={{ color: "var(--tone)" }}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              {rarityLabel[entry.rarity]}
            </motion.p>

            <motion.div
              className="mt-5 w-60 sm:w-72"
              style={{ perspective: 900 }}
              initial={reduce ? false : { opacity: 0, scale: 0.55, rotateY: -95 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 110, damping: 14, delay: 0.12 }}
            >
              <ItemArt
                item={entry.item}
                rarity={entry.rarity}
                showBrand={false}
                className="rounded-[28px] shadow-[0_40px_100px_-30px_var(--tone)] ring-1 ring-[color:var(--tone)]/40"
              />
            </motion.div>

            <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.6 }}>
              <p className="mt-7 font-display text-sm text-accent">{entry.item.brand}</p>
              <h2 id="reveal-title" className="mt-1 font-display text-3xl leading-tight sm:text-4xl">
                {entry.item.name}
              </h2>
              <p className="mt-3 font-display text-4xl text-foil">
                <CountUp to={entry.item.value} format="usd" auto duration={1.4} foil />
              </p>
            </motion.div>

            <motion.div
              className="mt-8 grid w-full gap-2.5 sm:w-80"
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.6 }}
            >
              <Button onClick={onKeep} size="lg" data-autofocus>
                Keep it
              </Button>
              <Button onClick={onSell} variant="secondary" size="lg">
                Sell back for {formatUsd(sellBackValue(entry.item.value))}
              </Button>
              <Button onClick={onOpenAgain} variant="ghost">
                {openAgainLabel}
              </Button>
              <p className="mt-3 text-xs text-subtle">
                Kept pieces wait in your inventory. Ship them or sell them back ({Math.round(economy.sellBackRate * 100)}%) any time.
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
