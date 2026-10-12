import { economy } from "@/config/economy";
import type { Box, Item } from "@/domain/types";

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const opt = (s: string | undefined) => (s === undefined ? "null" : q(s));

/**
 * supabase/seed.sql: the mock catalog as SQL, so the database and the front end share item ids,
 * prices, weights and the order the draw walks. Regenerate with
 * `WRITE_SEED=1 npx vitest run src/backend/catalog-seed.test.ts` after changing data/.
 */
export function catalogSeedSql(items: Item[], boxes: Box[]): string {
  const itemRows = items.map(
    (i) => `  (${q(i.id)}, ${q(i.name)}, ${q(i.brand)}, ${q(i.category)}, ${i.value}, ${opt(i.image)})`,
  );
  const boxRows = boxes.map(
    (b, n) =>
      `  (${q(b.id)}, ${q(b.slug)}, ${q(b.name)}, ${q(b.tagline)}, ${q(b.category)}, ${q(b.material)}, ${opt(b.badge)}, ${b.featured ? "true" : "false"}, ${b.price}, ${economy.oddsScale}, ${economy.targetRtp}, 'draft', ${n})`,
  );
  const oddsRows = boxes.flatMap((b) => b.entries.map((e, position) => `  (${q(b.id)}, ${q(e.itemId)}, ${position}, ${e.weight})`));

  return [
    "-- GENERATED from web/src/data (items.ts, boxes.ts) by web/src/backend/catalog-sql.ts. Do not edit by hand.",
    "-- Boxes are inserted as drafts, given their odds, then published (publishing checks the weights sum).",
    "",
    "insert into public.items (id, name, brand, category, value_cents, image_url) values",
    itemRows.join(",\n") + ";",
    "",
    "insert into public.boxes (id, slug, name, tagline, category, material, badge, featured, price_cents, odds_scale, target_rtp, status, sort_order) values",
    boxRows.join(",\n") + ";",
    "",
    "insert into public.box_items (box_id, item_id, position, weight) values",
    oddsRows.join(",\n") + ";",
    "",
    `update public.boxes set status = 'live' where id in (${boxes.map((b) => q(b.id)).join(", ")});`,
    "",
  ].join("\n");
}
