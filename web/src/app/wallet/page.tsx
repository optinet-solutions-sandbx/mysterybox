import type { Metadata } from "next";
import { WalletView } from "@/components/account/wallet-view";
import { Container, PageHeader } from "@/components/ui/layout";

export const metadata: Metadata = { title: "Wallet" };

export default function WalletPage() {
  return (
    <>
      <PageHeader eyebrow="Balance" title="Wallet" intro="Demo credits for reviewing the prototype. Nothing here moves real money." />
      <Container className="py-10">
        <WalletView />
      </Container>
    </>
  );
}
