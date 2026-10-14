import type { Metadata } from "next";
import { ItemsView } from "@/components/admin/catalog-admin";

export const metadata: Metadata = { title: "Items" };
// Client-gated (staff role checked in the browser); see app/admin/layout.tsx.
export const instant = false;

export default function AdminItemsPage() {
  return (
    <ItemsView />
  );
}
