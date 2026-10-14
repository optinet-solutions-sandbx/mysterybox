import { allItems } from "@/services/catalog";
import { renderCard } from "../card";

export function generateStaticParams() {
  return allItems().map((i) => ({ itemId: i.id }));
}

/** 9:16 story image for TikTok and Instagram, used by the share sheet's "Save image". */
export async function GET(_: Request, { params }: RouteContext<"/pull/[itemId]/story">) {
  return renderCard((await params).itemId, "story");
}
