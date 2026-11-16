import { blankInvestigation, cloneInvestigation } from "../investigation";
import { buildSample, SAMPLE_ID } from "../sample";
import type { Investigation, InvestigationPatch } from "../types";
import { CONFLICT_MESSAGE, nextTimestamp, StoreError, type InvestigationStore } from "./types";

export const DATA_KEY = "rca.investigations.v1";
const SEEDED_KEY = "rca.seeded.v1";

/** Minimal storage surface so tests and the in-memory fallback can share code. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStorage implements KeyValueStorage {
  private data = new Map<string, string>();
  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}

const memoryFallback = new MemoryStorage();

/** localStorage if it is really usable (not SSR, not blocked), else memory. */
export function resolveStorage(): KeyValueStorage {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return memoryFallback;
    }
    const probe = "__rca_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return memoryFallback;
  }
}

function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === "QuotaExceededError" ||
      e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      e.code === 22)
  );
}

export class LocalStorageInvestigationStore implements InvestigationStore {
  constructor(private readonly storage: () => KeyValueStorage = resolveStorage) {}

  private read(): Investigation[] {
    const s = this.storage();
    if (s.getItem(SEEDED_KEY) !== "1") {
      // First visit: seed the illustrative sample.
      const seeded = [buildSample()];
      this.write(seeded);
      try {
        s.setItem(SEEDED_KEY, "1");
      } catch {
        /* ignore */
      }
      return seeded;
    }
    try {
      const raw = s.getItem(DATA_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Investigation[]) : [];
    } catch {
      return [];
    }
  }

  private write(all: Investigation[]): void {
    try {
      this.storage().setItem(DATA_KEY, JSON.stringify(all));
    } catch (e) {
      if (isQuotaError(e)) {
        throw new StoreError(
          "Browser storage is full. Remove some images from the evidence list.",
          "quota",
        );
      }
      throw new StoreError("Could not save to browser storage.", "unknown");
    }
  }

  async list() {
    return this.read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string) {
    return this.read().find((i) => i.id === id) ?? null;
  }

  async create(seed: InvestigationPatch = {}) {
    const inv = blankInvestigation(seed);
    this.write([inv, ...this.read()]);
    return inv;
  }

  async update(id: string, patch: InvestigationPatch, expectedUpdatedAt?: string) {
    const all = this.read();
    const idx = all.findIndex((i) => i.id === id);
    if (idx < 0) throw new StoreError("Investigation not found.", "not_found");
    if (expectedUpdatedAt !== undefined && all[idx].updatedAt !== expectedUpdatedAt) {
      throw new StoreError(CONFLICT_MESSAGE, "conflict");
    }
    const next: Investigation = {
      ...all[idx],
      ...patch,
      updatedAt: nextTimestamp(all[idx].updatedAt),
    };
    all[idx] = next;
    this.write(all);
    return next;
  }

  async delete(id: string) {
    this.write(this.read().filter((i) => i.id !== id));
  }

  async duplicate(id: string) {
    const all = this.read();
    const src = all.find((i) => i.id === id);
    if (!src) return null;
    const copy = cloneInvestigation(src);
    this.write([copy, ...all]);
    return copy;
  }

  async resetSample() {
    const rest = this.read().filter((i) => i.id !== SAMPLE_ID);
    this.write([{ ...buildSample(), updatedAt: nextTimestamp() }, ...rest]);
  }
}
