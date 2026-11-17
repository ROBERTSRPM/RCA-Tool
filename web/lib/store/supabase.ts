import type { SupabaseClient } from "@supabase/supabase-js";
import { blankInvestigation, cloneInvestigation } from "../investigation";
import { readRow, sanitiseForSave } from "../normalize";
import { buildSample, SAMPLE_ID } from "../sample";
import type { Investigation, InvestigationPatch } from "../types";
import {
  CONFLICT_MESSAGE,
  nextTimestamp,
  StoreError,
  type InvestigationStore,
  type ListResult,
  type RawRow,
} from "./types";

const TABLE = "investigations";
const SEEDED_FLAG = "rca_seeded";

/** Mirrors the database limits (see supabase/migrations). */
export const MAX_ROW_BYTES = 5 * 1024 * 1024;
export const MAX_INVESTIGATIONS = 500;

export const TOO_LARGE_MESSAGE =
  "Could not save: this investigation is too large. Remove some photos from the evidence list and try again.";
export const LIMIT_MESSAGE = `Could not save: you have reached the limit of ${MAX_INVESTIGATIONS} investigations. Delete some you no longer need, then try again.`;

interface PgError {
  code?: string;
  message?: string;
  status?: number;
}

/** Turns a Supabase / fetch failure into a StoreError with a plain message. */
export function toStoreError(e: unknown, action: string): StoreError {
  if (e instanceof StoreError) return e;
  const err = (e ?? {}) as PgError;
  const msg = (err.message ?? "").toLowerCase();
  if (
    err.status === 401 ||
    err.code === "PGRST301" ||
    err.code === "PGRST303" ||
    msg.includes("jwt") ||
    msg.includes("not authenticated")
  ) {
    return new StoreError("Your session has expired. Sign in again to save.", "auth");
  }
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("load failed") ||
    msg.includes("abort") ||
    msg.includes("timed out")) {
    return new StoreError(`Could not ${action}: no connection to the server.`, "network");
  }
  // Database limits (supabase/migrations): row size check constraint, per-user row cap trigger.
  if (
    err.status === 413 ||
    msg.includes("investigations_data_size") ||
    msg.includes("payload too large") ||
    msg.includes("request entity too large")
  ) {
    return new StoreError(TOO_LARGE_MESSAGE, "too_large");
  }
  if (msg.includes("investigation limit reached")) {
    return new StoreError(LIMIT_MESSAGE, "limit");
  }
  if (err.code === "42501") {
    return new StoreError(`Could not ${action}: not allowed.`, "auth");
  }
  return new StoreError(`Could not ${action}. ${err.message ?? ""}`.trim(), "unknown");
}

/** Fails at once, with a plain message, when the browser knows it is offline. */
function assertOnline(action: string): void {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new StoreError(`Could not ${action}: no connection to the server.`, "network");
  }
}

/** The id the seeded sample gets in an account (primary key is global). */
export const accountSampleId = (userId: string) => `sample-${userId}`;

/**
 * Investigation store over the `public.investigations` table. The whole
 * investigation lives in the `data` jsonb column; row level security limits
 * every query to the signed-in user's rows.
 */
export class SupabaseInvestigationStore implements InvestigationStore {
  private seeding: Promise<void> | null = null;

  constructor(
    private readonly db: SupabaseClient,
    private readonly userId: string,
  ) {}

  /** Fails before sending when the row is certainly over the database limit. */
  private assertSize(inv: Investigation): void {
    // JSON.stringify is a little shorter than the database's jsonb text, so this
    // only catches the clear cases; the database check is the real limit.
    if (JSON.stringify(inv).length > MAX_ROW_BYTES) {
      throw new StoreError(TOO_LARGE_MESSAGE, "too_large");
    }
  }

  private async insertRow(raw: Investigation): Promise<void> {
    const inv = sanitiseForSave(raw);
    this.assertSize(inv);
    const { error } = await this.db
      .from(TABLE)
      .insert({ id: inv.id, data: inv, updated_at: inv.updatedAt });
    if (error) throw toStoreError(error, "save");
  }

  /** Seeds the sample once per account (flag kept in the auth user metadata). */
  private seedIfNew(): Promise<void> {
    if (!this.seeding) {
      this.seeding = (async () => {
        const { data, error } = await this.db.auth.getUser();
        if (error || !data.user) throw toStoreError(error, "load");
        if (data.user.user_metadata?.[SEEDED_FLAG]) return;
        const sample = {
          ...buildSample(),
          id: accountSampleId(this.userId),
          updatedAt: new Date().toISOString(),
        };
        try {
          await this.insertRow(sample);
        } catch (e) {
          // 23505: another tab seeded it a moment ago. That is fine.
          if (!(e instanceof StoreError && /23505|duplicate/.test(e.message))) throw e;
        }
        await this.db.auth.updateUser({ data: { [SEEDED_FLAG]: true } });
      })().finally(() => {
        this.seeding = null;
      });
    }
    return this.seeding;
  }

  private async fetchAll(): Promise<ListResult> {
    const { data, error } = await this.db
      .from(TABLE)
      .select("id, data")
      .order("updated_at", { ascending: false });
    if (error) throw toStoreError(error, "load your investigations");
    const items: Investigation[] = [];
    const unreadable: { id: string }[] = [];
    for (const r of data ?? []) {
      const row = readRow(String(r.id), r.data);
      if (row.ok) items.push(row.inv);
      else unreadable.push({ id: row.id });
    }
    return { items, unreadable };
  }

  async listAll(): Promise<ListResult> {
    let res = await this.fetchAll();
    if (res.items.length + res.unreadable.length === 0) {
      await this.seedIfNew();
      res = await this.fetchAll();
    }
    return res;
  }

  async list() {
    return (await this.listAll()).items;
  }

  async exportAll(): Promise<RawRow[]> {
    const { data, error } = await this.db
      .from(TABLE)
      .select("id, data, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw toStoreError(error, "download your data");
    return (data ?? []).map((r) => ({
      id: String(r.id),
      updatedAt: (r.updated_at as string | null) ?? null,
      data: r.data,
    }));
  }

  async get(id: string) {
    const { data, error } = await this.db
      .from(TABLE)
      .select("data")
      .eq("id", id)
      .maybeSingle();
    if (error) throw toStoreError(error, "load the investigation");
    if (data) {
      const row = readRow(id, data.data);
      return row.ok ? row.inv : null;
    }
    // The landing page links to the shared sample id; map it to the account's own sample.
    if (id === SAMPLE_ID) {
      return (await this.fetchAll()).items.find((i) => i.isSample) ?? null;
    }
    return null;
  }

  async create(seed: InvestigationPatch = {}) {
    assertOnline("save");
    const inv = blankInvestigation(seed);
    await this.insertRow(inv);
    return inv;
  }

  async update(id: string, patch: InvestigationPatch, expectedUpdatedAt?: string) {
    assertOnline("save");
    const { data: cur, error: readErr } = await this.db
      .from(TABLE)
      .select("data, updated_at")
      .eq("id", id)
      .maybeSingle();
    if (readErr) throw toStoreError(readErr, "save");
    if (!cur) throw new StoreError("Investigation not found.", "not_found");
    const storedRow = readRow(id, cur.data);
    if (!storedRow.ok) {
      throw new StoreError("Could not save: this investigation could not be read.", "unknown");
    }
    const stored = storedRow.inv;
    if (expectedUpdatedAt !== undefined && stored.updatedAt !== expectedUpdatedAt) {
      throw new StoreError(CONFLICT_MESSAGE, "conflict");
    }
    const next: Investigation = sanitiseForSave({
      ...stored,
      ...patch,
      updatedAt: nextTimestamp(stored.updatedAt),
    });
    this.assertSize(next);
    // Optimistic concurrency: the write only matches if the row's updated_at is
    // still the one we just read, so a save from another tab or device between
    // our read and write is never overwritten.
    const { data: rows, error } = await this.db
      .from(TABLE)
      .update({ data: next, updated_at: next.updatedAt })
      .eq("id", id)
      .eq("updated_at", cur.updated_at as string)
      .select("id");
    if (error) throw toStoreError(error, "save");
    if (!rows || rows.length === 0) {
      // Either someone saved first, or the row is gone.
      const { data: again } = await this.db.from(TABLE).select("id").eq("id", id).maybeSingle();
      if (again) throw new StoreError(CONFLICT_MESSAGE, "conflict");
      throw new StoreError("Investigation not found.", "not_found");
    }
    return next;
  }

  async delete(id: string) {
    const { error } = await this.db.from(TABLE).delete().eq("id", id);
    if (error) throw toStoreError(error, "delete");
  }

  async duplicate(id: string) {
    const src = await this.get(id);
    if (!src) return null;
    const copy = cloneInvestigation(src);
    await this.insertRow(copy);
    return copy;
  }

  /**
   * Insert-or-replace the account's sample under its fixed id first, and only
   * then remove any other leftover sample rows. If a step fails, the account
   * still has a sample (the old one or the new one), never none.
   */
  async resetSample() {
    assertOnline("reset the sample");
    const sampleId = accountSampleId(this.userId);
    const fresh = { ...buildSample(), id: sampleId, updatedAt: nextTimestamp() };
    const { error } = await this.db
      .from(TABLE)
      .upsert({ id: sampleId, data: sanitiseForSave(fresh), updated_at: fresh.updatedAt }, { onConflict: "id" });
    if (error) throw toStoreError(error, "reset the sample");
    const others = (await this.fetchAll()).items.filter((i) => i.isSample && i.id !== sampleId);
    for (const s of others) await this.delete(s.id);
  }

  /** Inserts investigations copied from this browser, under fresh ids. */
  async importMany(items: Investigation[]): Promise<void> {
    for (const inv of items) await this.insertRow(inv);
  }
}
