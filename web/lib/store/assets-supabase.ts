import type { SupabaseClient } from "@supabase/supabase-js";
import { findAssetByTag, sortAssets } from "../assets";
import { normaliseAsset } from "../normalize";
import { buildSampleAssets } from "../sample";
import type { Asset } from "../types";
import { toStoreError } from "./supabase";
import {
  MAX_ASSETS,
  StoreError,
  UNAVAILABLE_MESSAGE,
  type AssetPatch,
  type AssetStore,
  type RawRow,
} from "./types";

const TABLE = "assets";
const SEEDED_FLAG = "rca_assets_seeded";
const PAGE = 1000;

export const ASSET_TOO_LARGE_MESSAGE = "Could not save: this asset is too large.";
export const ASSET_LIMIT_MESSAGE = `Could not save: you have reached the limit of ${MAX_ASSETS} assets. Delete some you no longer need, then try again.`;

interface PgError {
  code?: string;
  message?: string;
  status?: number;
}

/** True when the failure means "the assets table does not exist on this server". */
export function isMissingTable(e: unknown): boolean {
  const err = (e ?? {}) as PgError;
  const msg = (err.message ?? "").toLowerCase();
  return (
    err.code === "PGRST205" ||
    err.code === "42P01" ||
    msg.includes("could not find the table") ||
    (msg.includes("relation") && msg.includes("assets") && msg.includes("does not exist")) ||
    (err.status === 404 && msg.includes("assets"))
  );
}

/** Turns a failure on the assets table into a StoreError with a plain message. */
export function toAssetError(e: unknown, action: string): StoreError {
  if (e instanceof StoreError) return e;
  if (isMissingTable(e)) return new StoreError(UNAVAILABLE_MESSAGE, "unavailable");
  const msg = ((e ?? {}) as PgError).message?.toLowerCase() ?? "";
  if (msg.includes("assets_data_size") || (e as PgError | null)?.status === 413) {
    return new StoreError(ASSET_TOO_LARGE_MESSAGE, "too_large");
  }
  if (msg.includes("asset limit reached")) return new StoreError(ASSET_LIMIT_MESSAGE, "limit");
  return toStoreError(e, action);
}

/** The id a sample asset gets in an account (primary key is global). */
export const accountSampleAssetId = (userId: string, key: string) => `sample-asset-${userId}-${key}`;

/** Asset register over the `public.assets` table (one jsonb document per asset, row level security). */
export class SupabaseAssetStore implements AssetStore {
  private seeding: Promise<void> | null = null;

  constructor(
    private readonly db: SupabaseClient,
    private readonly userId: string,
  ) {}

  private async fetchAll(): Promise<Asset[]> {
    const out: Asset[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await this.db
        .from(TABLE)
        .select("id, data")
        .order("created_at", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw toAssetError(error, "load your assets");
      for (const r of data ?? []) {
        const a = normaliseAsset(r.data, String(r.id));
        if (a && a.tag) out.push(a);
      }
      if (!data || data.length < PAGE) break;
    }
    return out;
  }

  /** Seeds the sample assets once per account (flag kept in the auth user metadata). */
  private seedIfNew(existing: Asset[]): Promise<void> {
    if (!this.seeding) {
      this.seeding = (async () => {
        // The session is cached in the browser: no network round trip just to read a flag.
        const { data, error } = await this.db.auth.getSession();
        if (error || !data.session) return;
        if (data.session.user.user_metadata?.[SEEDED_FLAG]) return;
        const samples = buildSampleAssets().map((a) => ({
          ...a,
          id: accountSampleAssetId(this.userId, a.id.replace("sample-asset-", "")),
        }));
        const add = samples.filter((s) => !findAssetByTag(existing, s.tag));
        if (add.length) {
          const { error: insErr } = await this.db
            .from(TABLE)
            .upsert(
              add.map((a) => ({ id: a.id, data: a, created_at: a.createdAt, updated_at: a.updatedAt })),
              { onConflict: "id", ignoreDuplicates: true },
            );
          if (insErr) throw toAssetError(insErr, "load your assets");
        }
        await this.db.auth.updateUser({ data: { [SEEDED_FLAG]: true } });
      })().finally(() => {
        this.seeding = null;
      });
    }
    return this.seeding;
  }

  async list() {
    let all = await this.fetchAll();
    // Only an empty register can need the one-time sample seeding, so the usual
    // case is a single request.
    if (all.length === 0) {
      try {
        await this.seedIfNew(all);
        all = await this.fetchAll();
      } catch (e) {
        // Seeding is a nicety: a failure here must not hide the register.
        if (e instanceof StoreError && e.code === "unavailable") throw e;
      }
    }
    return sortAssets(all);
  }

  async exportAll(): Promise<RawRow[]> {
    const rows: RawRow[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await this.db
        .from(TABLE)
        .select("id, data, updated_at")
        .order("created_at", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) {
        const err = toAssetError(error, "download your assets");
        if (err.code === "unavailable") return []; // no table yet: nothing to export
        throw err;
      }
      for (const r of data ?? []) {
        rows.push({ id: String(r.id), updatedAt: (r.updated_at as string | null) ?? null, data: r.data });
      }
      if (!data || data.length < PAGE) break;
    }
    return rows;
  }

  async create(asset: Asset) {
    return (await this.createMany([asset]))[0];
  }

  async createMany(assets: Asset[]) {
    const existing = await this.fetchAll();
    const made: Asset[] = [];
    for (const a of assets) {
      const tag = a.tag.trim();
      if (!tag || findAssetByTag([...existing, ...made], tag)) continue;
      made.push({ ...a, tag });
    }
    if (made.length === 0) return [];
    // 500 rows per request keeps each request small.
    for (let i = 0; i < made.length; i += 500) {
      const chunk = made.slice(i, i + 500);
      const { error } = await this.db.from(TABLE).insert(
        chunk.map((a) => ({ id: a.id, data: a, created_at: a.createdAt, updated_at: a.updatedAt })),
      );
      if (error) throw toAssetError(error, "save");
    }
    return made;
  }

  async update(id: string, patch: AssetPatch) {
    const all = await this.fetchAll();
    const cur = all.find((a) => a.id === id);
    if (!cur) throw new StoreError("Asset not found.", "not_found");
    const tag = (patch.tag ?? cur.tag).trim();
    const clash = findAssetByTag(all.filter((a) => a.id !== id), tag);
    if (clash) throw new StoreError(`There is already an asset with the tag ${clash.tag}.`, "conflict");
    const next: Asset = { ...cur, ...patch, tag, updatedAt: new Date().toISOString() };
    const { error } = await this.db
      .from(TABLE)
      .update({ data: next, updated_at: next.updatedAt })
      .eq("id", id);
    if (error) throw toAssetError(error, "save");
    return next;
  }

  async delete(id: string) {
    const { error } = await this.db.from(TABLE).delete().eq("id", id);
    if (error) throw toAssetError(error, "delete");
  }

  async resetSampleAssets() {
    const all = await this.fetchAll();
    const samples = buildSampleAssets().map((a) => ({
      ...a,
      id: accountSampleAssetId(this.userId, a.id.replace("sample-asset-", "")),
    }));
    // Restore every sample asset, unless the user has their own asset with that tag.
    const add = samples.filter((s) => {
      const hit = findAssetByTag(all, s.tag);
      return !hit || hit.id === s.id;
    });
    if (add.length === 0) return;
    const { error } = await this.db
      .from(TABLE)
      .upsert(
        add.map((a) => ({ id: a.id, data: a, created_at: a.createdAt, updated_at: a.updatedAt })),
        { onConflict: "id" },
      );
    if (error) throw toAssetError(error, "reset the sample assets");
  }
}
