"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Zap } from "lucide-react";
import type { Box, ResolvedEntry } from "@/domain/types";
import { formatProbability, formatUsd } from "@/domain/money";
import { buildReel } from "@/domain/reel";
import { useSession, useSessionHydrated } from "@/store/session";
import { Box3D } from "@/components/box3d/box-3d";
import { scrollToElement } from "@/components/fx/smooth-scroll";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { Reel, type ReelSpin } from "./reel";
import { RevealOverlay } from "./reveal-overlay";

const REEL_LENGTH = 64;
const WINNER_INDEX = 56;

type Phase = "idle" | "drawing" | "spinning" | "revealed";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The core loop, staged: pay → the box trembles while the draw is made → the lid bursts open
 * as the reel spins to the (already decided) result → full-screen reveal → keep or sell back.
 */
export function BoxStage({
  box,
  entries,
  categoryLabel,
  stats,
}: {
  box: Box;
  entries: ResolvedEntry[];
  categoryLabel: string;
  stats: { rtp: number; topName: string; topValue: number; topProbability: number };
}) {
  const reduce = useReducedMotion();
  const hydrated = useSessionHydrated();
  const balance = useSession((s) => s.balance);
  const seeds = useSession((s) => s.seeds);
  const openBox = useSession((s) => s.openBox);
  const sellBack = useSession((s) => s.sellBack);
  const reelRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [spin, setSpin] = useState<ReelSpin | null>(null);
  const [result, setResult] = useState<{ entry: ResolvedEntry; uid: string } | null>(null);
  const [quick, setQuick] = useState(false);
  const [skip, setSkip] = useState(false);
  const [notice, setNotice] = useState<{ tone: "error" | "ok"; text: string; link?: boolean } | null>(null);

  const busy = phase === "drawing" || phase === "spinning";
  const preview = [...entries].sort((a, b) => b.item.value - a.item.value);

  async function handleOpen() {
    setNotice(null);
    setPhase("drawing");
    if (reelRef.current && window.innerWidth < 1024) scrollToElement(reelRef.current, -140);
    const [outcome] = await Promise.all([openBox(box), wait(reduce ? 0 : quick ? 250 : 800)]);
    if (!outcome.ok) {
      setPhase("idle");
      setNotice(
        outcome.reason === "insufficient_funds"
          ? { tone: "error", text: "Your demo balance is too low for this box.", link: true }
          : { tone: "error", text: "Your session is still loading. Try again in a moment." },
      );
      return;
    }
    setResult({ entry: outcome.entry, uid: outcome.inventoryItem.uid });
    setSkip(false);
    setSpin({
      key: Date.now(),
      tiles: buildReel(entries, outcome.entry, { length: REEL_LENGTH, winnerIndex: WINNER_INDEX, random: Math.random }),
      winnerIndex: WINNER_INDEX,
      jitter: (Math.random() - 0.5) * 0.7,
      duration: quick ? 1 : 6,
    });
    setPhase("spinning");
  }

  const handleSettled = useCallback(() => setPhase("revealed"), []);

  function handleKeep() {
    setPhase("idle");
    if (result) setNotice({ tone: "ok", text: `${result.entry.item.name} is in your inventory.` });
  }

  function handleSell() {
    if (!result) return;
    const credited = sellBack([result.uid]);
    setPhase("idle");
    setNotice({ tone: "ok", text: `Sold back for ${formatUsd(credited)}. It’s in your balance.` });
  }

  function handleOpenAgain() {
    setPhase("idle");
    void handleOpen();
  }

  const canAfford = hydrated && balance >= box.price;

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div aria-hidden className="absolute inset-0 -z-10">
          <div className="absolute -top-[10%] left-0 h-[100%] w-[70%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--sapphire)_55%,transparent),transparent)]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-marble opacity-30 [mask-image:linear-gradient(to_top,black,transparent)]" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-4 px-4 pt-6 sm:px-6 lg:grid-cols-[1fr_1fr] lg:gap-10 lg:px-8 lg:pt-16">
          <div className="relative h-[400px] sm:h-[480px] lg:h-[560px]" data-cursor data-cursor-label="Tilt">
            <div className="absolute top-[66%] left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.7] sm:scale-90 lg:scale-100">
              <Box3D
                width={340}
                material={box.material}
                open={phase === "spinning" || phase === "revealed" ? 1 : 0}
                shake={phase === "drawing"}
                tilt
                float={phase === "idle"}
              />
            </div>
          </div>

          <div className="pb-6 lg:pb-0">
            <Link href="/boxes" className="text-sm text-muted transition-colors hover:text-fg">
              All boxes
            </Link>
            <p className="mt-6 text-sm text-accent">
              {categoryLabel} · {entries.length} pieces
            </p>
            <h1 className="mt-2 font-display text-5xl leading-[0.95] sm:text-6xl">{box.name}</h1>
            <p className="mt-4 max-w-md text-lg text-muted">{box.tagline}</p>

            <dl className="mt-8 grid max-w-lg grid-cols-3 border-y border-line">
              <Stat label="Price" value={formatUsd(box.price)} />
              <Stat label="Top piece" value={formatUsd(stats.topValue)} hint={formatProbability(stats.topProbability)} />
              <Stat label="Average return" value={`${(stats.rtp * 100).toFixed(1)}%`} />
            </dl>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button size="lg" onClick={handleOpen} disabled={!hydrated || !seeds || busy} className="min-w-60">
                {busy ? "Opening…" : `Open for ${formatUsd(box.price)}`}
              </Button>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted select-none hover:text-fg">
                <input type="checkbox" className="peer sr-only" checked={quick} onChange={(e) => setQuick(e.target.checked)} />
                <span className="grid size-6 place-items-center rounded-full border border-line peer-checked:border-transparent peer-checked:bg-foil peer-checked:text-on-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                  <Zap className="size-3" />
                </span>
                Quick open
              </label>
              {hydrated && !canAfford && phase === "idle" && (
                <Link href="/wallet" className="text-sm text-accent underline-offset-4 hover:underline">
                  Add demo funds
                </Link>
              )}
            </div>

            <p role="status" aria-live="polite" className={cn("mt-4 min-h-6 text-sm", notice?.tone === "error" ? "text-danger" : "text-success")}>
              {notice?.text}{" "}
              {notice?.link && (
                <Link href="/wallet" className="underline underline-offset-4">
                  Top up
                </Link>
              )}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 pt-4 pb-10 sm:px-6 lg:px-8">
          <div className="relative">
            <Reel ref={reelRef} spin={spin} preview={preview} onSettled={handleSettled} skip={skip} />
            {phase === "spinning" && !skip && (
              <button
                type="button"
                onClick={() => setSkip(true)}
                className="absolute right-4 bottom-4 z-30 rounded-pill border border-line bg-bg/70 px-4 py-1.5 text-sm text-muted backdrop-blur transition-colors hover:text-fg"
              >
                Skip
              </button>
            )}
          </div>
          {seeds && (
            <p className="mt-3 truncate font-mono text-[11px] text-subtle">
              Server seed hash {seeds.serverSeedHash.slice(0, 16)}… · client seed {seeds.clientSeed} · nonce {seeds.nonce} ·{" "}
              <Link href="/provably-fair" className="underline hover:text-fg">
                verify
              </Link>
            </p>
          )}
        </div>
      </section>

      <RevealOverlay
        entry={result?.entry ?? null}
        open={phase === "revealed"}
        onKeep={handleKeep}
        onSell={handleSell}
        onOpenAgain={handleOpenAgain}
        openAgainLabel={`Open again for ${formatUsd(box.price)}`}
      />
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="py-4 pr-4 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line [&:not(:first-child)]:pl-4">
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="mt-1 font-display text-xl text-foil tabular">{value}</dd>
      {hint && <dd className="text-xs text-muted">{hint}</dd>}
    </div>
  );
}
