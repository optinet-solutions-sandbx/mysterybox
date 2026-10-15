import type { Metadata } from "next";
import { ShowroomView } from "@/components/showroom/showroom-view";
import { allBoxes, allItems } from "@/services/catalog";
import { PageTransition } from "@/components/shell/page-transition";

export const metadata: Metadata = { title: "Showroom" };

export default function ShowroomPage() {
  return (
    <PageTransition>
    <div className="mx-auto max-w-7xl px-4 pt-6 md:px-8 md:pt-12">
      <h1 className="font-punch text-[clamp(2rem,10vw,2.75rem)] md:text-7xl">Showroom</h1>
      <p className="mt-2 max-w-xl text-muted">
        All {allItems().length} pieces across our {allBoxes().length} boxes. Choose one to see which boxes hold it and your
        chance of pulling it there.
      </p>
      <div className="mt-8">
        <ShowroomView />
      </div>
    </div>
    </PageTransition>
  );
}
