import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { brand } from "@/config/brand";
import { Container, PageHeader } from "@/components/ui/layout";

const pages: Record<string, { title: string; summary: string; outline: string[] }> = {
  terms: {
    title: "Terms of service",
    summary: "The agreement between the player and the operator.",
    outline: ["Eligibility (age, permitted states)", "Accounts and verification", "Boxes, odds and sell-back", "Shipping and title transfer", "Prohibited conduct", "Disputes and governing law"],
  },
  privacy: {
    title: "Privacy policy",
    summary: "What personal data is collected and why.",
    outline: ["Data collected (account, KYC, shipping, device)", "Processors (payments, KYC, CRM, support)", "Cookies and consent", "US state privacy rights (e.g. CCPA/CPRA)", "Retention and deletion"],
  },
  "odds-disclosure": {
    title: "Odds disclosure",
    summary: "How odds, values and return-to-player are calculated and published.",
    outline: ["Where odds are shown", "How listed values are set and updated", "Return-to-player definition", "Sell-back rate", "Verification (provably fair)"],
  },
  "responsible-play": {
    title: "Responsible play",
    summary: "Tools and help for keeping play fun.",
    outline: ["Most openings return less than the box price", "Deposit, loss and time limits", "Cool-off and self-exclusion", "Help: 1-800-GAMBLER and state resources"],
  },
  shipping: {
    title: "Shipping & returns",
    summary: "How physical items are delivered.",
    outline: ["Shipping regions (US at launch)", "Timelines and tracking", "Cancelling a pending request", "Authenticity and damaged-item claims"],
  },
};

/** Every slug is prerendered by generateStaticParams, so a blocking navigation is effectively instant. */
export const instant = false;

export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[slug]">): Promise<Metadata> {
  const page = pages[(await params).slug];
  return page ? { title: page.title } : {};
}

export default async function LegalPage({ params }: PageProps<"/legal/[slug]">) {
  const page = pages[(await params).slug];
  if (!page) notFound();

  return (
    <>
      <PageHeader eyebrow="Legal" title={page.title} intro={page.summary} />
      <Container className="max-w-3xl py-10">
        <div className="rounded-card bg-accent-soft p-5 text-sm ring-1 ring-line">
          Placeholder. Final wording must come from {brand.legalEntity}’s counsel before any public launch.
        </div>
        <h2 className="mt-10 text-lg font-semibold">Planned sections</h2>
        <ol className="mt-4 grid list-decimal gap-2 pl-5 text-muted">
          {page.outline.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </Container>
    </>
  );
}
