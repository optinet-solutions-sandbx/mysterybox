"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AccountStatus, AuditEntry } from "@/backend/contract";

/**
 * Back-office state the mock has nowhere else to keep (Supabase: profiles.status, audit_log,
 * player_comments, player_tags, player_locks). Keyed by player id.
 */

export interface PlayerComment {
  id: string;
  at: string;
  by: string;
  text: string;
}

/** CS: a lock staff put on the account. SB: self-exclusion (the player's own block). */
export interface PlayerLock {
  id: string;
  type: "cs" | "sb";
  reason: string;
  comment: string;
  createdAt: string;
  by: string;
  removedAt?: string;
  removedBy?: string;
}

interface BackofficeState {
  demoStatus: Record<string, AccountStatus>;
  audit: AuditEntry[];
  comments: Record<string, PlayerComment[]>;
  tags: Record<string, string[]>;
  locks: Record<string, PlayerLock[]>;
  setDemoStatus(playerId: string, status: AccountStatus): void;
  log(entry: Omit<AuditEntry, "id" | "createdAt">): void;
  addComment(playerId: string, by: string, text: string): void;
  setTags(playerId: string, tags: string[]): void;
  addLock(playerId: string, lock: Omit<PlayerLock, "id" | "createdAt">): PlayerLock;
  removeLock(playerId: string, lockId: string, by: string): PlayerLock | null;
  /** Drops everything recorded about these players. */
  forget(playerIds: string[]): void;
  clear(): void;
}

const without = <T,>(record: Record<string, T>, ids: Set<string>) => Object.fromEntries(Object.entries(record).filter(([k]) => !ids.has(k)));

export const useBackoffice = create<BackofficeState>()(
  persist(
    (set, get) => ({
      demoStatus: {},
      audit: [],
      comments: {},
      tags: {},
      locks: {},
      setDemoStatus(playerId, status) {
        set((s) => ({ demoStatus: { ...s.demoStatus, [playerId]: status } }));
      },
      log(entry) {
        set((s) => ({
          audit: [{ ...entry, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...s.audit].slice(0, 500),
        }));
      },
      addComment(playerId, by, text) {
        const comment = { id: crypto.randomUUID(), at: new Date().toISOString(), by, text };
        set((s) => ({ comments: { ...s.comments, [playerId]: [comment, ...(s.comments[playerId] ?? [])] } }));
      },
      setTags(playerId, tags) {
        set((s) => ({ tags: { ...s.tags, [playerId]: tags } }));
      },
      addLock(playerId, lock) {
        const created = { ...lock, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((s) => ({ locks: { ...s.locks, [playerId]: [created, ...(s.locks[playerId] ?? [])] } }));
        return created;
      },
      removeLock(playerId, lockId, by) {
        const lock = get().locks[playerId]?.find((l) => l.id === lockId && !l.removedAt);
        if (!lock) return null;
        const removed = { ...lock, removedAt: new Date().toISOString(), removedBy: by };
        set((s) => ({ locks: { ...s.locks, [playerId]: s.locks[playerId].map((l) => (l.id === lockId ? removed : l)) } }));
        return removed;
      },
      forget(playerIds) {
        const ids = new Set(playerIds);
        set((s) => ({
          demoStatus: without(s.demoStatus, ids),
          comments: without(s.comments, ids),
          tags: without(s.tags, ids),
          locks: without(s.locks, ids),
        }));
      },
      clear() {
        set({ demoStatus: {}, audit: [], comments: {}, tags: {}, locks: {} });
      },
    }),
    {
      name: "grailnoir-backoffice",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      migrate: (persisted) => ({ comments: {}, tags: {}, locks: {}, ...(persisted as object) }) as BackofficeState,
    },
  ),
);
