import Link from "next/link";
import { brand } from "@/config/brand";
import { footerNav } from "@/config/nav";

/** "More than a box." → ["More than", "a box."]: a deliberate two-line lockup. */
function splitInTwo(text: string) {
  const words = text.split(" ");
  const half = Math.ceil(words.length / 2);
  return [words.slice(0, half).join(" "), words.slice(half).join(" ")];
}

export function SiteFooter() {
  return (
    <footer className="relative mt-10 overflow-hidden border-t border-line">
      <div aria-hidden className="absolute inset-0 -z-10 bg-marble opacity-50" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-bg via-bg/70 to-bg" />

      <div className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8">
        <p aria-hidden className="font-display text-[14vw] leading-[0.88] text-foil lg:text-[9.5rem]">
          {splitInTwo(brand.tagline).map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
        <div className="mt-16 grid gap-12 lg:grid-cols-[1.1fr_2fr]">
          <p className="max-w-sm text-muted">{brand.description}</p>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {footerNav.map((group) => (
              <div key={group.title}>
                <p className="mb-4 font-display text-sm text-accent">{group.title}</p>
                <ul className="grid gap-2.5 text-[15px]">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-muted transition-colors hover:text-fg">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-16 border-t border-line">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-7 text-sm text-subtle sm:flex sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="max-w-3xl">
            {brand.minimumAge}+ only. Opening a box involves chance, and most openings return less than the box price.
            Set limits, and call 1-800-GAMBLER if it stops being fun.
          </p>
          <p className="shrink-0">© {brand.legalEntity}</p>
        </div>
      </div>
    </footer>
  );
}
