"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { tradeInEnabled, tradeInRate } from "@/config/features";

const faqs: { q: string; a: ReactNode }[] = [
  {
    q: "Are the pieces authentic?",
    a: "Every piece is sourced from vetted suppliers and authenticated before it ships. (Prototype copy: sourcing partners are still to be confirmed.)",
  },
  {
    q: "What are my chances?",
    a: "Each box page lists every piece with its exact probability and the roll range that selects it. Most openings return less than the box price.",
  },
  {
    q: "What happens to pieces I don’t want?",
    a: tradeInEnabled
      ? `Trade them in for ${tradeInRate} of their listed value in site credit, which buys boxes and can't be withdrawn, or keep them in your inventory for later.`
      : "Keep them in your inventory and have them shipped when you're ready.",
  },
  {
    q: "How does shipping work?",
    a: "Request shipping from your inventory. You can cancel while the request is pending; once it’s being prepared, contact support.",
  },
  {
    q: "How do I know a result wasn’t changed?",
    a: (
      <>
        Before you open, we commit to a hashed server seed. Rotate your seeds and you can recompute every result on the{" "}
        <Link href="/provably-fair" className="text-accent underline underline-offset-4">
          provably fair
        </Link>{" "}
        page.
      </>
    ),
  },
];

export function Faq({ limit }: { limit?: number }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <h2 className="font-display text-4xl sm:text-5xl">Questions, answered.</h2>
        <ul className="border-t border-line">
          {faqs.slice(0, limit).map(({ q, a }, i) => {
            const isOpen = open === i;
            return (
              <li key={q} className="border-b border-line">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-6 py-6 text-left text-lg"
                >
                  {q}
                  <motion.span aria-hidden animate={{ rotate: isOpen ? 45 : 0 }} className="text-2xl leading-none text-accent">
                    +
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl pb-6 leading-relaxed text-muted">{a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
