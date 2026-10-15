import { ViewTransition, type ReactNode } from "react";

/**
 * App-style slides between screens: content moves left when you go forward (a tab to the right,
 * or deeper into a box) and right when you come back. Links say which way with `transitionTypes`
 * (see navDirection); the header and tab bar stay put.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
      <div>{children}</div>
    </ViewTransition>
  );
}

export const FORWARD = ["nav-forward"];
export const BACK = ["nav-back"];
