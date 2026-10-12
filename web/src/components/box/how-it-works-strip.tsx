import { economy } from "@/config/economy";

const steps = [
  {
    numeral: "I",
    title: "Open",
    body: "Pay the box price. The result is sealed by a seed committed before you open, so nobody can change it.",
  },
  {
    numeral: "II",
    title: "Reveal",
    body: "The reel lands on your piece. Every piece and its exact odds are listed below.",
  },
  {
    numeral: "III",
    title: "Keep, ship or sell back",
    body: `Keep it in your inventory, have it shipped, or sell it back instantly for ${Math.round(economy.sellBackRate * 100)}% of its value.`,
  },
];

/** Compact three-step explainer for the box page. */
export function HowItWorksStrip() {
  return (
    <section id="how-it-works" aria-labelledby="how-strip" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <h2 id="how-strip" className="font-display text-3xl font-semibold sm:text-4xl">
        How it works
      </h2>
      <ol className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map((s) => (
          <li key={s.numeral} className="rounded-2xl border border-line bg-surface p-6">
            <span className="font-display text-sm font-semibold text-foil">{s.numeral}</span>
            <h3 className="mt-2 text-lg font-semibold text-fg">{s.title}</h3>
            <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
