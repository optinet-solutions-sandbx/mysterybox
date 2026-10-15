import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const TEXT = /\.(tsx?|css|json|md|mjs|svg|txt)$/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : TEXT.test(name) ? [p] : [];
  });
}

/** Lines under `dirs` (relative to flexd/) that match `pattern`, as "path:line: text". */
export function grepSource(pattern: RegExp, dirs: string[], skip: string[] = []): string[] {
  return dirs
    .flatMap((d) => files(join(ROOT, d)))
    .map((f) => [relative(ROOT, f).replaceAll("\\", "/"), f] as const)
    .filter(([rel]) => !skip.includes(rel))
    .flatMap(([rel, f]) =>
      readFileSync(f, "utf8")
        .split(/\r?\n/)
        .flatMap((line, i) => (pattern.test(line) ? [`${rel}:${i + 1}: ${line.trim()}`] : [])),
    );
}
