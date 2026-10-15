import type { Metadata } from "next";
import { CollectionView } from "@/components/collection/collection-view";
import { PageTransition } from "@/components/shell/page-transition";

export const metadata: Metadata = { title: "Collection" };

export default function CollectionPage() {
  return (
    <PageTransition>
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-24 md:px-8 md:pt-12">
      <h1 className="font-hero text-[clamp(2.25rem,11vw,3rem)] md:text-7xl">Collection</h1>
      <p className="mt-2 max-w-xl text-muted">Everything you pulled: waiting in your vault, on its way to you, or sold.</p>
      <div className="mt-8">
        <CollectionView />
      </div>
    </div>
    </PageTransition>
  );
}
