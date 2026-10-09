import type { Metadata } from "next";
import { InventoryView } from "@/components/account/inventory-view";
import { Container, PageHeader } from "@/components/ui/layout";

export const metadata: Metadata = { title: "Inventory" };

export default function InventoryPage() {
  return (
    <>
      <PageHeader eyebrow="Your pieces" title="Inventory" intro="Everything you’ve opened. Ship it home or sell it back for credit." />
      <Container className="py-10">
        <InventoryView />
      </Container>
    </>
  );
}
