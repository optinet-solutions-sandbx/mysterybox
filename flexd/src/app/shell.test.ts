import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { grepSource } from "@/test-utils/source";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("shell follows the reference screens", () => {
  it("keeps bars pinned above the floating tab bar (5.75rem and up)", () => {
    const offsets = grepSource(/bottom-\[calc\(\d/, ["src/app", "src/components"]).flatMap((hit) =>
      [...hit.matchAll(/bottom-\[calc\(([\d.]+)rem/g)].map((m) => [hit, Number(m[1])] as const),
    );
    expect(offsets.length).toBeGreaterThan(0);
    expect(offsets.filter(([hit, rem]) => rem < 5.75 && !hit.includes("tab-bar.tsx"))).toEqual([]);
  });

  it("pads pages for the floating tab bar", () => {
    expect(read("src/app/globals.css")).toMatch(/@utility pb-tabbar \{\s*padding-bottom: calc\(6\.5rem/);
  });

  it("floats the tab bar; the active tab is a dark velvet pill with a violet edge and a lilac icon", () => {
    const tabBar = read("src/components/shell/tab-bar.tsx");
    expect(tabBar).toMatch(/rounded-\[28px\]/);
    expect(tabBar).toMatch(/bg-\[image:var\(--tab-active\)\]/);
    expect(tabBar).toMatch(/border-hot/);
    expect(tabBar).toMatch(/text-hot/);
  });

  it("gives the age gate the drape, not a purple glow", () => {
    const chrome = read("src/components/shell/chrome.tsx");
    expect(chrome).toMatch(/bg-drape/);
    expect(chrome).not.toMatch(/var\(--primary\)_30%/);
  });
});
