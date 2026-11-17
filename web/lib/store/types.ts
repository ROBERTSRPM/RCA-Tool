import type { UnreadableRow } from "../normalize";
import type { Asset, Investigation, InvestigationPatch } from "../types";

export type { UnreadableRow };

/** What the dashboard shows: readable investigations plus rows that could not be read. */
export interface ListResult {
  items: Investigation[];
  unreadable: UnreadableRow[];
}

/** One stored row exactly as kept, for the "Download my data" export. */
export interface RawRow {
  id: string;
  updatedAt: string | null;
  data: unknown;
}

/**
 * Persistence boundary. Implemented over localStorage (demo mode) and over
 * Supabase (signed in); see lib/store/index.ts for how one is chosen.
 */
export interface InvestigationStore {
  /** All investigations, most recently updated first. */
  list(): Promise<Investigation[]>;
  /** Like list(), but also reports rows whose data could not be read (so they can be deleted). */
  listAll(): Promise<ListResult>;
  /** Every stored row, unmodified, for export. */
  exportAll(): Promise<RawRow[]>;
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
    readonly code:
      | "quota"
      | "not_found"
      | "network"
      | "auth"
      | "conflict"
      | "too_large"
      | "limit"
      /** The server does not have the table yet (its migration has not been applied). */
      | "unavailable"
      | "unknown",
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

/** What can be changed on an asset after it is created. */
export type AssetPatch = Partial<Omit<Asset, "id" | "createdAt" | "updatedAt">>;

/**
 * Persistence boundary for the asset register. Implemented over localStorage
 * (demo mode) and over the Supabase `assets` table (signed in). Every method
 * may throw a StoreError; code "unavailable" means the server has no assets
 * table yet, which callers treat as "register not set up" and carry on.
 */
export interface AssetStore {
  /** Every asset, sorted by tag. Seeds the sample assets once per browser or account. */
  list(): Promise<Asset[]>;
  /** Every stored row, unmodified, for the "Download my data" export. Empty when unavailable. */
  exportAll(): Promise<RawRow[]>;
  create(asset: Asset): Promise<Asset>;
  createMany(assets: Asset[]): Promise<Asset[]>;
  update(id: string, patch: AssetPatch): Promise<Asset>;
  delete(id: string): Promise<void>;
  /** Restores the sample assets (those whose tags the sample uses) without touching other assets. */
  resetSampleAssets(): Promise<void>;
}

export const UNAVAILABLE_MESSAGE =
  "The asset register is not set up on this server yet, so assets cannot be saved or listed. Everything else works.";

export const MAX_ASSETS = 5000;
