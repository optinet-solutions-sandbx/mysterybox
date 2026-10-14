import type { Metadata } from "next";
import { SettingsView } from "@/components/admin/catalog-admin";

export const metadata: Metadata = { title: "Configuration" };
// Client-gated (staff role checked in the browser); see app/admin/layout.tsx.
export const instant = false;

export default function AdminSettingsPage() {
  return (
    <SettingsView />
  );
}
