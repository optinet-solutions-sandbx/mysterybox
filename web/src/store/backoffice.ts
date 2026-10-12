"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AccountStatus, AuditEntry } from "@/backend/contract";

/**
 * Back-office state the mock has nowhere else to keep: status changes on the generated demo
 * players and the audit log (Supabase: profiles.status and public.audit_log).
 */
interface BackofficeState {
  demoStatus: Record<string, AccountStatus>;
  audit: AuditEntry[];
  setDemoStatus(playerId: string, status: AccountStatus): void;
  log(entry: Omit<AuditEntry, "id" | "createdAt">): void;
  clear(): void;
}

export const useBackoffice = create<BackofficeState>()(
  persist(
    (set) => ({
      demoStatus: {},
      audit: [],
      setDemoStatus(playerId, status) {
        set((s) => ({ demoStatus: { ...s.demoStatus, [playerId]: status } }));
      },
      clear() {
        set({ demoStatus: {}, audit: [] });
      },
      log(entry) {
        set((s) => ({
          audit: [{ ...entry, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...s.audit].slice(0, 500),
        }));
      },
    }),
    {
      name: "grailnoir-backoffice",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
