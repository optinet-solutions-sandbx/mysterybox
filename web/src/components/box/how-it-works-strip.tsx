import { economy } from "@/config/economy";

export const steps = [
  {
    numeral: "I",
    title: "Open",
    body: "Pay the box price. The secret that decides your open is sealed before you pay, so nobody can change the result afterwards.",
  },
  {
    numeral: "II",
    title: "Reveal",
    body: "The box opens on the result and the piece or credit rises out. Every outcome and its exact odds are listed below.",
  },
  {
    numeral: "III",
    title: "Ship it or trade it in",
    body: `Have the piece shipped to you, or trade it in for ${Math.round(economy.sellBackRate * 100)}% of its value in site credit, which buys boxes and can’t be withdrawn.`,
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
