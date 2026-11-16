/**
 * Registry of in-flight autosaves so that sign-out can write pending edits to
 * the account before the session (and the store) goes away.
 */
const flushers = new Set<() => Promise<boolean>>();

export function registerFlusher(fn: () => Promise<boolean>): () => void {
  flushers.add(fn);
  return () => {
    flushers.delete(fn);
  };
}

/** Writes every pending edit now. Resolves false if any write failed. */
export async function flushAllPending(): Promise<boolean> {
  const results = await Promise.allSettled([...flushers].map((f) => f()));
  return results.every((r) => r.status === "fulfilled" && r.value);
}
