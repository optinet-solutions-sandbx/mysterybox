"use client";

import { Fragment, useMemo, useState } from "react";
import { Boxes, ChevronDown } from "lucide-react";
import { formatUsd } from "@/domain/money";
import { boxPerformance } from "@/domain/analytics";
import { catalogBox, resolveEntries } from "@/services/catalog";
import { OddsTable } from "@/components/box/odds-table";
import { cn } from "@/lib/cn";
import { useBackofficeData } from "./data";
import { PageTitle, RangeControl, formatCount, formatDay, formatPct } from "./ui";

/** Configured odds and return per box, next to what actually happened in the period. */
export function BoxesView() {
  const { players, range, boxes, scale } = useBackofficeData();
  const [open, setOpen] = useState<string | null>(null);
  const perf = useMemo(() => (range ? boxPerformance(players, range, boxes, (b) => catalogBox(b).maths.returnFace) : []), [players, range, boxes]);

  if (!range) return <div className="h-[60vh] animate-pulse rounded-2xl bg-surface" />;

  return (
    <>
      <PageTitle
        icon={Boxes}
        title="Boxes & odds"
        intro={
          <>
            Each box&rsquo;s configured return (from its back-office weights) against what players actually received,{" "}
            {formatDay(range.from)} – {formatDay(range.to)}. Short periods swing widely: a single top piece moves a box&rsquo;s
            return by hundreds of points.
          </>
        }
        actions={<RangeControl />}
      />
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="border-b border-line text-left text-xs text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Box</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Price</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Configured return</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Actual return</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Opened</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Played</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Earned</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">House net</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Odds</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {perf.map((b) => {
              const box = boxes.find((x) => x.id === b.boxId)!;
              const expanded = open === b.boxId;
              const drift = b.actualRtp === null ? 0 : b.actualRtp - b.expectedRtp;
              return (
                <Fragment key={b.boxId}>
                  <tr>
                    <td className="px-4 py-3 font-semibold">{b.name}</td>
                    <td className="px-4 py-3 text-right tabular">{formatUsd(b.priceCents)}</td>
                    <td className="px-4 py-3 text-right tabular">{formatPct(b.expectedRtp)}</td>
                    <td className={cn("px-4 py-3 text-right font-semibold tabular", drift > 0.15 && "text-danger", drift < -0.15 && "text-success")}>
                      {formatPct(b.actualRtp)}
                    </td>
                    <td className="px-4 py-3 text-right tabular">{formatCount(b.openings)}</td>
                    <td className="px-4 py-3 text-right tabular">{formatUsd(b.playedCents)}</td>
                    <td className="px-4 py-3 text-right tabular">{formatUsd(b.earnedCents)}</td>
                    <td className={cn("px-4 py-3 text-right font-semibold tabular", b.playedCents - b.earnedCents < 0 && "text-danger")}>
                      {formatUsd(b.playedCents - b.earnedCents)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => setOpen(expanded ? null : b.boxId)}
                        className="inline-flex items-center gap-1 text-sm font-semibold whitespace-nowrap text-accent"
                      >
                        Odds <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
                      </button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={9} className="bg-bg px-4 py-5">
                        <OddsTable entries={resolveEntries(box)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted">
        Odds are frozen while a box is live: to change them, staff set the box back to draft, edit the weights, and publish again (the
        database refuses weights that don&rsquo;t total {formatCount(scale)}). Every change is in the audit log.
      </p>
    </>
  );
}
