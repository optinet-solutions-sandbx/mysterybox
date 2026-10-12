import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentsView } from "@/components/admin/lists";

export const metadata: Metadata = { title: "Payments" };
// Client-gated (staff role checked in the browser); see app/admin/layout.tsx.
export const instant = false;

export default function AdminPaymentsPage() {
  // Reads the query string with useSearchParams, which needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-2xl bg-surface" />}>
      <PaymentsView />
    </Suspense>
  );
}
