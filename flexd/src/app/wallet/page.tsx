import type { Metadata } from "next";
import { WalletView } from "@/components/wallet/wallet-view";
import { PageTransition } from "@/components/shell/page-transition";

export const metadata: Metadata = { title: "Wallet" };

export default function WalletPage() {
  return (
    <PageTransition>
    <div className="mx-auto max-w-3xl px-4 pt-6 md:px-8 md:pt-12">
      <h1 className="font-punch text-[clamp(2rem,10vw,2.75rem)] md:text-7xl">Wallet</h1>
      <div className="mt-8">
        <WalletView />
      </div>
    </div>
    </PageTransition>
  );
}
