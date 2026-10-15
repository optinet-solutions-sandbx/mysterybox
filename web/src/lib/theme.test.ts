import { expect, it } from "vitest";
import { themeBootScript } from "@/lib/theme";
it("theme boot script parses, follows the system and adds nothing to the page", () => {
  expect(() => new Function(themeBootScript)).not.toThrow();
  const run = (pathname: string) => {
    const appended: string[] = [];
    const doc = { documentElement: { dataset: {} as Record<string, string> }, createElement: () => ({}), head: { appendChild: (l: { href: string }) => appended.push(l.href) } };
    const win = { matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener() {}, dispatchEvent() {} };
    new Function("document", "window", "localStorage", "location", themeBootScript)(doc, win, { getItem: () => null }, { pathname });
    return { theme: doc.documentElement.dataset.theme, appended };
  };
  expect(run("/").appended).toEqual([]);
  expect(run("/admin").appended).toEqual([]);
  expect(run("/").theme).toBe("dark");
});
