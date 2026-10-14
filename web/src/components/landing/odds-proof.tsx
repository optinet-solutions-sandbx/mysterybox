"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import type { ResolvedEntry } from "@/domain/types";
import { formatDisplayedOdds, formatUsd } from "@/domain/money";
import { economy } from "@/config/economy";
import { useTradeIn } from "@/components/site-settings-provider";
import { CountUp } from "@/components/fx/count-up";
import { ItemArt } from "@/components/item/item-art";

/**
 * Transparency shown, not claimed: a real box's odds drawn as bars (log scale so rare pieces
 * stay visible), next to the numbers that define the economy.
 */
export function OddsProof({
  boxName,
  boxSlug,
  entries,
  rtp,
}: {
  boxName: string;
  boxSlug: string;
  entries: ResolvedEntry[];
  rtp: number;
}) {
  const reduce = useReducedMotion();
  const tradeInEnabled = useTradeIn();
  const rows = [...entries].sort((a, b) => b.item.value - a.item.value).slice(0, 6);
  const minLog = Math.log10(Math.min(...rows.map((r) => r.probability)));
  const width = (p: number) => 12 + ((Math.log10(p) - minLog) / (0 - minLog)) * 88;

  return (
    <section className="py-28">
      <div className="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:px-8">
        <div>
          <h2 className="font-display text-4xl leading-tight sm:text-5xl">You see the odds before you open.</h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
            Every box lists every piece, its value and its exact chance. Most openings return less than the box
            price; the rare pieces are genuinely rare.
          </p>
          <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-8">
            <div>
              <dt className="text-sm text-subtle">Average return</dt>
              <dd className="mt-1 font-display text-4xl text-foil">
                <CountUp to={Math.round(rtp * 100)} format="percent" foil />
              </dd>
            </div>
            {tradeInEnabled ? (
              <div>
                <dt className="text-sm text-subtle">Trade-in rate</dt>
                <dd className="mt-1 font-display text-4xl text-foil">
                  <CountUp to={Math.round(economy.sellBackRate * 100)} format="percent" foil />
                </dd>
              </div>
            ) : (
              <div>
                <dt className="text-sm text-subtle">Outcomes in this box</dt>
                <dd className="mt-1 font-display text-4xl text-foil">
                  <CountUp to={entries.length} foil />
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-subtle">Possible results per opening</dt>
              <dd className="mt-1 font-display text-4xl text-foil">
                <CountUp to={economy.oddsScale} foil />
              </dd>
            </div>
            <div>
              <dt className="text-sm text-subtle">Hidden items</dt>
              <dd className="mt-1 font-display text-4xl text-foil">0</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-[28px] border border-line bg-surface/60 p-6 backdrop-blur sm:p-8">
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-display text-xl">{boxName}</p>
            <Link href={`/boxes/${boxSlug}`} className="text-sm text-accent underline-offset-4 hover:underline">
              Full odds table
            </Link>
          </div>
          <ul className="mt-6 grid gap-4">
            {rows.map((r, i) => (
              <li key={r.item.id} className="grid grid-cols-[48px_1fr_auto] items-center gap-4">
                <ItemArt item={r.item} rarity={r.rarity} showBrand={false} sizes="48px" className="size-12 rounded-[10px]" />
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    <span className="text-muted">{r.item.brand}</span> {r.item.name}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg/60">
                    <motion.div
                      className="h-full rounded-full bg-foil"
                      initial={reduce ? false : { width: 0 }}
                      whileInView={{ width: `${width(r.probability)}%` }}
                      viewport={{ once: true, margin: "-10% 0px" }}
                      transition={{ duration: 1.2, delay: 0.1 * i, ease: [0.22, 1, 0.36, 1] }}
                      style={reduce ? { width: `${width(r.probability)}%` } : undefined}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-sm text-foil tabular">{formatUsd(r.item.value)}</p>
                  <p className="text-xs text-subtle tabular">{formatDisplayedOdds(r.probability)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
