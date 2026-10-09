import Link from "next/link";
import { brand } from "@/config/brand";

/** Foil monogram in a fine gold ring, as on the box. */
export function Wordmark() {
  return (
    <Link href="/" aria-label={`${brand.name} home`} className="group flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-full border border-accent/50 transition-colors group-hover:border-accent">
        <span className="font-display text-xl leading-none text-foil">{brand.monogram}</span>
      </span>
    </Link>
  );
}
