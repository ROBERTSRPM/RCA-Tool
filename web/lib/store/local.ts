import { blankInvestigation, cloneInvestigation } from "../investigation";
import { readRow, sanitiseForSave } from "../normalize";
import { buildSample, SAMPLE_ID } from "../sample";
import { upgradeSampleIfOld } from "../sample-upgrade";
import type { Investigation, InvestigationPatch } from "../types";
import {
  CONFLICT_MESSAGE,
  nextTimestamp,
  StoreError,
  type InvestigationStore,
  type ListResult,
  type RawRow,
} from "./types";

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

  /** Raw stored entries (anything JSON), seeding the sample on first visit. */
  private readRaw(): unknown[] {
    const s = this.storage();
    if (s.getItem(SEEDED_KEY) !== "1") {
      // First visit: seed the illustrative sample.
      const seeded = [buildSample()];
      this.write(seeded, []);
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
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /** Readable investigations and the ids of entries that could not be read. */
  private readAll(): ListResult {
    const items: Investigation[] = [];
    const unreadable: { id: string }[] = [];
    for (const raw of this.readRaw()) {
      const id =
        typeof raw === "object" && raw !== null && typeof (raw as { id?: unknown }).id === "string"
          ? (raw as { id: string }).id
          : "";
      const r = readRow(id, raw);
      if (r.ok) items.push(r.inv);
      else if (id) unreadable.push({ id });
      // An entry with no id at all cannot be shown or deleted by id; it is dropped on the next write.
    }
    // An older sample that nobody edited is replaced by the current one, silently.
    let upgraded = false;
    for (let i = 0; i < items.length; i++) {
      const next = upgradeSampleIfOld(items[i]);
      if (next) {
        items[i] = next;
        upgraded = true;
      }
    }
    if (upgraded) {
      try {
        this.write(items);
      } catch {
        /* storage full or blocked: the upgraded sample is still shown this time */
      }
    }
    return { items, unreadable };
  }

  private read(): Investigation[] {
    return this.readAll().items;
  }

  /** Entries that cannot be read but have an id: kept as they are, so the user can still delete them. */
  private unreadableRaw(): unknown[] {
    return this.readRaw().filter((raw) => {
      const id =
        typeof raw === "object" && raw !== null && typeof (raw as { id?: unknown }).id === "string"
          ? (raw as { id: string }).id
          : "";
      return id !== "" && !readRow(id, raw).ok;
    });
  }

  private write(all: Investigation[], keep: unknown[] = this.unreadableRaw()): void {
    try {
      this.storage().setItem(
        DATA_KEY,
        JSON.stringify([...all.map((i) => sanitiseForSave(i)), ...keep]),
      );
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

  async listAll(): Promise<ListResult> {
    const { items, unreadable } = this.readAll();
    return { items: items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), unreadable };
  }

  async exportAll(): Promise<RawRow[]> {
    return this.readRaw().map((raw) => {
      const o = (typeof raw === "object" && raw !== null ? raw : {}) as { id?: unknown; updatedAt?: unknown };
      return {
        id: typeof o.id === "string" ? o.id : "",
        updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : null,
        data: raw,
      };
    });
  }

  /** Removes everything this app keeps in the browser (investigations and flags). */
  clearAll(): void {
    const s = this.storage();
    s.removeItem(DATA_KEY);
    s.removeItem(SEEDED_KEY);
    if (typeof window !== "undefined") {
      try {
        const keys: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith("rca.")) keys.push(k);
        }
        keys.forEach((k) => window.localStorage.removeItem(k));
      } catch {
        /* storage blocked: nothing more to clear */
      }
    }
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
    const keep = this.unreadableRaw().filter((raw) => (raw as { id: string }).id !== id);
    this.write(
      this.read().filter((i) => i.id !== id),
      keep,
    );
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
