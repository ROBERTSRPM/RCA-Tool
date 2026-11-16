import type { SupabaseClient } from "@supabase/supabase-js";
import { blankInvestigation, cloneInvestigation } from "../investigation";
import { buildSample, SAMPLE_ID } from "../sample";
import type { Investigation, InvestigationPatch } from "../types";
import { StoreError, type InvestigationStore } from "./types";

const TABLE = "investigations";
const SEEDED_FLAG = "rca_seeded";

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
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("load failed")) {
    return new StoreError(`Could not ${action}: no connection to the server.`, "network");
  }
  if (err.code === "42501") {
    return new StoreError(`Could not ${action}: not allowed.`, "auth");
  }
  return new StoreError(`Could not ${action}. ${err.message ?? ""}`.trim(), "unknown");
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

  private async insertRow(inv: Investigation): Promise<void> {
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

  private async fetchAll(): Promise<Investigation[]> {
    const { data, error } = await this.db
      .from(TABLE)
      .select("data")
      .order("updated_at", { ascending: false });
    if (error) throw toStoreError(error, "load your investigations");
    return (data ?? []).map((r) => r.data as Investigation);
  }

  async list() {
    let rows = await this.fetchAll();
    if (rows.length === 0) {
      await this.seedIfNew();
      rows = await this.fetchAll();
    }
    return rows;
  }

  async get(id: string) {
    const { data, error } = await this.db
      .from(TABLE)
      .select("data")
      .eq("id", id)
      .maybeSingle();
    if (error) throw toStoreError(error, "load the investigation");
    if (data) return data.data as Investigation;
    // The landing page links to the shared sample id; map it to the account's own sample.
    if (id === SAMPLE_ID) {
      return (await this.fetchAll()).find((i) => i.isSample) ?? null;
    }
    return null;
  }

  async create(seed: InvestigationPatch = {}) {
    const inv = blankInvestigation(seed);
    await this.insertRow(inv);
    return inv;
  }

  async update(id: string, patch: InvestigationPatch) {
    const { data: cur, error: readErr } = await this.db
      .from(TABLE)
      .select("data")
      .eq("id", id)
      .maybeSingle();
    if (readErr) throw toStoreError(readErr, "save");
    if (!cur) throw new StoreError("Investigation not found.", "not_found");
    const next: Investigation = {
      ...(cur.data as Investigation),
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    const { data: rows, error } = await this.db
      .from(TABLE)
      .update({ data: next, updated_at: next.updatedAt })
      .eq("id", id)
      .select("id");
    if (error) throw toStoreError(error, "save");
    if (!rows || rows.length === 0) {
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

  async resetSample() {
    const existing = (await this.fetchAll()).filter((i) => i.isSample);
    for (const s of existing) await this.delete(s.id);
    await this.insertRow({
      ...buildSample(),
      id: accountSampleId(this.userId),
      updatedAt: new Date().toISOString(),
    });
  }

  /** Inserts investigations copied from this browser, under fresh ids. */
  async importMany(items: Investigation[]): Promise<void> {
    for (const inv of items) await this.insertRow(inv);
  }
}
