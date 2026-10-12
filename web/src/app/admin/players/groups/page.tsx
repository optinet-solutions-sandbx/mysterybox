import type { Metadata } from "next";
import { GroupsView } from "@/components/admin/lists";

export const metadata: Metadata = { title: "Groups" };
// Client-gated (staff role checked in the browser); see app/admin/layout.tsx.
export const instant = false;

export default function AdminPlayersGroupsPage() {
  return <GroupsView />;
}
