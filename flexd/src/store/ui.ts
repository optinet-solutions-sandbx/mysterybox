import { create } from "zustand";
import type { Pull } from "./app";

/** Sheets and toasts that any screen can open. Not persisted. */
interface UiState {
  auth: "sign-up" | "sign-in" | null;
  addFunds: boolean;
  toast: { id: number; text: string } | null;
  /** The box being opened right now; the piece is already drawn. */
  opening: { slug: string; pull: Pull } | null;
  /** Which lazily loaded overlays have been asked for at least once (see LazyOverlays). */
  wanted: { open: boolean; auth: boolean; funds: boolean };
}

export const useUi = create<UiState>()(() => ({
  auth: null,
  addFunds: false,
  toast: null,
  opening: null,
  wanted: { open: false, auth: false, funds: false },
}));

function want(key: keyof UiState["wanted"]) {
  useUi.setState((s) => (s.wanted[key] ? s : { wanted: { ...s.wanted, [key]: true } }));
}

export function openAuth(mode: "sign-up" | "sign-in" = "sign-up") {
  want("auth");
  useUi.setState({ auth: mode });
}

export function closeAuth() {
  useUi.setState({ auth: null });
}

export function openAddFunds(open = true) {
  if (open) want("funds");
  useUi.setState({ addFunds: open });
}

/** Shows the opening screen for a drawn piece. */
export function startOpening(opening: { slug: string; pull: Pull }) {
  want("open");
  useUi.setState({ opening });
}

let toastId = 0;
export function toast(text: string) {
  toastId += 1;
  useUi.setState({ toast: { id: toastId, text } });
}

export function clearToast(id: number) {
  useUi.setState((s) => (s.toast?.id === id ? { toast: null } : s));
}
