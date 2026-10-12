import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { boxStats, categoryLabels, getBox, listBoxes, resolveEntries } from "@/services/catalog";
import { BoxStage } from "@/components/box/box-stage";
import { InsideGrid } from "@/components/box/inside-grid";
import { OddsTable } from "@/components/box/odds-table";

/** Every slug is prerendered by generateStaticParams, so a blocking navigation is effectively instant. */
export const instant = false;

export function generateStaticParams() {
  return listBoxes().map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: PageProps<"/boxes/[slug]">): Promise<Metadata> {
  const box = getBox((await params).slug);
  return box ? { title: box.name, description: box.tagline } : {};
}

export default async function BoxPage({ params }: PageProps<"/boxes/[slug]">) {
  preload("/textures/marble-dark.webp", { as: "image", fetchPriority: "high" });
  const box = getBox((await params).slug);
  if (!box) notFound();

  const entries = resolveEntries(box);
  const stats = boxStats(box);

  return (
    <>
      <BoxStage
        box={box}
        entries={entries}
        categoryLabel={categoryLabels[box.category]}
        stats={{ rtp: stats.rtp, topName: stats.top.item.name, topValue: stats.top.item.value, topProbability: stats.top.probability }}
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl sm:text-4xl">What’s inside</h2>
        <p className="mt-3 max-w-2xl text-muted">
          Every piece this box can contain, with its listed value and the exact chance of getting it.
        </p>
        <div className="mt-8">
          <InsideGrid entries={entries} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl">Odds and roll ranges</h2>
        <div className="mt-6">
          <OddsTable entries={entries} />
        </div>
        <p className="mt-4 max-w-3xl text-sm text-subtle">
          Values are listed retail or resale prices, which are also used for sell-back. Average return is the
          probability-weighted listed value divided by the box price. Individual openings vary widely, and most return
          less than the price.
        </p>
      </section>
    </>
  );
}
