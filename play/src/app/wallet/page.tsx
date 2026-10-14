import type { Metadata } from "next";
import { WalletView } from "@/components/wallet/wallet-view";

export const metadata: Metadata = { title: "Wallet" };

export default function WalletPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 md:px-8 md:pt-12">
      <h1 className="font-display text-4xl md:text-5xl">Wallet</h1>
      <div className="mt-8">
        <WalletView />
      </div>
    </div>
  );
}
