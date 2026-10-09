import type { Metadata } from "next";
import { Gift } from "lucide-react";
import { ComingSoon } from "@/components/common/coming-soon";

export const metadata: Metadata = { title: "Daily rewards" };

export default function RewardsPage() {
  return (
    <ComingSoon
      eyebrow="Free"
      title="Daily rewards"
      intro="One free box every day. Your level decides which box you get."
      icon={Gift}
      planned={[
        "Level ladder with XP earned from openings; each tier unlocks a better daily box.",
        "Claim window of 24 hours; unclaimed boxes expire and do not stack.",
        "Countdown to the next claim, shown on the header once claimed.",
        "Free-entry route (no purchase necessary) to be confirmed with counsel.",
      ]}
    />
  );
}
