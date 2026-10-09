/**
 * Builds the strip of tiles the opening reel scrolls past. Fillers are sampled with the
 * box's real odds (no engineered near-misses); the drawn entry sits at `winnerIndex`.
 * The reel is decoration only — the outcome is decided by the roll before it spins.
 */
export function buildReel<T extends { weight: number }>(
  entries: T[],
  winner: T,
  opts: { length: number; winnerIndex: number; random: () => number },
): T[] {
  const { length, winnerIndex, random } = opts;
  if (winnerIndex < 0 || winnerIndex >= length) throw new Error("buildReel: winnerIndex out of range");
  const total = entries.reduce((a, e) => a + e.weight, 0);
  const sample = (): T => {
    let r = random() * total;
    for (const e of entries) {
      r -= e.weight;
      if (r < 0) return e;
    }
    return entries[entries.length - 1];
  };
  return Array.from({ length }, (_, i) => (i === winnerIndex ? winner : sample()));
}
