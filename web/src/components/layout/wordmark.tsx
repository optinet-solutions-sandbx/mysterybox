import Link from "next/link";
import { brand } from "@/config/brand";
import { LogoMark } from "@/components/brand/logo-mark";

/** Crown-and-mask mark in foil, then the name in inscriptional capitals. */
export function Wordmark() {
  return (
    <Link href="/" aria-label={`${brand.name} home`} className="group flex items-center gap-2.5">
      <LogoMark className="w-11 transition-transform duration-500 ease-snap group-hover:-translate-y-0.5" />
      <span className="font-display text-[17px] tracking-[0.14em] whitespace-nowrap text-fg max-sm:hidden">
        {brand.name}
      </span>
    </Link>
  );
}
