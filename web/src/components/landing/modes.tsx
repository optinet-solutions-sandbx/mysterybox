"use client";

import Link from "next/link";
import type { PointerEvent } from "react";

const modes = [
  { href: "/battles", title: "Battles", body: "Open the same boxes as other players, round by round. The highest total takes every piece." },
  { href: "/deals", title: "Deals", body: "Choose the exact piece you want and set your own chance, up to 80%. The price follows the chance." },
  { href: "/rewards", title: "Daily box", body: "A free box every day. The higher your level, the better the box." },
];

function track(e: PointerEvent<HTMLAnchorElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

/** Three ways to play, as rows rather than cards; a sapphire light follows the pointer. */
export function Modes() {
  return (
    <section className="py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-4xl sm:text-5xl">More ways to open.</h2>
        <ul className="mt-12 border-t border-line">
          {modes.map((m) => (
            <li key={m.href} className="border-b border-line">
              <Link
                href={m.href}
                onPointerMove={track}
                className="group relative grid gap-3 overflow-hidden py-9 transition-colors sm:grid-cols-[1fr_1.2fr_auto] sm:items-center sm:gap-10"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: "radial-gradient(420px circle at var(--mx) var(--my), color-mix(in oklab, var(--glow) 30%, transparent), transparent 70%)" }}
                />
                <span className="relative font-display text-4xl transition-transform duration-500 ease-snap group-hover:translate-x-3 sm:text-6xl">
                  {m.title}
                </span>
                <span className="relative max-w-md text-muted">{m.body}</span>
                <span className="relative text-sm text-accent">Preview</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
