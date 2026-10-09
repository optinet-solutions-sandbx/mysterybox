import { computeRoll } from "@/domain/fair";
import { pickByRoll } from "@/domain/odds";
import type { Box, Draw, ResolvedEntry } from "@/domain/types";
import { resolveEntries } from "./catalog";

export interface Seeds {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

/**
 * Decides one opening. In the mock this runs in the browser; in production the platform
 * API returns the same shape (item + verifiable draw) and the client only animates it.
 */
export async function drawFromBox(
  box: Box,
  seeds: Seeds,
): Promise<{ entry: ResolvedEntry; draw: Draw }> {
  const roll = await computeRoll(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
  const entry = pickByRoll(resolveEntries(box), roll);
  return {
    entry,
    draw: {
      serverSeedHash: seeds.serverSeedHash,
      clientSeed: seeds.clientSeed,
      nonce: seeds.nonce,
      roll,
    },
  };
}
