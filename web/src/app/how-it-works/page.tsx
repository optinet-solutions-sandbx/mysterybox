import type { Metadata } from "next";
import { formatUsd } from "@/domain/money";
import { getCatalog, loadSiteSettings } from "@/services/catalog-source";
import { Faq } from "@/components/landing/faq";
import { OddsProof } from "@/components/landing/odds-proof";
import { Ritual } from "@/components/landing/ritual";
import { PageHeader } from "@/components/ui/layout";

export const metadata: Metadata = { title: "How it works" };

export default async function HowItWorksPage() {
  const { boxStats, getBox, findItem, listBoxes, listShowcaseItems, resolveEntries } = await getCatalog();
  const { tradeIn: tradeInEnabled } = await loadSiteSettings();
  const prices = listBoxes().map((b) => b.price);
  const proofBox = getBox("jewel-vault") ?? listBoxes()[0];
  return (
    <>
      <PageHeader
        title="How it works"
        intro={tradeInEnabled ? "Choose a box, open it, then ship the piece or trade it in. Odds, values and verification are all public." : "Choose a box, open it, then ship the piece home. Odds, values and verification are all public."}
      />
      <Ritual
        item={findItem("cartier-love") ?? listShowcaseItems(1)[0]}
        priceRange={`${formatUsd(Math.min(...prices))} – ${formatUsd(Math.max(...prices))}`}
      />
      <OddsProof boxName={proofBox.name} boxSlug={proofBox.slug} entries={resolveEntries(proofBox)} rtp={boxStats(proofBox).rtp} />
      <Faq />
    </>
  );
}
