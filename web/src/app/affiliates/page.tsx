import type { Metadata } from "next";
import { Users } from "lucide-react";
import { ComingSoon } from "@/components/common/coming-soon";

export const metadata: Metadata = { title: "Refer a friend" };

export default function AffiliatesPage() {
  return (
    <ComingSoon
      eyebrow="Referrals"
      title="Refer a friend"
      intro="Share your code. Friends get free boxes; you earn a share of their activity."
      icon={Users}
      planned={[
        "Personal referral code and link, with copy and share buttons.",
        "Welcome offer for referred users (vendor default: 3 free boxes).",
        "Tiered commission dashboard: referred users, activity, earnings, claim button.",
        "Required disclosure copy for promoters (paid relationship, 18+, no targeting of restricted states).",
      ]}
    />
  );
}
