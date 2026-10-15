import { boxes } from "./boxes";
import { items } from "./items";

/**
 * Sample leaderboard for the prototype, clearly labelled as sample data on screen. Deterministic
 * (no Math.random) so server and client agree. Replace with the platform's weekly board.
 */
const NAMES = ["velvetcrown", "noir_nights", "ateliermia", "theflapclub", "jules_vault", "midnightmarc", "sapphire_sun", "kellyhunter"];

export interface BoardRow {
  name: string;
  itemId: string;
  boxSlug: string;
  points: number;
}

export const sampleBoard: BoardRow[] = NAMES.map((name, i) => {
  const box = boxes[(i * 3 + 2) % boxes.length];
  const pool = box.entries.map((e) => items.find((it) => it.id === e.itemId)!).sort((a, b) => b.value - a.value);
  const item = pool[Math.min(pool.length - 1, i % 3)];
  return { name, itemId: item.id, boxSlug: box.slug, points: 48_000 - i * 5_150 - (i % 2) * 730 };
});
