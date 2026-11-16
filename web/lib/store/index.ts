import { LocalStorageInvestigationStore } from "./local";
import type { InvestigationStore } from "./types";

export type { InvestigationStore } from "./types";
export { StoreError } from "./types";

let instance: InvestigationStore | null = null;

/**
 * The one place the app chooses a persistence backend. Phase B replaces the
 * body of this function with a database-backed store.
 */
export function getStore(): InvestigationStore {
  if (!instance) instance = new LocalStorageInvestigationStore();
  return instance;
}
