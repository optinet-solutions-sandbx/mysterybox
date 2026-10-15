import Link from "next/link";
import { button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-punch text-4xl">This page isn&apos;t here</h1>
      <p className="mt-3 text-muted">The link may be old, or the box may have left the shelf.</p>
      <Link href="/" className={button({ size: "lg", className: "mt-8" })}>
        See all boxes
      </Link>
    </div>
  );
}
