"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Zap } from "lucide-react";
import type { PayMethod } from "@/box-api";
import type { Box, ResolvedEntry } from "@/domain/types";
import { formatCredit, formatPercent, formatUsd } from "@/domain/money";
import { outcomeArt, type CatalogBox } from "@/services/catalog";
import { useAuthHydrated, useCurrentUser } from "@/store/auth";
import { useSessionHydrated } from "@/store/session";
import { BOX_WIDTH, Box3D } from "@/components/box3d/box-3d";
import { Button, ButtonLink } from "@/components/ui/button";
import { ItemArt } from "@/components/item/item-art";
import { cn } from "@/lib/cn";
import { BoxAnalysis, SHOW_ANALYSIS } from "./box-analysis";
import { OddsAtAGlance } from "./odds-at-a-glance";
import { Reel } from "./reel";
import { ResultOverlay } from "./result-overlay";
import { SessionCounters } from "./session-counters";
import { useBoxOpen } from "./use-box-open";

const noop = () => {};

type StageProps = {
  box: Box;
  entries: ResolvedEntry[];
  catalog: CatalogBox;
  categoryLabel: string;
  stats: { rtp: number; topName: string; topValue: number; topProbability: number };
};

/**
 * The core loop on the backend's logic: the open is prepared (its seal shown) before you pay;
 * Open runs seed → pay → spin through box-api; only then the box shakes, the lid opens and the
 * outcome rises out, then the result. One stage per account, so nothing carries over on switch.
 */
export function BoxStage(props: StageProps) {
  const authHydrated = useAuthHydrated();
  const user = useCurrentUser();
  return <Stage key={authHydrated ? (user?.id ?? "signed-out") : "loading"} {...props} />;
}

function Stage({ box, entries, catalog, categoryLabel, stats }: StageProps) {
  const reduce = useReducedMotion();
  const hydrated = useSessionHydrated();
  const authHydrated = useAuthHydrated();
  const user = useCurrentUser();
  const player = !!user && user.role === "player";
  const [quick, setQuick] = useState(false);
  const [payWith, setPayWith] = useState<PayMethod>("card");
  const flow = useBoxOpen(box.slug, { enabled: hydrated && authHydrated && player, quick });

  const canPayCredit = flow.credit * 100 >= box.price;
  const method: PayMethod = payWith === "credit" && canPayCredit ? "credit" : "card";
  const working = flow.phase === "working" || flow.phase === "shaking" || flow.phase === "rising";
  const lidOpen = flow.phase === "rising" || flow.phase === "result";
  const result = flow.result;
  const piece = result?.outcome.kind === "item" ? result : null;
  const preview = [...entries].sort((a, b) => b.item.value - a.item.value);
  const last = flow.history.at(-1) ?? null;
  const label = result ? (piece ? `${outcomeArt(result.outcome.id).brand} ${outcomeArt(result.outcome.id).name}` : result.outcome.label) : "";
  const openLabel = `Open the box · ${formatUsd(box.price)}`;

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div aria-hidden className="absolute inset-0 -z-10">
          <div className="absolute -top-[10%] left-0 h-[100%] w-[70%] bg-[radial-gradient(closest-side,var(--aurora-b),transparent)]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-marble opacity-30 [mask-image:linear-gradient(to_top,black,transparent)]" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-4 px-4 pt-6 sm:px-6 lg:grid-cols-[1fr_1fr] lg:gap-10 lg:px-8 lg:pt-16">
          <div className="relative h-[400px] sm:h-[480px] lg:h-[560px]" data-cursor data-cursor-label="Tilt">
            <div className="absolute top-[66%] left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.7] sm:scale-90 lg:scale-100">
              <Box3D width={BOX_WIDTH.stage} material={box.material} open={lidOpen ? 1 : 0} shake={flow.phase === "shaking"} tilt float={!working && !lidOpen} />
            </div>
            <AnimatePresence>
              {lidOpen && result && (
                <motion.figure
                  key={result.openId}
                  className="absolute top-[4%] left-1/2 z-10 w-[min(46%,210px)] -translate-x-1/2 overflow-hidden rounded-[18px] bg-surface shadow-[0_30px_80px_-20px_var(--shadow-strong)] ring-1 ring-accent/30"
                  initial={reduce ? false : { opacity: 0, y: 150, scale: 0.4 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 110, scale: 0.55, transition: { duration: 0.4, ease: [0.55, 0, 0.75, 0.2] } }}
                  transition={{ type: "spring", stiffness: 120, damping: 17, delay: reduce ? 0 : quick ? 0.05 : 0.3 }}
                >
                  <ItemArt item={outcomeArt(result.outcome.id)} rarity={piece ? result.outcome.rarity : undefined} showBrand={false} sizes="210px" />
                  <figcaption className="border-t border-line px-4 py-3 text-left">
                    <p className="truncate text-sm text-fg">{label}</p>
                    <p className="mt-1 font-display text-lg text-foil tabular">
                      {piece ? formatUsd(result.outcome.valueCents ?? 0) : `+${formatCredit(result.creditsAwarded)}`}
                    </p>
                  </figcaption>
                </motion.figure>
              )}
            </AnimatePresence>
          </div>

          <div className="pb-6 lg:pb-0">
            <Link href="/boxes" className="text-sm text-muted transition-colors hover:text-fg">
              All boxes
            </Link>
            <p className="mt-6 text-sm text-accent">
              {categoryLabel} · {entries.length} outcomes
            </p>
            <h1 className="mt-2 font-display text-5xl leading-[0.95] sm:text-6xl">{box.name}</h1>
            <p className="mt-4 max-w-md text-lg text-muted">{box.tagline}</p>

            <dl className="mt-8 grid max-w-lg grid-cols-3 border-y border-line">
              <Stat label="Price" value={formatUsd(box.price)} />
              <Stat label="Top piece" value={formatUsd(stats.topValue)} hint={formatPercent(stats.topProbability * 100)} />
              <Stat label="Average return" value={`${(stats.rtp * 100).toFixed(1)}%`} />
            </dl>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              {user && user.role !== "player" ? (
                <ButtonLink size="lg" href="/admin" variant="secondary" className="min-w-60">
                  Staff account: open the back office
                </ButtonLink>
              ) : authHydrated && !user ? (
                <ButtonLink size="lg" href={`/sign-in?next=${encodeURIComponent(`/boxes/${box.slug}`)}`} className="min-w-60">
                  Sign in to open
                </ButtonLink>
              ) : flow.phase === "error" ? (
                <Button size="lg" variant="secondary" onClick={() => void flow.retry()} disabled={flow.busy} className="min-w-60">
                  Try again
                </Button>
              ) : (
                <Button size="lg" onClick={() => void flow.start(method)} disabled={flow.phase !== "ready" || flow.busy} className="min-w-60">
                  {working ? "Opening…" : flow.phase === "idle" ? "Preparing…" : openLabel}
                </Button>
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted select-none hover:text-fg">
                <input type="checkbox" className="peer sr-only" checked={quick} onChange={(e) => setQuick(e.target.checked)} />
                <span className="grid size-6 place-items-center rounded-full border border-line peer-checked:border-transparent peer-checked:bg-foil peer-checked:text-on-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                  <Zap className="size-3" />
                </span>
                Quick open
              </label>
              {authHydrated && !user && (
                <Link href={`/register?next=${encodeURIComponent(`/boxes/${box.slug}`)}`} className="text-sm font-semibold text-accent underline-offset-4 hover:underline">
                  New here? Create an account
                </Link>
              )}
            </div>

            <p role="status" aria-live="polite" className={cn("mt-4 min-h-6 text-sm", flow.notice?.tone === "error" ? "text-danger" : "text-success")}>
              {flow.notice?.text}{" "}
              {flow.notice?.topUp && (
                <Link href="/wallet" className="underline underline-offset-4">
                  Top up
                </Link>
              )}
            </p>

            {player && flow.open && (
              <div className="mt-2 max-w-lg rounded-2xl border border-line bg-surface/70 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">Sealed before you pay</p>
                  <Link href="/provably-fair" className="text-xs font-semibold text-accent underline-offset-4 hover:underline">
                    How the check works
                  </Link>
                </div>
                <p className="mt-1 text-xs text-muted">
                  The secret that decides your next open is already chosen. This is its seal; the secret is shown after the spin so you can check it.
                </p>
                <dl className="mt-3 grid gap-1 font-mono text-[11px] text-muted">
                  <div className="flex min-w-0 gap-2">
                    <dt className="shrink-0 font-sans font-semibold text-subtle">Seal</dt>
                    <dd className="truncate" title={flow.open.serverHash}>
                      {flow.open.serverHash}
                    </dd>
                  </div>
                  <div className="flex min-w-0 gap-2">
                    <dt className="shrink-0 font-sans font-semibold text-subtle">Table</dt>
                    <dd className="truncate" title={flow.open.tableHash}>
                      {flow.open.tableHash}
                    </dd>
                  </div>
                </dl>
                <label htmlFor="client-seed" className="mt-3 block text-xs font-semibold text-muted">
                  Your seed (optional)
                </label>
                <input
                  id="client-seed"
                  maxLength={64}
                  value={flow.seed}
                  onChange={(e) => flow.setSeed(e.target.value)}
                  disabled={working}
                  placeholder="Any word; it goes into the roll"
                  className="mt-1 w-full rounded-xl bg-surface-2 px-3 py-2 font-mono text-sm ring-1 ring-line placeholder:text-subtle"
                />
                {canPayCredit && (
                  <fieldset className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    <legend className="sr-only">Pay with</legend>
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" name="pay" checked={method === "card"} onChange={() => setPayWith("card")} /> Demo balance
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" name="pay" checked={method === "credit"} onChange={() => setPayWith("credit")} /> Site credit ({formatCredit(flow.credit)})
                    </label>
                  </fieldset>
                )}
              </div>
            )}

            <div className="mt-4 max-w-lg">
              <OddsAtAGlance entries={entries} />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 pt-4 pb-10 sm:px-6 lg:px-8">
          <Reel spin={null} preview={preview} onSettled={noop} />
          {player && (
            <div className="mt-6">
              <SessionCounters history={flow.history} />
            </div>
          )}
          {SHOW_ANALYSIS && last && <BoxAnalysis key={last.openId} box={catalog} last={last} />}
        </div>
      </section>

      <ResultOverlay
        result={result}
        open={flow.phase === "result"}
        quick={quick}
        busy={flow.busy}
        onClose={() => void flow.next()}
        onKeep={() => void flow.keep(label)}
        onShip={() => result?.itemAward && void flow.ship(result.itemAward.awardId, label)}
        onTradeIn={() => result?.itemAward && void flow.tradeIn(result.itemAward.awardId)}
        onOpenAgain={() => void flow.openAgain(method)}
        openAgainLabel={`Open again · ${formatUsd(box.price)}`}
      />
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="py-4 pr-4 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line [&:not(:first-child)]:pl-4">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="mt-1 font-display text-xl font-semibold text-foil tabular sm:text-2xl">{value}</dd>
      {hint && <dd className="text-xs text-muted">{hint}</dd>}
    </div>
  );
}
