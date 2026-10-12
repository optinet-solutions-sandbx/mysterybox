import Link from "next/link";
import { brand } from "@/config/brand";
import { footerNav } from "@/config/nav";
import Image from "next/image";
import { LOCKUP_SIZE, LOGO_LOCKUP_SRC } from "@/components/brand/logo-mark";

export function SiteFooter() {
  return (
    <footer className="relative mt-10 overflow-hidden border-t border-line">
      <div aria-hidden className="absolute inset-0 -z-10 bg-marble opacity-50" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-bg via-bg/70 to-bg" />

      <div className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8">
        <div aria-hidden className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <p className="font-display">
            <span className="block text-[clamp(1.4rem,3.6vw,3rem)] leading-tight text-fg">{brand.taglineLines[0]}</span>
            <span className="block text-[clamp(3.4rem,11vw,9rem)] leading-[0.92] text-foil">{brand.taglineLines[1]}</span>
          </p>
          <Image
            src={LOGO_LOCKUP_SRC}
            width={LOCKUP_SIZE.width}
            height={LOCKUP_SIZE.height}
            sizes="(min-width: 640px) 240px, 176px"
            alt={brand.name}
            className="h-auto w-44 shrink-0 sm:w-60"
          />
        </div>
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
