"use client";

import { useState } from "react";
import { ItemArt } from "@/components/item/item-art";
import { RarityTag } from "@/components/item/rarity-tag";
import { Sheet } from "@/components/ui/sheet";
import { formatDisplayedOdds, formatOneIn, formatUsd, formatUsdCompact } from "@/domain/money";
import type { Box } from "@/domain/types";
import { cn } from "@/lib/cn";
import { resolveEntries, tierOdds } from "@/services/catalog";

/** The odds by tier, as in the app's pull-odds modal. Displayed numbers are the draw's own weights. */
export function TierTable({ box, className }: { box: Box; className?: string }) {
  const tiers = tierOdds(box);
  return (
    <table className={cn("w-full text-sm", className)}>
      <caption className="sr-only">Chance and value range of each rarity tier in {box.name}</caption>
      <thead>
        <tr className="text-left text-xs text-subtle">
          <th scope="col" className="pb-2 font-medium">Tier</th>
          <th scope="col" className="pb-2 font-medium">Value</th>
          <th scope="col" className="pb-2 text-right font-medium">Chance</th>
        </tr>
      </thead>
      <tbody>
        {tiers.map((t) => (
          <tr key={t.rarity} className="border-t border-line/70">
            <th scope="row" className="py-3 text-left font-normal">
              <RarityTag rarity={t.rarity} className="text-sm" />
            </th>
            <td className="py-3 tabular text-muted">
              {t.min === t.max ? formatUsdCompact(t.min) : `${formatUsdCompact(t.min)} – ${formatUsdCompact(t.max)}`}
            </td>
            <td className="py-3 text-right font-display font-semibold tabular">{formatDisplayedOdds(t.probability)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function PieceOddsList({ box }: { box: Box }) {
  const entries = resolveEntries(box);
  return (
    <ul className="divide-y divide-line/70">
      {entries.map((e) => (
        <li key={e.item.id} className="flex items-center gap-3 py-3">
          <ItemArt item={e.item} rarity={e.rarity} showBrand={false} sizes="56px" className="size-14 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted">{e.item.brand}</p>
            <p className="truncate font-medium">{e.item.name}</p>
            <p className="flex items-center gap-3 text-sm text-subtle">
              <span className="tabular">{formatUsd(e.item.value)}</span>
              <RarityTag rarity={e.rarity} />
            </p>
          </div>
          <div className="text-right">
            <p className="font-display font-semibold tabular">{formatDisplayedOdds(e.probability)}</p>
            <p className="text-xs text-subtle">{formatOneIn(e.probability)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function OddsButton({ box, className }: { box: Box; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Odds
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={`${box.name} odds`}>
        <p className="text-muted">
          Each opening draws one piece. These chances are the ones the draw uses, and they never change after you buy.
        </p>
        <TierTable box={box} className="mt-5" />
        <p className="mt-3 text-xs text-subtle">
          Tiers compare a piece&apos;s value with the box price: Grail is 25 times the price or more, Epic 5 times, Rare 1.5
          times, Uncommon half, and Common less than half.
        </p>
        <h3 className="mt-8 font-punch text-lg">Every piece</h3>
        <PieceOddsList box={box} />
      </Sheet>
    </>
  );
}
