import type { Metadata } from "next";
import { Swords } from "lucide-react";
import { ComingSoon } from "@/components/common/coming-soon";

export const metadata: Metadata = { title: "Battles" };

export default function BattlesPage() {
  return (
    <ComingSoon
      eyebrow="Multiplayer"
      title="Battles"
      intro="Open the same set of boxes against other players, round by round. The highest total takes everything."
      icon={Swords}
      planned={[
        "Lobby of open and live battles with entry price, boxes, mode and seats filled.",
        "Create a battle: pick boxes (each is one round), mode, and 2–4 seats (1v1, 1v1v1, 2v2…).",
        "Empty seats can be filled with house bots so a battle always starts.",
        "Shared battle room: every player’s reel spins in sync each round, running totals update live.",
        "Results archive: anyone can replay a finished battle and verify each roll.",
        "Modes to confirm with the platform vendor (e.g. standard, crazy/lowest-wins, jackpot).",
      ]}
    />
  );
}
