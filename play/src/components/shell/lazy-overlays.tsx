"use client";

import dynamic from "next/dynamic";
import { useUi } from "@/store/ui";
import { loadAddFundsSheet, loadAuthSheet, loadOpenOverlay } from "./overlay-code";

/**
 * The opening screen, sign-up and Add funds only load once someone asks for them, so no page pays
 * for their code at startup. Once loaded they stay mounted, which keeps their exit animations.
 */
const OpenOverlay = dynamic(() => loadOpenOverlay().then((m) => m.OpenOverlay), { ssr: false });
const AuthSheet = dynamic(() => loadAuthSheet().then((m) => m.AuthSheet), { ssr: false });
const AddFundsSheet = dynamic(() => loadAddFundsSheet().then((m) => m.AddFundsSheet), { ssr: false });

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
