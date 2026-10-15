#!/usr/bin/env node
// Brand packs: every folder in public/brands/<id>/ with a brand.json is a brand.
//
//   node scripts/brands.mjs                  check every pack and register them (runs before dev/build)
//   node scripts/brands.mjs --new <id> "Name" start a new brand by copying the default pack
//
// The site shows the pack named by NEXT_PUBLIC_BRAND (default: grailnoir). See docs/11-white-label.md.

import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packsDir = join(root, "public", "brands");
const out = join(root, "src", "config", "brands.generated.ts");
const DEFAULT = "grailnoir";

const REQUIRED = ["id", "name", "domain", "tagline", "taglineLines", "descriptor", "description", "legalEntity", "supportEmail", "minimumAge", "fonts", "logo", "categories", "theme"];
const FONT_PAIRS = ["inscription", "editorial", "modern"];
const DRAWINGS = ["watch", "smartwatch", "bag-flap", "bag-top", "bag-tote", "bag-pouch", "sneaker", "ring", "bracelet", "pendant", "phone", "laptop", "headphones", "earbuds", "controller", "perfume", "sunglasses", "belt", "scarf", "card", "coin"];

function fail(message) {
  console.error(`\n✗ Brand packs: ${message}\n  See docs/11-white-label.md.\n`);
  process.exit(1);
}

if (process.argv[2] === "--new") {
  const id = process.argv[3];
  const name = process.argv[4];
  if (!id || !/^[a-z0-9-]{2,32}$/.test(id) || !name) fail('usage: npm run brand:new -- <id> "Brand Name"   (id: lowercase letters, digits, dashes)');
  const target = join(packsDir, id);
  if (existsSync(target)) fail(`public/brands/${id} already exists`);
  cpSync(join(packsDir, DEFAULT), target, { recursive: true });
  const pack = JSON.parse(readFileSync(join(target, "brand.json"), "utf8"));
  pack.id = id;
  pack.name = name;
  pack.legalEntity = `${name} [legal entity TBD]`;
  pack.domain = `${id}.example`;
  pack.supportEmail = `support@${id}.example`;
  // The default lockup and traced outline spell out the default brand; a new brand starts without them.
  if (pack.logo.lockup) rmSync(join(target, pack.logo.lockup), { force: true });
  for (const f of [pack.logo.cursor, pack.logo.cursorOpen].filter(Boolean)) {
    for (const file of [f, f.replace(/\.png$/, "@2x.png")]) rmSync(join(target, file), { force: true });
  }
  for (const key of ["lockup", "lockupWidth", "lockupHeight", "silhouette", "cursor", "cursorOpen"]) delete pack.logo[key];
  writeFileSync(join(target, "brand.json"), JSON.stringify(pack, null, 2) + "\n");
  console.log(`✓ Created public/brands/${id}/ from ${DEFAULT}. Next:
  1. Edit public/brands/${id}/brand.json (name, domain, slogan, copy, colours, categories, font pair).
  2. Replace mark.webp, icon.png and apple-icon.png in that folder with the new logo (or point "logo" at your files).
  3. Set NEXT_PUBLIC_BRAND=${id} (web/.env.local, and Vercel for the live site), then restart.`);
}

const ids = readdirSync(packsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(packsDir, d.name, "brand.json")))
  .map((d) => d.name)
  .sort();
if (!ids.includes(DEFAULT)) fail(`the default pack public/brands/${DEFAULT}/brand.json is missing`);

for (const id of ids) {
  const file = `public/brands/${id}/brand.json`;
  let pack;
  try {
    pack = JSON.parse(readFileSync(join(packsDir, id, "brand.json"), "utf8"));
  } catch (e) {
    fail(`${file} is not valid JSON (${e.message})`);
  }
  for (const key of REQUIRED) if (pack[key] === undefined || pack[key] === "") fail(`${file} is missing "${key}"`);
  if (pack.id !== id) fail(`${file} has "id": "${pack.id}" but lives in folder "${id}"`);
  if (!FONT_PAIRS.includes(pack.fonts)) fail(`${file}: "fonts" must be one of ${FONT_PAIRS.join(", ")}`);
  for (const f of ["mark", "icon", "appleIcon"]) {
    if (!pack.logo[f] || !existsSync(join(packsDir, id, pack.logo[f]))) fail(`${file}: logo.${f} file "${pack.logo[f]}" not found in the folder`);
  }
  for (const f of ["cursor", "cursorOpen"]) {
    const name = pack.logo[f];
    if (name === undefined) continue;
    if (!/^[\w.-]+\.png$/.test(name)) fail(`${file}: logo.${f} must be a .png file name`);
    for (const need of [name, name.replace(/\.png$/, "@2x.png")]) {
      if (!existsSync(join(packsDir, id, need))) fail(`${file}: logo.${f} needs "${need}" in the folder (32 px, plus a 64 px @2x twin)`);
    }
  }
  if (!Array.isArray(pack.categories) || pack.categories.length === 0) fail(`${file}: add at least one category`);
  for (const c of pack.categories) {
    if (!/^[a-z0-9-]{2,32}$/.test(c.id ?? "")) fail(`${file}: category id "${c.id}" must be lowercase letters, digits or dashes`);
    if (c.id === "credit" || c.id === "mixed") fail(`${file}: "${c.id}" is reserved`);
    if (c.drawing && !DRAWINGS.includes(c.drawing)) fail(`${file}: category "${c.id}" drawing must be one of ${DRAWINGS.join(", ")}`);
  }
  if (!pack.theme.dark || !pack.theme.light) fail(`${file}: "theme" needs "dark" and "light"`);
}

const lines = [
  "// GENERATED by scripts/brands.mjs from public/brands/*/brand.json. Do not edit; run `npm run brands`.",
  ...ids.map((id, i) => `import pack${i} from "../../public/brands/${id}/brand.json";`),
  "",
  `export const BRAND_PACKS = {`,
  ...ids.map((id, i) => `  ${JSON.stringify(id)}: pack${i},`),
  "} as const;",
  "",
];
const next = lines.join("\n");
if (!existsSync(out) || readFileSync(out, "utf8") !== next) writeFileSync(out, next);
console.log(`✓ Brand packs: ${ids.join(", ")} (active: ${process.env.NEXT_PUBLIC_BRAND || DEFAULT})`);
