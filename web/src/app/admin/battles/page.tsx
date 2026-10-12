import type { Metadata } from "next";
import { BattlesView } from "@/components/admin/lists";

export const metadata: Metadata = { title: "Battles" };
// Client-gated (staff role checked in the browser); see app/admin/layout.tsx.
export const instant = false;

export default function AdminBattlesPage() {
  return <BattlesView />;
}
