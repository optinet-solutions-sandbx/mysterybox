import type { Metadata } from "next";
import { Suspense } from "react";
import { BoxConfigView } from "@/components/admin/catalog-admin";

export const metadata: Metadata = { title: "Configure box" };
// Client-gated (staff role checked in the browser); see app/admin/layout.tsx.
export const instant = false;

export default function AdminBoxesConfigurePage() {
  return (
    <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-2xl bg-surface" />}>
      <BoxConfigView />
    </Suspense>
  );
}
