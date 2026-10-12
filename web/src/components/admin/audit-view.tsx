"use client";

import { ROLE_LABEL } from "@/backend/contract";
import { useBackoffice } from "@/store/backoffice";
import { Panel, PageTitle, formatDateTime } from "./ui";

const ACTION_LABEL: Record<string, string> = {
  "player.status": "Changed a player's status",
  "role.change": "Changed a role",
  "staff.create": "Added a staff member",
  "transaction.settle": "Settled a withdrawal",
  "wallet.adjust": "Adjusted a balance",
  "box.status": "Changed a box's status",
  "shipment.update": "Updated a shipment",
  "testdata.clear": "Cleared test data in this browser",
};

function describe(detail: Record<string, unknown>): string {
  return Object.entries(detail)
    .filter(([k, v]) => k !== "by" && v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${String(v).replace(/_/g, " ")}`)
    .join(" · ");
}

export function AuditView() {
  const audit = useBackoffice((s) => s.audit);
  return (
    <>
      <PageTitle title="Audit log" intro="Every staff action, newest first. Nobody can edit or delete entries (public.audit_log is insert-only and readable by super admins)." />
      <Panel>
        {audit.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">No staff actions yet. Suspending a player or changing a role shows up here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-line text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">When</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Who</th>
                  <th scope="col" className="px-5 py-3 font-semibold">What</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {audit.map((e) => (
                  <tr key={e.id}>
                    <td className="px-5 py-3 whitespace-nowrap text-muted tabular">{formatDateTime(e.createdAt)}</td>
                    <td className="px-5 py-3">
                      <span className="block font-semibold">{String(e.detail.by ?? e.actorId)}</span>
                      <span className="text-xs text-muted">{e.actorRole ? ROLE_LABEL[e.actorRole] : "System"}</span>
                    </td>
                    <td className="px-5 py-3 font-medium">{ACTION_LABEL[e.action] ?? e.action}</td>
                    <td className="px-5 py-3 text-muted">{describe(e.detail)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
