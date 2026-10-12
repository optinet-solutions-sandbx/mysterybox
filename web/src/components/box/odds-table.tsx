import { economy } from "@/config/economy";
import type { ResolvedEntry } from "@/domain/types";
import { formatDisplayedOdds, formatExactOdds, formatUsd } from "@/domain/money";
import { rollRanges } from "@/domain/odds";
import { ItemArt } from "@/components/item/item-art";
import { RarityTag } from "@/components/item/rarity-tag";

/**
 * Full odds disclosure, both views side by side:
 * - Displayed odds: what players see on cards (rounded, never "0%").
 * - Back-office odds: the exact weight configured for the box, which the draw actually uses.
 */
export function OddsTable({ entries }: { entries: ResolvedEntry[] }) {
  const rows = rollRanges(entries).sort((a, b) => b.item.value - a.item.value);
  const totalWeight = rows.reduce((sum, r) => sum + r.weight, 0);

  return (
    <div>
      <dl className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface px-5 py-4">
          <dt className="text-sm font-semibold text-fg">Displayed odds</dt>
          <dd className="mt-1 text-sm leading-relaxed text-muted">
            What players see on every card, rounded to two decimals. Anything rarer than 0.01% shows as
            &ldquo;&lt;0.01%&rdquo;, never as zero.
          </dd>
        </div>
        <div className="rounded-2xl border border-accent/40 bg-accent-soft px-5 py-4">
          <dt className="flex items-center gap-2 text-sm font-semibold text-fg">
            Back-office odds
            <span className="rounded-pill bg-foil px-2 py-0.5 text-[10px] font-semibold tracking-wide text-on-accent">Operator view</span>
          </dt>
          <dd className="mt-1 text-sm leading-relaxed text-muted">
            The exact weight configured for each piece (out of {economy.oddsScale.toLocaleString("en-US")}). This is
            what every draw uses; the weights always total 100%.
          </dd>
        </div>
      </dl>

      {/* Phones and tablets: one card per piece, both odds side by side (a 7-column table would hide them). */}
      <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {rows.map((r) => (
          <li key={r.item.id} className="min-w-0 rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-3">
              <ItemArt item={r.item} rarity={r.rarity} showBrand={false} sizes="48px" className="size-12 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted">{r.item.brand}</p>
                <p className="truncate font-semibold">{r.item.name}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold tabular">{formatUsd(r.item.value)}</p>
                <RarityTag rarity={r.rarity} />
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 overflow-hidden rounded-xl border border-line text-sm">
              <div className="px-3 py-2.5">
                <dt className="text-xs font-medium text-muted">Displayed</dt>
                <dd className="mt-0.5 text-base font-semibold tabular">{formatDisplayedOdds(r.probability)}</dd>
              </div>
              <div className="border-l border-line bg-accent-soft px-3 py-2.5">
                <dt className="text-xs font-medium text-muted">Back-office</dt>
                <dd className="mt-0.5 text-base font-semibold tabular">{formatExactOdds(r.probability)}</dd>
                <dd className="mt-1 text-xs leading-snug text-muted tabular">
                  Weight {r.weight.toLocaleString("en-US")} of {economy.oddsScale.toLocaleString("en-US")}
                  <br />
                  Roll {r.from.toLocaleString("en-US")}–{r.to.toLocaleString("en-US")}
                </dd>
              </div>
            </dl>
          </li>
        ))}
        <li className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3 text-sm font-semibold sm:col-span-2">
          <span>Total</span>
          <span className="tabular">
            100% · {formatExactOdds(totalWeight / economy.oddsScale)} · {totalWeight.toLocaleString("en-US")}
          </span>
        </li>
      </ul>

      <div className="hidden overflow-x-auto rounded-[20px] border border-line lg:block">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-surface-2 text-xs font-semibold text-fg">
            <tr>
              <th scope="col" className="px-4 py-3.5">Piece</th>
              <th scope="col" className="px-4 py-3.5">Rarity</th>
              <th scope="col" className="px-4 py-3.5 text-right">Value</th>
              <th scope="col" className="px-4 py-3.5 text-right">Displayed odds</th>
              <th scope="col" className="bg-accent-soft px-4 py-3.5 text-right">Back-office odds</th>
              <th scope="col" className="bg-accent-soft px-4 py-3.5 text-right">Weight</th>
              <th scope="col" className="px-4 py-3.5 text-right">Roll range</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.item.id} className="bg-surface">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ItemArt item={r.item} rarity={r.rarity} showBrand={false} sizes="44px" className="size-11 shrink-0 rounded-xl" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted">{r.item.brand}</p>
                      <p className="truncate font-semibold">{r.item.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <RarityTag rarity={r.rarity} />
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular">{formatUsd(r.item.value)}</td>
                <td className="px-4 py-3 text-right font-semibold tabular">{formatDisplayedOdds(r.probability)}</td>
                <td className="bg-accent-soft px-4 py-3 text-right font-semibold tabular">{formatExactOdds(r.probability)}</td>
                <td className="bg-accent-soft px-4 py-3 text-right tabular text-muted">{r.weight.toLocaleString("en-US")}</td>
                <td className="px-4 py-3 text-right text-xs tabular text-muted">
                  {r.from.toLocaleString("en-US")}–{r.to.toLocaleString("en-US")}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-surface-2 text-sm font-semibold">
            <tr>
              <td className="px-4 py-3" colSpan={3}>
                Total
              </td>
              <td className="px-4 py-3 text-right tabular">100%</td>
              <td className="bg-accent-soft px-4 py-3 text-right tabular">{formatExactOdds(totalWeight / economy.oddsScale)}</td>
              <td className="bg-accent-soft px-4 py-3 text-right tabular">{totalWeight.toLocaleString("en-US")}</td>
              <td className="px-4 py-3 text-right text-xs tabular text-muted">0–{(totalWeight - 1).toLocaleString("en-US")}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
