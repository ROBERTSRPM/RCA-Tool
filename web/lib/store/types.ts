import type { Investigation, InvestigationPatch } from "../types";

/**
 * Persistence boundary. Implemented over localStorage (demo mode) and over
 * Supabase (signed in); see lib/store/index.ts for how one is chosen.
 */
export interface InvestigationStore {
  /** All investigations, most recently updated first. */
  list(): Promise<Investigation[]>;
  get(id: string): Promise<Investigation | null>;
  /** Creates a blank investigation, optionally pre-filled. */
  create(seed?: InvestigationPatch): Promise<Investigation>;
  /**
   * Merges the patch into the stored investigation and returns the result.
   * When `expectedUpdatedAt` is given the write only happens if the stored
   * investigation still has exactly that updatedAt (the version the caller last
   * loaded or saved); otherwise nothing is written and a StoreError with code
   * "conflict" is thrown.
   */
  update(
    id: string,
    patch: InvestigationPatch,
    expectedUpdatedAt?: string,
  ): Promise<Investigation>;
  delete(id: string): Promise<void>;
  /** Deep copy with fresh ids; null if the source does not exist. */
  duplicate(id: string): Promise<Investigation | null>;
  /** Restores the illustrative sample investigation to its original state. */
  resetSample(): Promise<void>;
}

export class StoreError extends Error {
  constructor(
    message: string,
    readonly code: "quota" | "not_found" | "network" | "auth" | "conflict" | "unknown",
  ) {
    super(message);
    this.name = "StoreError";
  }
}

export const CONFLICT_MESSAGE =
  "This investigation was changed somewhere else (another tab or device).";

/** A new updatedAt that is always later than the previous one, even within one millisecond. */
export function nextTimestamp(previous?: string): string {
  const now = Date.now();
  const prev = previous ? Date.parse(previous) : NaN;
  return new Date(Number.isFinite(prev) && prev >= now ? prev + 1 : now).toISOString();
}
