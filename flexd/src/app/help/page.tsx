import { ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { economy, shipping } from "@/config/economy";
import { formatUsd } from "@/domain/money";
import { PageTransition } from "@/components/shell/page-transition";

export const metadata: Metadata = { title: "Help" };

const sell = `${Math.round(economy.sellBackRate * 100)}%`;
const rtp = `${Math.round(economy.targetRtp * 100)}%`;

const SECTIONS: { title: string; items: [string, string][] }[] = [
  {
    title: "Boxes and opening",
    items: [
      [
        "How does a box work?",
        "You buy a box for its price and one piece is drawn the moment you pay. Opening the box shows you which one. Every box lists its pieces, its odds and its value range before you buy.",
      ],
      [
        "Where are the odds?",
        "Tap Odds on any box. You'll see the chance of each rarity tier and of every single piece. They are the exact numbers the draw uses, and they don't change after you buy.",
      ],
      [
        "What do Common, Rare and Grail mean?",
        "Tiers compare a piece's value with the box price. Grail is 25 times the price or more, Epic 5 times, Rare 1.5 times, Uncommon at least half, and Common less than half.",
      ],
      [
        "Is a box worth what I pay?",
        `Not every time. Boxes are priced so their pieces are worth about ${rtp} of the price on average. Most openings bring a piece worth less than you paid, and a few bring far more.`,
      ],
    ],
  },
  {
    title: "Your pieces",
    items: [
      ["What can I do with a piece?", `Keep it in your vault, ship it to your door, or sell it back for ${sell} of its value.`],
      [
        "How long can a piece stay in my vault?",
        `${economy.vaultDays} days. After that it sells back automatically for ${sell} of its value, and the money goes to your withdrawable balance.`,
      ],
      ["Can I undo a sale?", "No. Sales are final, which is why selling takes a swipe instead of a tap."],
      [
        "Are the pieces authentic?",
        "Before launch, every piece will be authenticated before it ships, and each listing will say whether it is new or pre-owned. This prototype uses placeholder photos.",
      ],
    ],
  },
  {
    title: "Balances and payments",
    items: [
      [
        "What is the difference between Credit and Withdrawable?",
        "Credit is money you added plus rewards. It buys boxes and shipping and can't be cashed out. Withdrawable comes from pieces you sold back. You can cash it out, and it is spent on boxes only after your credit runs out.",
      ],
      ["How do I add funds?", "Tap the plus next to your balance and pay with Apple Pay, Google Pay or a card. In this prototype nothing is charged."],
      [
        "How do I cash out?",
        `Open Wallet and choose Cash out. The smallest cash-out is ${formatUsd(economy.minWithdrawal)}. Venmo usually takes 1 to 5 business days, a bank transfer 2 to 5, and a same-day transfer arrives within 24 hours on weekdays.`,
      ],
    ],
  },
  {
    title: "Shipping",
    items: [
      [
        "What does shipping cost?",
        `${formatUsd(shipping.base)} for the first piece and ${formatUsd(shipping.extraPiece)} for each extra piece in the same shipment. Pieces worth ${formatUsd(shipping.insuredFrom)} or more travel insured, which adds ${shipping.insuranceRate * 100}% of their value. You see the full cost before you pay.`,
      ],
      ["How long does delivery take?", `We dispatch within ${shipping.dispatchDays} business days with ${shipping.carrier} and send tracking as soon as it leaves.`],
      ["Where do you ship?", `To addresses in the ${brand.market} only.`],
    ],
  },
  {
    title: "Account and referrals",
    items: [
      [
        "How do referrals work?",
        `Share your code from Rewards. A friend who signs up with it gets ${formatUsd(economy.referralReward)} of credit, and you get ${formatUsd(economy.referralReward)} when they open their first box.`,
      ],
      ["Who can sign up?", `Adults ${brand.minimumAge} and over living in the ${brand.market}.`],
      ["Where is my account kept?", "In this prototype, in this browser only. Another browser or device starts fresh."],
    ],
  },
  {
    title: "Playing within your means",
    items: [
      [
        "How do I keep it fun?",
        `Decide what you are happy to spend before you open anything, and stop when you reach it. If opening boxes stops being fun, take a break, and write to ${brand.supportEmail} if you'd like your account paused.`,
      ],
    ],
  },
];

const slug = (t: string) => t.toLowerCase().replace(/\W+/g, "-");

export default function HelpPage() {
  return (
    <PageTransition>
    <div className="mx-auto max-w-3xl px-4 pt-6 md:px-8 md:pt-12">
      <h1 className="font-hero text-[clamp(2.25rem,11vw,3rem)] md:text-7xl">Help</h1>
      <p className="mt-2 text-muted">Answers about boxes, your pieces, payments, shipping and your account.</p>
      <div className="mt-10 space-y-10">
        {SECTIONS.map((s) => (
          <section key={s.title} aria-labelledby={slug(s.title)}>
            <h2 id={slug(s.title)} className="font-punch text-2xl">
              {s.title}
            </h2>
            <div className="mt-3 divide-y divide-line/70 rounded-3xl border border-line/80 bg-surface/40 px-5">
              {s.items.map(([q, a]) => (
                <details key={q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                    {q}
                    <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-2 text-muted">{a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
    </PageTransition>
  );
}
