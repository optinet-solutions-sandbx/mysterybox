/** Splits a name so its last word can be set in amethyst ("The Time" + "Room"). One word: no accent. */
export function splitAccent(name: string): { lead: string; accent: string | null } {
  const trimmed = name.trim();
  const i = trimmed.lastIndexOf(" ");
  if (i < 0) return { lead: trimmed, accent: null };
  return { lead: trimmed.slice(0, i), accent: trimmed.slice(i + 1) };
}
