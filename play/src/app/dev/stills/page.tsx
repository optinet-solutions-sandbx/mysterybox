import { notFound } from "next/navigation";
import { StillsRenderer } from "@/components/chest/stills-renderer";

/** Development only: renders each chest finish for scripts/render_box_stills.py. */
export default function StillsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StillsRenderer />;
}
