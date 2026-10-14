import { textureUrl } from "@/config/brand-pack";

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "grailnoir-theme";
export const THEME_EVENT = "grailnoir-theme-change";

/**
 * Runs in <head> before first paint: the saved choice wins, otherwise the system preference.
 * Keeps following the system until the visitor picks a mode with the toggle. Also preloads the
 * brand pack's marble texture for the chosen mode (it is the hero's largest painted element and the
 * footer uses it on every page, so the preload is never wasted).
 */
const textures = JSON.stringify({ dark: textureUrl("dark"), light: textureUrl("light") });
export const themeBootScript = `(function(){try{var k="${THEME_STORAGE_KEY}",d=document.documentElement,m=window.matchMedia("(prefers-color-scheme: light)");function a(){var s=localStorage.getItem(k);d.dataset.theme=s||(m.matches?"light":"dark")}a();var t=${textures}[d.dataset.theme];if(t){var l=document.createElement("link");l.rel="preload";l.as="image";l.href=t;l.fetchPriority="high";document.head.appendChild(l)}m.addEventListener("change",function(){if(!localStorage.getItem(k)){a();window.dispatchEvent(new Event("${THEME_EVENT}"))}})}catch(e){document.documentElement.dataset.theme="dark"}})()`;

export function readTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function subscribeTheme(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
}
