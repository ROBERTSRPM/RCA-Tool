import { uid } from "../id";
import { SAMPLE_UPDATED_AT } from "../sample";
import type { Investigation } from "../types";

/** The built-in sample exactly as shipped: never edited (any edit stamps a new updatedAt). */
export function isUntouchedSample(inv: Investigation): boolean {
  return inv.isSample && inv.updatedAt === SAMPLE_UPDATED_AT;
}

export interface ImportDecision {
  /** Show the "copy to your account" offer. */
  offer: boolean;
  /** What would be copied: everything except the untouched sample. */
  candidates: Investigation[];
}

/**
 * Decides whether to offer copying this browser's investigations into a
 * freshly signed-in account. Offered at most once per browser and account, and
 * only when there is real work (not just the untouched sample).
 */
export function decideImport(
  local: Investigation[],
  alreadyOffered: boolean,
): ImportDecision {
  const candidates = local.filter((i) => !isUntouchedSample(i));
  return { offer: !alreadyOffered && candidates.length > 0, candidates };
}

/**
 * Copy to insert into the account: a fresh id (ids are global primary keys) and
 * never flagged as the sample, so "Reset sample data" cannot delete it.
 */
export function prepareImport(inv: Investigation): Investigation {
  return { ...inv, id: uid(), isSample: false };
}
