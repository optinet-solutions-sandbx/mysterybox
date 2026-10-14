import { economy } from "@/config/economy";

/**
 * Provably-fair style draws: roll = HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}`).
 * The mock keeps the server seed in the browser; production must keep it server-side
 * and only reveal it after rotation.
 */

export function randomHex(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return toHex(buf);
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return toHex(new Uint8Array(digest));
}

export async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return toHex(new Uint8Array(sig));
}

/** First 32 bits of the digest as a fraction of 2^32, scaled to [0, scale). */
export function rollFromHex(hex: string, scale: number = economy.oddsScale): number {
  const int = Number.parseInt(hex.slice(0, 8), 16);
  if (Number.isNaN(int)) throw new Error("rollFromHex: invalid hex");
  return Math.floor((int / 0x1_0000_0000) * scale);
}

export async function computeRoll(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  scale: number = economy.oddsScale,
): Promise<number> {
  return rollFromHex(await hmacSha256Hex(serverSeed, `${clientSeed}:${nonce}`), scale);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
