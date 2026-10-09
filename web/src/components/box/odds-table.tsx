import type { ResolvedEntry } from "@/domain/types";
import { formatProbability, formatUsd } from "@/domain/money";
import { rollRanges } from "@/domain/odds";
import { ItemArt } from "@/components/item/item-art";
import { RarityTag } from "@/components/item/rarity-tag";

/**
 * Full odds disclosure: every item, its listed value, probability and the roll range that
 * selects it (rolls are integers in [0, 100000) — see /provably-fair).
 */
export function OddsTable({ entries }: { entries: ResolvedEntry[] }) {
  const rows = rollRanges(entries).sort((a, b) => b.item.value - a.item.value);

  return (
    <div className="overflow-x-auto rounded-card ring-1 ring-line">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-surface-2 text-xs tracking-wide text-muted uppercase">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Item</th>
            <th scope="col" className="px-4 py-3 font-semibold">Rarity</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Value</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Odds</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Roll range</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.item.id} className="bg-surface">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <ItemArt item={r.item} rarity={r.rarity} showBrand={false} className="size-11 shrink-0 rounded-xl" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted">{r.item.brand}</p>
                    <p className="truncate font-medium">{r.item.name}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <RarityTag rarity={r.rarity} />
              </td>
              <td className="px-4 py-3 text-right font-display tabular">{formatUsd(r.item.value)}</td>
              <td className="px-4 py-3 text-right font-display tabular">{formatProbability(r.probability)}</td>
              <td className="px-4 py-3 text-right font-display text-xs text-muted tabular">
                {r.from.toLocaleString("en-US")}–{r.to.toLocaleString("en-US")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
