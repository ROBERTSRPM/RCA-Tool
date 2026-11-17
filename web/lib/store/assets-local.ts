import { blankAsset, findAssetByTag, sortAssets } from "../assets";
import { normaliseAsset } from "../normalize";
import { buildSampleAssets } from "../sample";
import type { Asset } from "../types";
import { resolveStorage, type KeyValueStorage } from "./local";
import { MAX_ASSETS, StoreError, type AssetPatch, type AssetStore, type RawRow } from "./types";

export const ASSETS_KEY = "rca.assets.v1";
const SEEDED_KEY = "rca.assets.seeded.v1";

function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" || e.code === 22)
  );
}

/** Asset register kept in browser storage (demo mode). */
export class LocalStorageAssetStore implements AssetStore {
  constructor(private readonly storage: () => KeyValueStorage = resolveStorage) {}

  private readRaw(): unknown[] {
    const s = this.storage();
    if (s.getItem(SEEDED_KEY) !== "1") {
      const seeded = buildSampleAssets();
      this.writeRaw(seeded);
      try {
        s.setItem(SEEDED_KEY, "1");
      } catch {
        /* ignore */
      }
      return seeded;
    }
    try {
      const raw = s.getItem(ASSETS_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private read(): Asset[] {
    const out: Asset[] = [];
    for (const raw of this.readRaw()) {
      const a = normaliseAsset(raw);
      if (a && a.tag) out.push(a);
    }
    return out;
  }

  private writeRaw(all: Asset[]): void {
    try {
      this.storage().setItem(ASSETS_KEY, JSON.stringify(all));
    } catch (e) {
      if (isQuotaError(e)) {
        throw new StoreError("Browser storage is full. Delete some assets or investigations.", "quota");
      }
      throw new StoreError("Could not save to browser storage.", "unknown");
    }
  }

  async list() {
    return sortAssets(this.read());
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

  async create(asset: Asset) {
    return (await this.createMany([asset]))[0];
  }

  async createMany(assets: Asset[]) {
    const all = this.read();
    const made: Asset[] = [];
    for (const a of assets) {
      const tag = a.tag.trim();
      if (!tag) continue;
      if (findAssetByTag([...all, ...made], tag)) continue; // one entry per tag
      made.push({ ...blankAsset(), ...a, tag });
    }
    if (all.length + made.length > MAX_ASSETS) {
      throw new StoreError(`You have reached the limit of ${MAX_ASSETS} assets.`, "limit");
    }
    if (made.length) this.writeRaw([...all, ...made]);
    return made;
  }

  async update(id: string, patch: AssetPatch) {
    const all = this.read();
    const idx = all.findIndex((a) => a.id === id);
    if (idx < 0) throw new StoreError("Asset not found.", "not_found");
    const tag = (patch.tag ?? all[idx].tag).trim();
    const clash = findAssetByTag(all.filter((a) => a.id !== id), tag);
    if (clash) throw new StoreError(`There is already an asset with the tag ${clash.tag}.`, "conflict");
    const next: Asset = { ...all[idx], ...patch, tag, updatedAt: new Date().toISOString() };
    all[idx] = next;
    this.writeRaw(all);
    return next;
  }

  async delete(id: string) {
    this.writeRaw(this.read().filter((a) => a.id !== id));
  }

  async resetSampleAssets() {
    const have = this.read();
    const samples = buildSampleAssets();
    // Restore every sample asset, unless the user has their own asset with that tag.
    const keep = have.filter((a) => !samples.some((s) => s.id === a.id));
    const add = samples.filter((s) => !findAssetByTag(keep, s.tag));
    this.writeRaw([...keep, ...add]);
  }
}
