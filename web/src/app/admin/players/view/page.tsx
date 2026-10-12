import type { Metadata } from "next";
import { Suspense } from "react";
import { PlayerPage } from "@/components/admin/player-page";

export const metadata: Metadata = { title: "Player" };
// Client-gated (staff role checked in the browser); see app/admin/layout.tsx.
export const instant = false;

export default function AdminPlayersViewPage() {
  // Reads the query string with useSearchParams, which needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-2xl bg-surface" />}>
      <PlayerPage />
    </Suspense>
  );
}
