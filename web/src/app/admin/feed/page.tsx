import type { Metadata } from "next";
import { FeedView } from "@/components/admin/lists";

export const metadata: Metadata = { title: "Feed" };
// Client-gated (staff role checked in the browser); see app/admin/layout.tsx.
export const instant = false;

export default function AdminFeedPage() {
  return <FeedView />;
}
