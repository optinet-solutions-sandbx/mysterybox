import type { Metadata } from "next";
import { Percent } from "lucide-react";
import { ComingSoon } from "@/components/common/coming-soon";

export const metadata: Metadata = { title: "Deals" };

export default function DealsPage() {
  return (
    <ComingSoon
      eyebrow="Targeted"
      title="Deals"
      intro="Choose the exact piece you want, set your chance, and pay a price that scales with it."
      icon={Percent}
      planned={[
        "Searchable item picker across the full catalog.",
        "Chance slider from 1% to a maximum of 80%; price = item value × chance ÷ RTP, shown live.",
        "Visual target zone on a dial; the pointer lands inside it for a hit.",
        "Hit: the item goes to inventory. Miss: nothing is returned (copy must say so plainly).",
        "Same seed/nonce verification as box openings.",
      ]}
    />
  );
}
