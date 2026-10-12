import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { boxes } from "@/data/boxes";
import { items } from "@/data/items";
import { catalogSeedSql } from "./catalog-sql";
import { SUPABASE_DIR } from "./test-db";

const SEED = `${SUPABASE_DIR}seed.sql`;

describe("supabase/seed.sql", () => {
  it("matches the front-end catalog (regenerate with WRITE_SEED=1)", () => {
    const expected = catalogSeedSql(items, boxes);
    if (process.env.WRITE_SEED) writeFileSync(SEED, expected);
    // Git may check the file out with CRLF on Windows; compare content, not line endings.
    expect(readFileSync(SEED, "utf8").replace(/\r\n/g, "\n")).toBe(expected);
  });
});
