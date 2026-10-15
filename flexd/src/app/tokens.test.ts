import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8").replace(/\r\n/g, "\n");

function tokens(): Map<string, string> {
  const start = css.search(/:root,\s*\[data-theme="dark"\]\s*\{/);
  const block = css.slice(start, css.indexOf("\n}", start));
  return new Map([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}
const T = tokens();

function resolve(name: string): string {
  const value = T.get(name);
  if (!value) throw new Error(`--${name} is not defined`);
  const ref = /^var\(--([\w-]+)\)$/.exec(value);
  return ref ? resolve(ref[1]) : value.toLowerCase();
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(resolve(a)), luminance(resolve(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("FLEXD velvet and gold tokens", () => {
  it.each([
    ["bg", "#0a0510"],
    ["surface", "#160a22"],
    ["surface-2", "#22112f"],
    ["line", "#3d2152"],
    ["fg", "#f4e9d2"],
    ["muted", "#b3a3c4"],
    ["primary", "#5b1e92"],
    ["primary-hi", "#3f1366"],
    ["on-primary", "#e6cf9a"],
    ["accent", "#c2a05a"],
    ["accent-word", "#a374e0"],
    ["edge", "#8c6a2e"],
    ["success", "#7fb89a"],
    ["danger", "#e07a86"],
  ])("--%s is the palette sheet's %s", (role, hex) => {
    expect(resolve(role)).toBe(hex);
  });

  it("is dark only", () => {
    expect(css).not.toMatch(/\[data-theme="light"\]/);
  });

  it("keeps the purple matte: no bright velvet stop, no light sweep", () => {
    expect(T.get("primary-btn")).not.toMatch(/#6e2ba8|radial-gradient/i);
    expect(css).not.toMatch(/\.btn-primary::after/);
  });

  it.each([
    ["fg", "bg"],
    ["fg", "surface"],
    ["fg", "surface-2"],
    ["muted", "surface"],
    ["subtle", "surface"],
    ["accent", "surface"],
    ["accent-word", "bg"],
    ["on-primary", "primary"],
    ["hot", "bg"],
  ])("--%s on --%s is readable (4.5:1 or more)", (text, ground) => {
    expect(contrast(text, ground)).toBeGreaterThanOrEqual(4.5);
  });
});
