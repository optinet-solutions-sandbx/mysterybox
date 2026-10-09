import type { LucideIcon } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/layout";

/**
 * Placeholder for a mode that is specced but not built yet. Shows the planned behaviour so
 * reviewers can judge the flow before it exists. Spec: docs/03-product-spec.md.
 */
export function ComingSoon({
  eyebrow,
  title,
  intro,
  icon: Icon,
  planned,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  icon: LucideIcon;
  planned: string[];
}) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} intro={intro} />
      <Container className="py-12">
        <div className="grid gap-8 rounded-card bg-surface p-8 ring-1 ring-line md:grid-cols-[auto_1fr]">
          <div className="grid size-16 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Icon className="size-8" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-subtle uppercase">Planned for the next build</p>
            <ul className="mt-4 grid gap-3">
              {planned.map((line) => (
                <li key={line} className="flex gap-3 text-muted">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  {line}
                </li>
              ))}
            </ul>
            <ButtonLink href="/boxes" variant="secondary" className="mt-8">
              Open a box instead
            </ButtonLink>
          </div>
        </div>
      </Container>
    </>
  );
}
