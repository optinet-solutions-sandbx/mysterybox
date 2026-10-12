import type { Metadata } from "next";
import { Suspense } from "react";
import { PlayersView } from "@/components/admin/players-view";

export const metadata: Metadata = { title: "Players" };
// Client-gated (staff role checked in the browser); see app/admin/layout.tsx.
export const instant = false;

export default function AdminPlayersPage() {
  // PlayersView reads ?filter= and ?player= with useSearchParams, which needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-2xl bg-surface" />}>
      <PlayersView />
    </Suspense>
  );
}
