export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "grailnoir-play-theme";
export const THEME_EVENT = "grailnoir-play-theme-change";

/**
 * Runs in <head> before first paint: the saved choice wins, otherwise the system preference.
 * Keeps following the system until the visitor picks a mode.
 */
export const themeBootScript = `(function(){try{var k="${THEME_STORAGE_KEY}",d=document.documentElement,m=window.matchMedia("(prefers-color-scheme: light)");function a(){var s=localStorage.getItem(k);d.dataset.theme=s||(m.matches?"light":"dark")}a();m.addEventListener("change",function(){if(!localStorage.getItem(k)){a();window.dispatchEvent(new Event("${THEME_EVENT}"))}})}catch(e){document.documentElement.dataset.theme="dark"}})()`;

/** Marks a returning visitor before first paint (phones then skip the home headline). */
export const returningBootScript = `(function(){try{var k="grailnoir-play-seen",d=document.documentElement;if(localStorage.getItem(k))d.dataset.returning="1";else localStorage.setItem(k,"1")}catch(e){}})()`;

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
