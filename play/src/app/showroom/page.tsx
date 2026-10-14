import type { Metadata } from "next";
import { ShowroomView } from "@/components/showroom/showroom-view";
import { allBoxes, allItems } from "@/services/catalog";

export const metadata: Metadata = { title: "Showroom" };

export default function ShowroomPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 md:px-8 md:pt-12">
      <h1 className="font-display text-4xl md:text-5xl">Showroom</h1>
      <p className="mt-2 max-w-xl text-muted">
        All {allItems().length} pieces across our {allBoxes().length} boxes. Choose one to see which boxes hold it and your
        chance of pulling it there.
      </p>
      <div className="mt-8">
        <ShowroomView />
      </div>
    </div>
  );
}
