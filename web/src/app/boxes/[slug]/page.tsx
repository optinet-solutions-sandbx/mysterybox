import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { boxStats, catalogBox, categoryLabels, getBox, listBoxes, resolveEntries } from "@/services/catalog";
import { BoxStage } from "@/components/box/box-stage";
import { InsideGrid } from "@/components/box/inside-grid";
import { BoxOdds } from "@/components/box/box-odds";
import { HowItWorksStrip } from "@/components/box/how-it-works-strip";

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
  const box = getBox((await params).slug);
  if (!box) notFound();

  const entries = resolveEntries(box);
  const stats = boxStats(box);

  return (
    <>
      <BoxStage
        box={box}
        entries={entries}
        catalog={catalogBox(box)}
        categoryLabel={categoryLabels[box.category]}
        stats={{ rtp: stats.rtp, topName: stats.top.item.name, topValue: stats.top.item.value, topProbability: stats.top.probability }}
      />

      <HowItWorksStrip />

      <section id="inside" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">What’s inside</h2>
        <p className="mt-3 max-w-2xl text-muted">
          Every outcome this box can give, with its listed value and the exact chance of getting it.
        </p>
        <div className="mt-8">
          <InsideGrid entries={entries} />
        </div>
      </section>

      <section id="odds" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-10 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">Box content and odds</h2>
        <div className="mt-6">
          <BoxOdds box={catalogBox(box)} />
        </div>
      </section>
    </>
  );
}
