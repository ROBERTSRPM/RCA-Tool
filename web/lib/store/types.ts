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
  /** Merges the patch into the stored investigation and returns the result. */
  update(id: string, patch: InvestigationPatch): Promise<Investigation>;
  delete(id: string): Promise<void>;
  /** Deep copy with fresh ids; null if the source does not exist. */
  duplicate(id: string): Promise<Investigation | null>;
  /** Restores the illustrative sample investigation to its original state. */
  resetSample(): Promise<void>;
}

export class StoreError extends Error {
  constructor(
    message: string,
    readonly code: "quota" | "not_found" | "network" | "auth" | "unknown",
  ) {
    super(message);
    this.name = "StoreError";
  }
}
