"use client";

import { createContext, use, type ReactNode } from "react";
import { tradeInDefault } from "@/config/features";
import type { SiteSettings } from "@/services/catalog-source";

const SiteSettingsContext = createContext<SiteSettings>({ tradeIn: tradeInDefault });

/** Hands the server-loaded site settings (back office → Configuration) to client components. */
export function SiteSettingsProvider({ value, children }: { value: SiteSettings; children: ReactNode }) {
  return <SiteSettingsContext value={value}>{children}</SiteSettingsContext>;
}

/** Whether players can trade pieces in for site credit right now. */
export function useTradeIn(): boolean {
  return use(SiteSettingsContext).tradeIn;
}
