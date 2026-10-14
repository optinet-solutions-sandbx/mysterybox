import { brand } from "@/config/brand";
import { allItems } from "@/services/catalog";
import { renderCard } from "./card";

export const alt = `A piece pulled on ${brand.name}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return allItems().map((i) => ({ itemId: i.id }));
}

export default async function Image({ params }: { params: Promise<{ itemId: string }> }) {
  return renderCard((await params).itemId, "og");
}
