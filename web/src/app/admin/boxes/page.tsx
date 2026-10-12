import type { Metadata } from "next";
import { BoxesView } from "@/components/admin/boxes-view";

export const metadata: Metadata = { title: "Boxes & odds" };
// Client-gated (staff role checked in the browser); see app/admin/layout.tsx.
export const instant = false;

export default function AdminBoxesPage() {
  return <BoxesView />;
}
