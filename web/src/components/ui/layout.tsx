import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

/** Small gold line naming where you are (used sparingly, not above every heading). */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("font-display text-sm text-accent", className)}>{children}</p>;
}

export function SectionHeading({ title, className }: { title: ReactNode; className?: string }) {
  return <h2 className={cn("mb-8 font-display text-4xl leading-tight sm:text-5xl", className)}>{title}</h2>;
}

export function PageHeader({ eyebrow, title, intro }: { eyebrow?: string; title: ReactNode; intro?: ReactNode }) {
  return (
    <header className="relative isolate overflow-hidden border-b border-line pt-16 pb-12 sm:pt-24">
      <div aria-hidden className="absolute -top-1/2 left-1/4 -z-10 h-[200%] w-[70%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--sapphire)_45%,transparent),transparent)]" />
      <Container>
        {eyebrow && <Eyebrow className="mb-4">{eyebrow}</Eyebrow>}
        <h1 className="font-display text-5xl leading-[0.95] sm:text-7xl">{title}</h1>
        {intro && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{intro}</p>}
      </Container>
    </header>
  );
}
