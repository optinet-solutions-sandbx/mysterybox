import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = { title: { default: "Back office", template: "%s · Back office" } };

// The mock checks the staff role in the browser, so pages render only after sign-in and there is
// nothing to validate for instant navigation. With Supabase the role check moves to the server
// (docs/08-backend.md) and this opt-out goes away.
export const instant = false;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
