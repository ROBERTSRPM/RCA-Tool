/**
 * Similar past failures: a transparent scoring function. No AI, no hidden
 * weights; every point has a reason that is shown to the user.
 *
 *   same asset tag ........................ 50
 *   same asset type ....................... 20
 *   same failure mode ..................... 15
 *   each shared significant word .......... 3 (at most 15 in total)
 *
 * Words come from the title, the description and the failure event text, with
 * stop-words removed (see lib/text.ts). A result needs at least MIN_SCORE
 * points, so one common word alone is not enough.
 */
import { failureText } from "./investigation";
import { isVerifiedClosed } from "./finance";
import { deriveStatus } from "./status";
import { tagKey } from "./assets";
import { meaningful, norm, sharedWords, significantWords } from "./text";
import { rootCauses } from "./tree";
import type { ActionItem, CauseNode, Investigation, InvestigationStatus } from "./types";

export const WEIGHTS = {
  sameTag: 50,
  sameType: 20,
  sameFailureMode: 15,
  perSharedWord: 3,
  maxWordPoints: 15,
} as const;

/** Lowest score that is listed. Two shared words, or any asset or failure-mode match. */
export const MIN_SCORE = 6;

export interface SimilarityReason {
  code: "tag" | "type" | "failure_mode" | "words";
  label: string;
  points: number;
}

export interface Similarity {
  score: number;
  reasons: SimilarityReason[];
  sharedWords: string[];
}

/** The words that describe an investigation for matching. */
export function describingWords(inv: Investigation): string[] {
  return significantWords(
    [inv.problem.title, inv.problem.whatHappened, failureText(inv)].join(" "),
  );
}

export function scoreSimilarity(current: Investigation, other: Investigation): Similarity {
  const reasons: SimilarityReason[] = [];
  const a = current.problem;
  const b = other.problem;

  const tagA = tagKey(a.assetTag);
  if (tagA && tagA === tagKey(b.assetTag)) {
    reasons.push({ code: "tag", label: `Same asset (${b.assetTag?.trim()})`, points: WEIGHTS.sameTag });
  }
  const typeA = norm(a.assetType);
  if (meaningful(a.assetType) && typeA === norm(b.assetType)) {
    reasons.push({ code: "type", label: `Same asset type (${b.assetType?.trim()})`, points: WEIGHTS.sameType });
  }
  const modeA = norm(a.failureMode);
  if (meaningful(a.failureMode) && modeA === norm(b.failureMode)) {
    reasons.push({
      code: "failure_mode",
      label: `Same failure mode (${b.failureMode?.trim()})`,
      points: WEIGHTS.sameFailureMode,
    });
  }
  const shared = sharedWords(describingWords(current), describingWords(other));
  if (shared.length > 0) {
    const points = Math.min(shared.length * WEIGHTS.perSharedWord, WEIGHTS.maxWordPoints);
    reasons.push({
      code: "words",
      label: `Shared words: ${shared.slice(0, 6).join(", ")}`,
      points,
    });
  }
  return {
    score: reasons.reduce((s, r) => s + r.points, 0),
    reasons,
    sharedWords: shared,
  };
}

export interface SimilarFailure {
  inv: Investigation;
  similarity: Similarity;
  status: InvestigationStatus;
  rootCauses: CauseNode[];
  /** Actions that are done, i.e. what actually fixed it. */
  doneActions: ActionItem[];
  /** True when all actions are done and the review says it did not recur. */
  fixVerified: boolean;
}

/** Other investigations ranked by similarity (highest first, newest first on ties). */
export function rankSimilar(
  current: Investigation,
  others: Investigation[],
  limit = 5,
): SimilarFailure[] {
  const out: SimilarFailure[] = [];
  for (const o of others) {
    if (o.id === current.id) continue;
    const similarity = scoreSimilarity(current, o);
    if (similarity.score < MIN_SCORE) continue;
    out.push({
      inv: o,
      similarity,
      status: deriveStatus(o),
      rootCauses: rootCauses(o.tree),
      doneActions: o.actions.filter((x) => x.status === "done"),
      fixVerified: isVerifiedClosed(o),
    });
  }
  out.sort(
    (x, y) =>
      y.similarity.score - x.similarity.score ||
      (y.inv.problem.eventDate || y.inv.createdAt).localeCompare(x.inv.problem.eventDate || x.inv.createdAt),
  );
  return out.slice(0, limit);
}

/**
 * A copy of a cause for pasting into another tree: new id, no evidence, never
 * verified, not a root cause, no children. The result is always a hypothesis.
 */
export function copyOfCause(src: CauseNode, newId: string): CauseNode {
  return {
    id: newId,
    text: src.text,
    category: src.category,
    status: "hypothesis",
    evidenceIds: [],
    isRootCause: false,
    collapsed: false,
    children: [],
    ...(src.deterioration ? { deterioration: src.deterioration } : {}),
  };
}
