import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { ComingSoon } from "@/components/common/coming-soon";

export const metadata: Metadata = { title: "Leaderboard" };

export default function LeaderboardPage() {
  return (
    <ComingSoon
      eyebrow="Races"
      title="Leaderboard"
      intro="Daily, weekly and monthly races ranked by total opened, with tiered prizes."
      icon={Trophy}
      planned={[
        "Tabs for daily / weekly / monthly races with a countdown to reset.",
        "Top 10 table (masked usernames) plus your own position pinned.",
        "Prize ladder per position, credited to balance at reset.",
        "Archive of past races and winners.",
      ]}
    />
  );
}
