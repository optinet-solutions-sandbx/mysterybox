import { create } from "zustand";
import type { Pull } from "./app";

/** Sheets and toasts that any screen can open. Not persisted. */
interface UiState {
  auth: "sign-up" | "sign-in" | null;
  addFunds: boolean;
  toast: { id: number; text: string } | null;
  /** The box being opened right now; the piece is already drawn. */
  opening: { slug: string; pull: Pull } | null;
}

export const useUi = create<UiState>()(() => ({ auth: null, addFunds: false, toast: null, opening: null }));

export function openAuth(mode: "sign-up" | "sign-in" = "sign-up") {
  useUi.setState({ auth: mode });
}

export function closeAuth() {
  useUi.setState({ auth: null });
}

export function openAddFunds(open = true) {
  useUi.setState({ addFunds: open });
}

let toastId = 0;
export function toast(text: string) {
  toastId += 1;
  useUi.setState({ toast: { id: toastId, text } });
}

export function clearToast(id: number) {
  useUi.setState((s) => (s.toast?.id === id ? { toast: null } : s));
}
