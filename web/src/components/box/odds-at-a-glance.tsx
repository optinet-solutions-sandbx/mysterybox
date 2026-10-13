import { RARITIES, type Rarity, type ResolvedEntry } from "@/domain/types";
import { formatExactPercent, formatPercent } from "@/domain/money";
import { oddsByRarity } from "@/domain/odds";

const label: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

const swatch: Record<Rarity, string> = {
  common: "bg-rarity-common",
  uncommon: "bg-rarity-uncommon",
  rare: "bg-rarity-rare",
  epic: "bg-rarity-epic",
  legendary: "bg-rarity-legendary",
};

/**
 * Chance of each rarity tier for one opening: a stacked bar (tiny tiers get a minimum sliver so
 * they stay visible) plus a legend with displayed and back-office figures.
 */
export function OddsAtAGlance({ entries }: { entries: ResolvedEntry[] }) {
  const byTier = oddsByRarity(entries);
  const tiers = RARITIES.filter((r) => byTier[r] > 0).reverse();
  const MIN = 2.5;
  const raw = tiers.map((r) => Math.max(byTier[r] * 100, MIN));
  const total = raw.reduce((a, b) => a + b, 0);

  return (
    <section aria-labelledby="odds-glance" className="rounded-2xl border border-line bg-surface/80 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="odds-glance" className="text-sm font-semibold text-fg">
          Your odds per opening
        </h2>
        <a href="#odds" className="text-sm font-medium text-accent underline-offset-4 hover:underline">
          Box content and odds
        </a>
      </div>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        {tiers.map((r, i) => (
          <span key={r} className={swatch[r]} style={{ width: `${((raw[i] / total) * 100).toFixed(2)}%` }} />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {tiers.map((r) => (
          <li key={r} className="flex items-center gap-2 text-sm" title={`Exactly ${formatExactPercent(byTier[r] * 100)}`}>
            <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${swatch[r]}`} />
            <span className="font-medium text-fg">{label[r]}</span>
            <span className="ml-auto font-semibold tabular text-fg">{formatPercent(byTier[r] * 100)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
