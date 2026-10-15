import { expect, it } from "vitest";
import { themeBootScript } from "@/lib/theme";
it("theme boot script parses and skips the preload only in the back office", () => {
  expect(() => new Function(themeBootScript)).not.toThrow();
  const run = (pathname: string) => {
    const appended: string[] = [];
    const doc = { documentElement: { dataset: {} as Record<string, string> }, createElement: () => ({}), head: { appendChild: (l: { href: string }) => appended.push(l.href) } };
    const win = { matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener() {}, dispatchEvent() {} };
    new Function("document", "window", "localStorage", "location", themeBootScript)(doc, win, { getItem: () => null }, { pathname });
    return { theme: doc.documentElement.dataset.theme, appended };
  };
  expect(run("/").appended.length).toBe(1);
  expect(run("/boxes/first-edition").appended.length).toBe(1);
  expect(run("/admin").appended.length).toBe(0);
  expect(run("/admin/players").appended.length).toBe(0);
  expect(run("/administrator").appended.length).toBe(1);
  expect(run("/").theme).toBe("dark");
});
