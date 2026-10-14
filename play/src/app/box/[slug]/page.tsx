import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { economy } from "@/config/economy";
import { BoxHero } from "@/components/boxes/box-hero";
import { BuyButton } from "@/components/boxes/buy-button";
import { DropTimer } from "@/components/boxes/drop-band";
import { TierTable } from "@/components/boxes/odds-sheet";
import { ItemArt } from "@/components/item/item-art";
import { RarityTag } from "@/components/item/rarity-tag";
import { formatDisplayedOdds, formatUsd } from "@/domain/money";
import { allBoxes, boxBySlug, resolveEntries, valueRange } from "@/services/catalog";
import { BACK, PageTransition } from "@/components/shell/page-transition";

export function generateStaticParams() {
  return allBoxes().map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: PageProps<"/box/[slug]">): Promise<Metadata> {
  const box = boxBySlug((await params).slug);
  if (!box) return {};
  const { min, max } = valueRange(box);
  return {
    title: box.name,
    description: `${box.tagline} ${formatUsd(box.price)} a box, pieces from ${formatUsd(min)} to ${formatUsd(max)}.`,
  };
}

export default async function BoxPage({ params }: PageProps<"/box/[slug]">) {
  const box = boxBySlug((await params).slug);
  if (!box) notFound();
  const { min, max } = valueRange(box);
  const entries = resolveEntries(box);

  return (
    <PageTransition>
    <div className="mx-auto max-w-7xl px-4 pt-4 md:px-8 md:pt-8">
      <Link href="/" transitionTypes={BACK} className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-fg">
        <ChevronLeft className="size-4" />
        All boxes
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <BoxHero box={box} />
          <div className="mt-4 grid grid-cols-2 rounded-2xl border border-line/80 bg-surface/60 py-3 text-center">
            <div>
              <p className="text-xs text-muted">Min value</p>
              <p className="font-display text-lg font-semibold tabular">{formatUsd(min)}</p>
            </div>
            <div className="border-l border-line/80">
              <p className="text-xs text-muted">Max value</p>
              <p className="font-display text-lg font-bold text-accent tabular">{formatUsd(max)}</p>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <h1 className="font-display text-4xl md:text-5xl">{box.name}</h1>
          <p className="mt-2 text-lg text-muted">{box.tagline}</p>
          {box.drop && <DropTimer className="mt-3" />}
          <p className="mt-5 font-display text-3xl font-bold text-accent tabular">{formatUsd(box.price)}</p>
          <BuyButton box={box} className="mt-5 hidden w-full lg:inline-flex" />
          <p className="mt-3 text-sm text-subtle">
            Keep what you pull for up to {economy.vaultDays} days, ship it, or sell it back for{" "}
            {Math.round(economy.sellBackRate * 100)}% of its value.
          </p>

          <section aria-labelledby="odds" className="mt-10">
            <h2 id="odds" className="font-punch text-2xl">
              Odds
            </h2>
            <p className="mt-1 text-sm text-muted">The chances the draw uses. They never change after you buy.</p>
            <TierTable box={box} className="mt-4" />
          </section>

          <section aria-labelledby="inside" className="mt-10">
            <h2 id="inside" className="font-punch text-2xl">
              Every piece inside
            </h2>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {entries.map((e, i) => (
                <li key={e.item.id} className="overflow-hidden rounded-3xl border border-line/80 bg-surface/50">
                  <ItemArt item={e.item} rarity={e.rarity} showBrand={false} sizes="(min-width: 1024px) 180px, 45vw" priority={i < 3} />
                  <div className="p-3">
                    <p className="truncate text-xs font-semibold tracking-wide text-muted">{e.item.brand}</p>
                    <p className="truncate text-sm font-medium">{e.item.name}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="font-display text-sm font-semibold tabular">{formatUsd(e.item.value)}</span>
                      <span className="text-xs font-semibold tabular text-muted">{formatDisplayedOdds(e.probability)}</span>
                    </div>
                    <RarityTag rarity={e.rarity} className="mt-1" />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* Phones: the price and Buy stay in reach above the tab bar. */}
      <div className="fixed inset-x-0 bottom-[calc(4.6rem+env(safe-area-inset-bottom))] z-30 border-t border-line/70 bg-bg px-4 py-3 lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-4">
          <div className="min-w-0">
            <p className="truncate text-xs text-muted">{box.name}</p>
            <p className="font-display text-lg font-bold text-accent tabular">{formatUsd(box.price)}</p>
          </div>
          <BuyButton box={box} size="md" className="ml-auto flex-1" />
        </div>
      </div>
      <div className="h-20 lg:hidden" aria-hidden />
    </div>
    </PageTransition>
  );
}
