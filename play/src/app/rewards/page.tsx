import type { Metadata } from "next";
import { RewardsView } from "@/components/rewards/rewards-view";

export const metadata: Metadata = { title: "Rewards" };

export default function RewardsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 md:px-8 md:pt-12">
      <h1 className="font-display text-4xl md:text-5xl">Rewards</h1>
      <p className="mt-2 max-w-xl text-muted">Levels that grow with every box, and credit for every friend you bring.</p>
      <div className="mt-8">
        <RewardsView />
      </div>
    </div>
  );
}
