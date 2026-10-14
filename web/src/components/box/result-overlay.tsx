"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef } from "react";
import type { OpenResolved } from "@/box-api";
import { tradeInRate } from "@/config/features";
import { useTradeIn } from "@/components/site-settings-provider";
import { formatCredit } from "@/domain/money";
import { outcomeArt } from "@/services/catalog";
import { Button } from "@/components/ui/button";
import { useDialog } from "@/components/ui/modal";
import { CountUp } from "@/components/fx/count-up";
import { Authenticity } from "@/components/item/authenticity";
import { ItemArt } from "@/components/item/item-art";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The result of one open, with the same neutral treatment for every outcome (no rarity flash or
 * escalation). Free spins reveal one after another, then the credit total.
 */
export function ResultOverlay({
  result,
  open,
  quick,
  busy,
  onClose,
  onKeep,
  onShip,
  onTradeIn,
  onOpenAgain,
  openAgainLabel,
}: {
  result: OpenResolved | null;
  open: boolean;
  quick: boolean;
  busy: boolean;
  onClose: () => void;
  onKeep: () => void;
  onShip: () => void;
  onTradeIn: () => void;
  onOpenAgain: () => void;
  openAgainLabel: string;
}) {
  const reduce = useReducedMotion();
  const tradeInEnabled = useTradeIn();
  const panel = useRef<HTMLDivElement>(null);
  const piece = result?.outcome.kind === "item" ? result : null;
  useDialog(open, piece ? onKeep : onClose, panel);
  const step = reduce ? 0 : quick ? 0.2 : 0.6;
  const spins = result?.bonusSpins.length ?? 0;
  const actionsAt = reduce ? 0 : 0.5 + (spins > 0 ? (spins + 1) * step : 0) + 0.2;

  return (
    <AnimatePresence>
      {open && result && (
        <motion.div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reveal-title"
          tabIndex={-1}
          className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto px-4 py-10 outline-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
        >
          <div aria-hidden className="absolute inset-0 bg-bg/94" onClick={piece ? onKeep : onClose} />
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/2 size-[80vmin] -translate-x-1/2 -translate-y-1/2"
            style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--glow) 32%, transparent), transparent)" }}
          />

          <div className="relative flex w-full max-w-md flex-col items-center text-center">
            <motion.div
              className="w-48 sm:w-60"
              initial={reduce ? false : { opacity: 0, y: 28, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={reduce ? { duration: 0 } : { duration: 0.55, ease: EASE }}
            >
              <ItemArt
                item={outcomeArt(result.outcome.id)}
                rarity={piece ? result.outcome.rarity : undefined}
                showBrand={false}
                sizes="240px"
                className="rounded-[28px] shadow-[0_30px_80px_-30px_var(--shadow-strong)] ring-1 ring-line"
              />
            </motion.div>

            <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0 : 0.25, duration: 0.5, ease: EASE }}>
              {piece && <p className="mt-6 font-display text-sm text-accent">{outcomeArt(result.outcome.id).brand}</p>}
              <h2 id="reveal-title" className="mt-1 font-display text-3xl leading-tight sm:text-4xl">
                {piece ? outcomeArt(result.outcome.id).name : result.outcome.label}
              </h2>
              {piece && <Authenticity item={outcomeArt(result.outcome.id)} full className="mx-auto mt-2 max-w-xs [&_p]:justify-center" />}
              <p className="mt-3 font-display text-3xl text-foil">
                {piece ? <CountUp to={result.outcome.valueCents ?? 0} format="usd" auto duration={quick ? 0.6 : 1.2} foil /> : formatCredit(result.outcome.credits)}
              </p>
            </motion.div>

            {spins > 0 && (
              <ol className="mt-5 w-full max-w-xs space-y-2" aria-label="Bonus opens">
                {result.bonusSpins.map((b, i) => (
                  <motion.li
                    key={b.nonce}
                    className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-2 text-sm"
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: reduce ? 0 : 0.5 + (i + 1) * step, duration: 0.4, ease: EASE }}
                  >
                    <span className="text-muted">Bonus open {i + 1}</span>
                    <span className="font-semibold tabular">+{formatCredit(b.credits)}</span>
                  </motion.li>
                ))}
                <motion.li
                  className="flex items-center justify-between px-4 pt-1 text-sm font-semibold"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: reduce ? 0 : 0.5 + (spins + 1) * step, duration: 0.4 }}
                >
                  <span>Total credit</span>
                  <span className="text-foil tabular">{formatCredit(result.creditsAwarded)}</span>
                </motion.li>
              </ol>
            )}

            <motion.div
              className="mt-7 grid w-full gap-2.5 sm:w-80"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: actionsAt, duration: 0.5, ease: EASE }}
            >
              {piece && piece.itemAward ? (
                <>
                  <Button size="lg" onClick={onShip} disabled={busy}>
                    Ship it
                  </Button>
                  {tradeInEnabled && (
                    <Button size="lg" variant="secondary" onClick={onTradeIn} disabled={busy}>
                      Trade in for {formatCredit(piece.itemAward.tradeInCredits)}
                    </Button>
                  )}
                  <Button variant="ghost" onClick={onKeep} disabled={busy} data-autofocus>
                    Keep for now
                  </Button>
                </>
              ) : (
                <Button size="lg" onClick={onClose} disabled={busy} data-autofocus>
                  Done
                </Button>
              )}
              <Button variant="ghost" onClick={onOpenAgain} disabled={busy}>
                {openAgainLabel}
              </Button>
              <p className="mt-2 text-xs text-subtle">
                {piece
                  ? tradeInEnabled
                    ? `Pieces wait in your inventory until you ship them or trade them in. Trade-ins pay ${tradeInRate} of listed value as site credit, which buys boxes and can't be withdrawn.`
                    : "Pieces wait in your inventory until you ship them."
                  : "Site credit buys boxes and can't be withdrawn."}
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
