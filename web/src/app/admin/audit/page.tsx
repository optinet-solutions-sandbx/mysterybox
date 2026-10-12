import type { Metadata } from "next";
import { RequirePermission } from "@/components/admin/admin-shell";
import { AuditView } from "@/components/admin/audit-view";

export const metadata: Metadata = { title: "Audit log" };
// Client-gated (staff role checked in the browser); see app/admin/layout.tsx.
export const instant = false;

export default function AdminAuditPage() {
  return (
    <RequirePermission permission="audit.view">
      <AuditView />
    </RequirePermission>
  );
}
