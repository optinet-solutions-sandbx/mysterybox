/** Runs one task at a time; a call made while one is in flight is dropped (returns undefined). */
export function singleFlight() {
  let busy = false;
  return async <T>(task: () => Promise<T>): Promise<T | undefined> => {
    if (busy) return undefined;
    busy = true;
    try {
      return await task();
    } finally {
      busy = false;
    }
  };
}

/** Hands out tokens; only the newest is current, so a slower, older async result can be dropped. */
export function latest() {
  let n = 0;
  return { next: () => ++n, isCurrent: (token: number) => token === n };
}
