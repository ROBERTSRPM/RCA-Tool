import { getSupabase } from "../supabase/client";
import { LocalStorageAssetStore } from "./assets-local";
import { SupabaseAssetStore } from "./assets-supabase";
import { LocalStorageInvestigationStore } from "./local";
import { SupabaseInvestigationStore } from "./supabase";
import type { AssetStore, InvestigationStore } from "./types";

export type { AssetStore, InvestigationStore } from "./types";
export { StoreError } from "./types";

const local = new LocalStorageInvestigationStore();
const localAssets = new LocalStorageAssetStore();

let userId: string | null = null;
let remote: SupabaseInvestigationStore | null = null;
let remoteAssets: SupabaseAssetStore | null = null;

let markReady: () => void = () => {};
const ready = new Promise<void>((resolve) => {
  markReady = resolve;
});

/**
 * Called by the auth provider whenever the signed-in user changes. Passing
 * null selects the browser (demo mode) store.
 */
export function setStoreUser(id: string | null): void {
  if (id === userId) return;
  userId = id;
  const db = getSupabase();
  remote = id && db ? new SupabaseInvestigationStore(db, id) : null;
  remoteAssets = id && db ? new SupabaseAssetStore(db, id) : null;
}

/** Called once the first session check has finished, releasing waiting calls. */
export function markAuthReady(): void {
  markReady();
}

/** The account store when signed in, else the browser store. */
export function currentStore(): InvestigationStore {
  return remote ?? local;
}

export function getAccountStore(): SupabaseInvestigationStore | null {
  return remote;
}

export function getLocalStore(): LocalStorageInvestigationStore {
  return local;
}

/**
 * The one place the app chooses a persistence backend. Every call waits for the
 * first session check, then goes to Supabase (signed in) or localStorage.
 */
const routed: InvestigationStore = {
  list: async () => (await ready, currentStore().list()),
  listAll: async () => (await ready, currentStore().listAll()),
  exportAll: async () => (await ready, currentStore().exportAll()),
  get: async (id) => (await ready, currentStore().get(id)),
  create: async (seed) => (await ready, currentStore().create(seed)),
  update: async (id, patch, expected) =>
    (await ready, currentStore().update(id, patch, expected)),
  delete: async (id) => (await ready, currentStore().delete(id)),
  duplicate: async (id) => (await ready, currentStore().duplicate(id)),
  resetSample: async () => (await ready, currentStore().resetSample()),
};

export function getStore(): InvestigationStore {
  return routed;
}

/** The asset register: the account table when signed in, else browser storage. Same routing as getStore(). */
const routedAssets: AssetStore = {
  list: async () => (await ready, (remoteAssets ?? localAssets).list()),
  exportAll: async () => (await ready, (remoteAssets ?? localAssets).exportAll()),
  create: async (a) => (await ready, (remoteAssets ?? localAssets).create(a)),
  createMany: async (a) => (await ready, (remoteAssets ?? localAssets).createMany(a)),
  update: async (id, patch) => (await ready, (remoteAssets ?? localAssets).update(id, patch)),
  delete: async (id) => (await ready, (remoteAssets ?? localAssets).delete(id)),
  resetSampleAssets: async () => (await ready, (remoteAssets ?? localAssets).resetSampleAssets()),
};

export function getAssetStore(): AssetStore {
  return routedAssets;
}
