import type { CatalogBox, CatalogOutcome } from "@/services/catalog";
import { outcomeArt } from "@/services/catalog";
import { formatCredit, formatExactPercent, formatPercent, formatUsd, formatUsdCompact } from "@/domain/money";
import { ItemArt } from "@/components/item/item-art";

const oneIn = (percent: number) => Math.round(100 / percent).toLocaleString("en-US");
const worth = (o: CatalogOutcome) => (o.kind === "item" ? formatUsd(o.valueCents ?? 0) : formatCredit(o.credits));
const worthShort = (o: CatalogOutcome) => (o.kind === "item" ? formatUsdCompact(o.valueCents ?? 0) : formatCredit(o.credits));

/**
 * "Box content and odds": every outcome with its value, its chance exactly as the draw uses it,
 * and 1 in N. Rarest first; the whole table fits its container (no scrollbar). The full name,
 * value and exact percent are in each name's tooltip.
 */
export function BoxOdds({ box }: { box: CatalogBox }) {
  const rows = [...box.outcomes].sort((a, b) => a.percent - b.percent);
  return (
    <div>
      <div className="overflow-hidden rounded-[20px] border border-line">
        <table className="w-full table-fixed text-left text-xs sm:text-sm">
          <colgroup>
            <col />
            <col className="w-[5.25rem] sm:w-32" />
            <col className="w-[4.5rem] sm:w-28" />
            <col className="w-[3.75rem] sm:w-24" />
          </colgroup>
          <thead className="bg-surface-2 font-semibold text-fg">
            <tr>
              <th scope="col" className="px-3 py-3 sm:px-4">
                Outcome
              </th>
              <th scope="col" className="px-2 py-3 text-right sm:px-4">
                Value
              </th>
              <th scope="col" className="px-2 py-3 text-right sm:px-4">
                Odds
              </th>
              <th scope="col" className="px-3 py-3 text-right sm:px-4">
                1 in
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((o) => (
              <tr key={o.id} className="bg-surface">
                <td className="px-3 py-2.5 sm:px-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <ItemArt item={outcomeArt(o.id)} showBrand={false} sizes="36px" className="hidden size-9 shrink-0 rounded-lg sm:grid" />
                    <span
                      tabIndex={0}
                      className="block min-w-0 truncate font-medium outline-none focus-visible:underline"
                      title={`${o.label} · ${worth(o)} · ${formatExactPercent(o.percent)}`}
                    >
                      {o.label}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-right tabular sm:px-4">{worthShort(o)}</td>
                <td className="px-2 py-2.5 text-right font-semibold tabular sm:px-4" title={`Exactly ${formatExactPercent(o.percent)}`}>
                  {formatPercent(o.percent)}
                </td>
                <td className="px-3 py-2.5 text-right text-muted tabular sm:px-4">{oneIn(o.percent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {box.bonus.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold">What a free spin pays</h3>
          <p className="mt-1 text-sm text-muted">A free spin is one more roll with the same secret and your seed, on this small table. It pays site credit only.</p>
          <div className="mt-3 overflow-hidden rounded-2xl border border-line">
            <table className="w-full table-fixed text-left text-xs sm:text-sm">
              <thead className="bg-surface-2 font-semibold">
                <tr>
                  <th scope="col" className="px-3 py-2.5 sm:px-4">
                    Credit
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right sm:px-4">
                    Odds
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right sm:px-4">
                    1 in
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {box.bonus.map((b) => (
                  <tr key={b.credits} className="bg-surface">
                    <td className="px-3 py-2 tabular sm:px-4">{formatCredit(b.credits)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular sm:px-4">{formatPercent(b.percent)}</td>
                    <td className="px-3 py-2 text-right text-muted tabular sm:px-4">{oneIn(b.percent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-4 max-w-3xl text-sm text-subtle">
        Odds are the exact percentages the draw uses; they add up to 100%. Site credit counts as $1 per credit, buys boxes and
        can&rsquo;t be withdrawn. Individual openings vary widely, and most return less than the price.
      </p>
    </div>
  );
}
