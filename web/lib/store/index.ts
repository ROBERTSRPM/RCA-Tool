import { getSupabase } from "../supabase/client";
import { LocalStorageInvestigationStore } from "./local";
import { SupabaseInvestigationStore } from "./supabase";
import type { InvestigationStore } from "./types";

export type { InvestigationStore } from "./types";
export { StoreError } from "./types";

const local = new LocalStorageInvestigationStore();

let userId: string | null = null;
let remote: SupabaseInvestigationStore | null = null;

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
