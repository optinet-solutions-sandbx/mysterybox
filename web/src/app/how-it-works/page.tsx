import type { Metadata } from "next";
import { formatUsd } from "@/domain/money";
import { boxStats, getBox, getItem, listBoxes, resolveEntries } from "@/services/catalog";
import { Faq } from "@/components/landing/faq";
import { OddsProof } from "@/components/landing/odds-proof";
import { Ritual } from "@/components/landing/ritual";
import { PageHeader } from "@/components/ui/layout";

export const metadata: Metadata = { title: "How it works" };

export default function HowItWorksPage() {
  const prices = listBoxes().map((b) => b.price);
  const proofBox = getBox("jewel-vault")!;
  return (
    <>
      <PageHeader
        title="How it works"
        intro="Choose a box, open it, then keep the piece or sell it back. Odds, values and verification are all public."
      />
      <Ritual
        item={getItem("cartier-love")}
        priceRange={`${formatUsd(Math.min(...prices))} – ${formatUsd(Math.max(...prices))}`}
      />
      <OddsProof boxName={proofBox.name} boxSlug={proofBox.slug} entries={resolveEntries(proofBox)} rtp={boxStats(proofBox).rtp} />
      <Faq />
    </>
  );
}
