"use client";

import dynamic from "next/dynamic";
import { useUi } from "@/store/ui";

/**
 * The opening screen, sign-up and Add funds only load once someone asks for them, so no page pays
 * for their code at startup. Once loaded they stay mounted, which keeps their exit animations.
 */
const OpenOverlay = dynamic(() => import("@/components/open/open-overlay").then((m) => m.OpenOverlay), { ssr: false });
const AuthSheet = dynamic(() => import("@/components/account/auth-sheet").then((m) => m.AuthSheet), { ssr: false });
const AddFundsSheet = dynamic(() => import("@/components/wallet/add-funds-sheet").then((m) => m.AddFundsSheet), { ssr: false });

export function LazyOverlays() {
  const wanted = useUi((s) => s.wanted);
  return (
    <>
      {wanted.open && <OpenOverlay />}
      {wanted.auth && <AuthSheet />}
      {wanted.funds && <AddFundsSheet />}
    </>
  );
}
