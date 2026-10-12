import type { Metadata } from "next";
import { RequirePermission } from "@/components/admin/admin-shell";
import { StaffView } from "@/components/admin/staff-view";

export const metadata: Metadata = { title: "Staff & roles" };
// Client-gated (staff role checked in the browser); see app/admin/layout.tsx.
export const instant = false;

export default function AdminStaffPage() {
  return (
    <RequirePermission permission="staff.manage">
      <StaffView />
    </RequirePermission>
  );
}
