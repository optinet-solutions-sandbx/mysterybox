import type { Metadata } from "next";
import { loadSiteSettings } from "@/services/catalog-source";
import { InventoryView } from "@/components/account/inventory-view";
import { Container, PageHeader } from "@/components/ui/layout";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const { tradeIn: tradeInEnabled } = await loadSiteSettings();
  return (
    <>
      <PageHeader eyebrow="Your pieces" title="Inventory" intro={tradeInEnabled ? "Everything you’ve opened. Ship it home or trade it in for credit." : "Everything you’ve opened, ready to ship home."} />
      <Container className="py-10">
        <InventoryView />
      </Container>
    </>
  );
}
