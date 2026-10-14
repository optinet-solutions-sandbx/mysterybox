import type { ReactNode } from "react";
import { Eye, PackageCheck, ShieldCheck } from "lucide-react";
import { brand } from "@/config/brand";
import { tradeInRate } from "@/config/features";
import { loadSiteSettings } from "@/services/catalog-source";
import { LogoMark } from "@/components/brand/logo-mark";
import { Container } from "@/components/ui/layout";

const reasonsFor = (tradeInEnabled: boolean) => [
  { icon: Eye, text: "Every box shows its odds before you open it." },
  { icon: PackageCheck, text: tradeInEnabled ? `Keep the piece, ship it home, or trade it in for ${tradeInRate} of its value in credit.` : "Keep the piece or ship it home." },
  { icon: ShieldCheck, text: "Every roll can be checked on the provably fair page." },
];

/** Register / sign-in frame: brand column on the left, the form card on the right (stacked on phones). */
export async function AuthShell({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  const reasons = reasonsFor((await loadSiteSettings()).tradeIn);
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden className="absolute -top-1/3 -left-1/4 -z-10 h-[140%] w-[90%] bg-[radial-gradient(closest-side,var(--aurora-b),transparent)]" />
      <Container className="grid items-start gap-8 py-10 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,500px)] lg:gap-20 lg:py-24">
        <div className="lg:sticky lg:top-28">
          <LogoMark className="w-20 sm:w-24" sizes="96px" />
          <p className="mt-6 font-display text-sm font-semibold text-accent">Your account</p>
          <h1 className="mt-2 font-display text-5xl leading-[0.95] font-semibold sm:text-6xl">{title}</h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">{intro}</p>
          <ul className="mt-10 hidden max-w-md gap-5 lg:grid">
            {reasons.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-accent">
                  <Icon className="size-[18px]" strokeWidth={1.75} />
                </span>
                <span className="pt-2 leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-10 hidden font-display text-xl text-foil lg:block">{brand.tagline}</p>
        </div>
        <div className="rounded-card border border-line bg-[image:var(--card)] p-6 shadow-[0_40px_80px_-40px_var(--shadow-strong)] sm:p-9">
          {children}
        </div>
      </Container>
    </section>
  );
}
