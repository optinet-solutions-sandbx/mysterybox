import type { Metadata } from "next";
import { User } from "lucide-react";
import { ComingSoon } from "@/components/common/coming-soon";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <ComingSoon
      eyebrow="Settings"
      title="Account"
      intro="Profile, verification, limits and shipping details."
      icon={User}
      planned={[
        "Sign up / sign in (email + social), with date of birth and state captured at sign-up.",
        "Identity verification (KYC) levels gating withdrawals and high-value shipping.",
        "Shipping addresses (US only at launch).",
        "Responsible-play tools: deposit limits, loss limits, cool-off and self-exclusion.",
        "Communication preferences.",
      ]}
    />
  );
}
