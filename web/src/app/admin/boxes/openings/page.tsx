import type { Metadata } from "next";
import { Suspense } from "react";
import { OpeningsView } from "@/components/admin/lists";

export const metadata: Metadata = { title: "Box openings" };
// Client-gated (staff role checked in the browser); see app/admin/layout.tsx.
export const instant = false;

export default function AdminBoxesOpeningsPage() {
  // Reads the query string with useSearchParams, which needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-2xl bg-surface" />}>
      <OpeningsView />
    </Suspense>
  );
}
