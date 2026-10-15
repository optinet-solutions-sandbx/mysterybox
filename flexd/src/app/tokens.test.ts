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

describe("FLEXD tokens (the client's screens)", () => {
  it.each([
    ["bg", "#0a0510"],
    ["surface", "#160a22"],
    ["surface-2", "#22112f"],
    ["line", "#3d2152"],
    ["fg", "#f4efe9"],
    ["muted", "#c6bed0"],
    ["primary", "#5b1e92"],
    ["primary-hi", "#3f1366"],
    ["on-primary", "#ffffff"],
    ["accent", "#c2a05a"],
    ["accent-word", "#a374e0"],
    ["edge", "#77708a"],
    ["success", "#7fb89a"],
    ["danger", "#e07a86"],
  ])("--%s is %s", (role, hex) => {
    expect(resolve(role)).toBe(hex);
  });

  it("is dark only", () => {
    expect(css).not.toMatch(/\[data-theme="light"\]/);
  });

  it("keeps the glows softer than the screens: faint, and no light sweep across the button", () => {
    const alphas = [...(T.get("primary-glow") ?? "").matchAll(/\/\s*([\d.]+)\)/g)].map((m) => Number(m[1]));
    expect(alphas.length).toBeGreaterThan(0);
    for (const a of alphas) expect(a).toBeLessThanOrEqual(0.6);
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
