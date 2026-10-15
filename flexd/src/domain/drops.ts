/** A limited drop is on sale until Sunday 23:59:59 of the current week, in the viewer's time zone. */
export function dropEndsAt(now: Date): number {
  const end = new Date(now);
  const daysToSunday = (7 - end.getDay()) % 7;
  end.setDate(end.getDate() + daysToSunday);
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

/** Days, hours, minutes and seconds left, for the countdown digits. */
export function countdownParts(ms: number): { d: number; h: number; m: number; s: number } {
  const t = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(t / 86_400), h: Math.floor((t % 86_400) / 3_600), m: Math.floor((t % 3_600) / 60), s: t % 60 };
}
