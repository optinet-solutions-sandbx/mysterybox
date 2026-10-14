import type { Metadata } from "next";
import { getCatalog } from "@/services/catalog-source";
import { BoxCatalog } from "@/components/box/box-catalog";
import { PageHeader } from "@/components/ui/layout";

export const metadata: Metadata = { title: "Boxes" };

export default async function BoxesPage() {
  const { boxStats, listBoxes } = await getCatalog();
  const boxes = listBoxes().map((box) => ({ box, top: boxStats(box).top.item }));
  return (
    <>
      <PageHeader
        title="The collection"
        intro="Every box lists every piece inside, its value and its exact odds. Choose a price and open."
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <BoxCatalog boxes={boxes} />
      </div>
    </>
  );
}
