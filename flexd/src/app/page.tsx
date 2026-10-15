import { economy } from "@/config/economy";
import { BoxCard } from "@/components/boxes/box-card";
import { BoxShowcase } from "@/components/boxes/box-showcase";
import { DropBand } from "@/components/boxes/drop-band";
import { allBoxes } from "@/services/catalog";
import { PageTransition } from "@/components/shell/page-transition";

const sellPercent = Math.round(economy.sellBackRate * 100);

const STEPS = [
  { title: "Pick a box", body: "Every box shows its odds and its value range before you buy." },
  { title: "Swipe it open", body: "The piece is drawn the moment you buy, then the lid comes up." },
  { title: "Keep it or sell it", body: `Ship it home, or swipe to sell it back for ${sellPercent}% of its value.` },
];

function HowItWorks({ className }: { className?: string }) {
  return (
    <ol className={className}>
      {STEPS.map((s, i) => (
        <li key={s.title} className="flex gap-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-full border border-accent/40 font-display text-sm text-accent">
            {i + 1}
          </span>
          <div>
            <p className="font-semibold">{s.title}</p>
            <p className="text-sm text-muted">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function BoxesPage() {
  const boxes = allBoxes();
  return (
    <PageTransition>
    <div className="mx-auto max-w-7xl px-4 md:px-8">
      <section className="grid grid-cols-1 gap-10 pt-6 lg:grid-cols-[1fr_minmax(0,500px)] lg:items-center lg:gap-16 lg:pt-14">
        <div className="first-visit-only min-w-0">
          <h1 className="font-punch text-[46px] md:text-7xl lg:text-[88px]">Every box holds a real piece.</h1>
          <p className="mt-4 max-w-lg text-[17px] text-muted md:text-lg">
            Bags, watches, jewelry and beauty from the houses you know. Open a box, then keep the piece or sell it back for{" "}
            {sellPercent}% of its value.
          </p>
          <HowItWorks className="mt-10 hidden max-w-md space-y-6 lg:block" />
        </div>
        <BoxShowcase className="min-w-0" />
      </section>

      <HowItWorks className="first-visit-only mt-14 space-y-5 lg:hidden" />

      <div className="mt-16 md:mt-24">
        <DropBand />
      </div>

      <section aria-labelledby="all-boxes" className="mt-16 md:mt-24">
        <div className="flex items-baseline justify-between">
          <h2 id="all-boxes" className="font-punch text-3xl md:text-5xl">
            All boxes
          </h2>
          <p className="text-sm text-muted">{boxes.length} boxes</p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {boxes.map((b) => (
            <BoxCard key={b.id} box={b} />
          ))}
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
