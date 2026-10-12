import type { Metadata } from "next";
import { BonusesView } from "@/components/admin/lists";

export const metadata: Metadata = { title: "Bonuses" };
// Client-gated (staff role checked in the browser); see app/admin/layout.tsx.
export const instant = false;

export default function AdminBonusesPage() {
  return <BonusesView />;
}
