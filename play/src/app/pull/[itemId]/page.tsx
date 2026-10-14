import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { brand } from "@/config/brand";
import { PiecePhoto } from "@/components/item/item-art";
import { RarityTag } from "@/components/item/rarity-tag";
import { PullInvite } from "@/components/pull/pull-invite";
import { button } from "@/components/ui/button";
import { formatDisplayedOdds, formatUsd } from "@/domain/money";
import { allItems, bestRarity, boxesHolding, getItem } from "@/services/catalog";
import { FORWARD, PageTransition } from "@/components/shell/page-transition";

export function generateStaticParams() {
  return allItems().map((i) => ({ itemId: i.id }));
}

function find(id: string) {
  try {
    return getItem(id);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps<"/pull/[itemId]">): Promise<Metadata> {
  const item = find((await params).itemId);
  if (!item) return {};
  const title = `${item.brand} ${item.name}, pulled on ${brand.name}`;
  const description = `Worth ${formatUsd(item.value)}. Open a box on ${brand.name}, then keep the piece or sell it back.`;
  return { title, description, openGraph: { title, description }, twitter: { card: "summary_large_image", title, description } };
}

/** Where a shared pull lands: the piece, what it's worth, and the boxes that hold it. */
export default async function PullPage({ params }: PageProps<"/pull/[itemId]">) {
  const item = find((await params).itemId);
  if (!item) notFound();
  const rarity = bestRarity(item.id) ?? "rare";
  const holders = boxesHolding(item.id).sort((a, b) => a.box.price - b.box.price);

  return (
    <PageTransition>
    <div className="mx-auto max-w-6xl px-4 pt-6 md:px-8 md:pt-12">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16">
        <div
          className="relative grid place-items-center overflow-hidden rounded-[36px] border border-line/70 bg-[var(--card)]"
          style={{ "--tone": `var(--rarity-${rarity})` } as CSSProperties}
        >
          <div aria-hidden className="absolute inset-0 bg-tone-light" />
          <PiecePhoto item={item} sizes="(min-width: 1024px) 520px, 90vw" className="relative w-full max-w-[520px]" />
        </div>
        <div className="min-w-0">
          <p className="text-muted">{item.brand}</p>
          <h1 className="mt-1 font-display text-4xl leading-tight md:text-5xl">{item.name}</h1>
          <p className="mt-3 font-display text-4xl font-semibold text-foil tabular">{formatUsd(item.value)}</p>
          <p className="mt-5 max-w-md text-muted">
            Someone pulled this from a box on {brand.name}. Every box shows its odds and value range before you buy, and anything
            you pull can be shipped home or sold back.
          </p>
          <PullInvite itemId={item.id} />
        </div>
      </div>

      <section aria-labelledby="holders" className="mt-14">
        <h2 id="holders" className="font-punch text-3xl">
          Boxes that hold it
        </h2>
        <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {holders.map(({ box, probability, rarity: r }) => (
            <li key={box.id} className="flex items-center gap-4 rounded-3xl border border-line/80 bg-surface/50 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg">{box.name}</p>
                <p className="mt-0.5 flex items-center gap-3 text-sm text-muted">
                  <span className="tabular">{formatUsd(box.price)} a box</span>
                  <RarityTag rarity={r} />
                </p>
              </div>
              <div className="text-right">
                <p className="font-display font-semibold tabular">{formatDisplayedOdds(probability)}</p>
                <p className="text-xs text-subtle">chance</p>
              </div>
              <Link href={`/box/${box.slug}`} transitionTypes={FORWARD} className={button({ variant: "outline", size: "sm" })}>
                View
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
    </PageTransition>
  );
}
