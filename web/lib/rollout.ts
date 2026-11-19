/**
 * Horizontal expansion: "Roll out this countermeasure". Ranks the other assets in the
 * register that could fail the same way, and builds the rollout checks.
 *
 * Rules (all shown to the user as reasons):
 *   - the asset type must be the same (no type, or a different type: not listed);
 *   - the asset itself (same tag) is never listed;
 *   - each shared significant word in the duty ........ 5 (at most 20)
 *   - same make/model ................................. 15 (one shared word: 6)
 *   - criticality A / B / C ........................... 9 / 6 / 3
 *   - the same type itself ............................ 10 (so every candidate has a score)
 */
import { tagKey } from "./assets";
import { uid } from "./id";
import { meaningful, norm, sharedWords, significantWords } from "./text";
import { rootCauses } from "./tree";
import type { Asset, Criticality, Investigation, Problem, RolloutCheck, RolloutStatus } from "./types";

export const ROLLOUT_WEIGHTS = {
  sameType: 10,
  perDutyWord: 5,
  maxDutyPoints: 20,
  sameMakeModel: 15,
  sharedMakeModelWord: 6,
  criticality: { A: 9, B: 6, C: 3, "": 0 } as Record<Criticality, number>,
} as const;

export interface RolloutCandidate {
  asset: Asset;
  score: number;
  reasons: string[];
}

/** The details of the failed asset that matter for matching. */
export interface RolloutSubject {
  tag: string;
  type: string;
  makeModel: string;
  duty: string;
}

export function subjectFromProblem(p: Partial<Problem>): RolloutSubject {
  return {
    tag: (p.assetTag ?? "").trim(),
    type: (p.assetType ?? "").trim(),
    makeModel: (p.makeModel ?? "").trim(),
    duty: (p.duty ?? "").trim(),
  };
}

export function rankRolloutCandidates(subject: RolloutSubject, assets: Asset[]): RolloutCandidate[] {
  const type = norm(subject.type);
  if (!meaningful(subject.type)) return [];
  const ownTag = tagKey(subject.tag);
  const dutyWords = significantWords(subject.duty);
  const makeWords = significantWords(subject.makeModel);
  const out: RolloutCandidate[] = [];
  for (const a of assets) {
    if (norm(a.type) !== type) continue;
    if (ownTag && tagKey(a.tag) === ownTag) continue;
    const reasons: string[] = [`Same type (${a.type})`];
    let score = ROLLOUT_WEIGHTS.sameType;

    const shared = sharedWords(dutyWords, significantWords(a.duty));
    if (shared.length) {
      score += Math.min(shared.length * ROLLOUT_WEIGHTS.perDutyWord, ROLLOUT_WEIGHTS.maxDutyPoints);
      reasons.push(`Similar duty (${shared.slice(0, 4).join(", ")})`);
    }
    if (norm(subject.makeModel) && norm(a.makeModel) === norm(subject.makeModel)) {
      score += ROLLOUT_WEIGHTS.sameMakeModel;
      reasons.push(`Same make and model (${a.makeModel})`);
    } else if (sharedWords(makeWords, significantWords(a.makeModel)).length) {
      score += ROLLOUT_WEIGHTS.sharedMakeModelWord;
      reasons.push(`Similar make or model (${a.makeModel})`);
    }
    const c = ROLLOUT_WEIGHTS.criticality[a.criticality] ?? 0;
    if (c > 0) {
      score += c;
      reasons.push(`Criticality ${a.criticality}`);
    }
    out.push({ asset: a, score, reasons });
  }
  out.sort(
    (x, y) =>
      y.score - x.score || x.asset.tag.localeCompare(y.asset.tag, undefined, { numeric: true }),
  );
  return out;
}

/** Default wording for "what to check", from the root causes and the preventive actions. */
export function defaultRolloutCheckText(inv: Investigation): string {
  const roots = rootCauses(inv.tree).map((r) => r.text.trim()).filter(Boolean);
  const preventive = inv.actions
    .filter((a) => a.kind === "preventive" && a.description.trim())
    .map((a) => a.description.trim());
  const lines: string[] = [];
  const failure = inv.problem.failureMode?.trim() || inv.problem.title.trim();
  lines.push(
    `Check whether this asset could fail the same way${failure ? ` (${failure})` : ""}.`,
  );
  if (roots.length) {
    lines.push("Look for these causes:");
    roots.forEach((r) => lines.push(`- ${clip(r, 160)}`));
  }
  if (preventive.length) {
    lines.push("Check that this countermeasure is in place:");
    preventive.forEach((r) => lines.push(`- ${clip(r, 160)}`));
  }
  return lines.join("\n");
}

function clip(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export function assetLabel(a: Pick<Asset, "tag" | "type" | "duty">): string {
  return [a.tag, a.type].filter(Boolean).join(" · ") + (a.duty ? ` (${a.duty})` : "");
}

/** New rollout checks for the chosen assets. Assets that already have a check are skipped. */
export function createRolloutChecks(
  chosen: Asset[],
  what: string,
  existing: RolloutCheck[] = [],
  owner = "",
  dueDate = "",
): RolloutCheck[] {
  const have = new Set(existing.map((r) => r.assetId));
  const out: RolloutCheck[] = [];
  for (const a of chosen) {
    if (have.has(a.id)) continue;
    have.add(a.id);
    out.push({
      id: uid(),
      assetId: a.id,
      assetTag: a.tag,
      assetLabel: assetLabel(a),
      what,
      owner,
      dueDate,
      status: "open",
    });
  }
  return out;
}

export interface RolloutProgress {
  total: number;
  open: number;
  noIssue: number;
  sameProblem: number;
  fixed: number;
  /** Checks that are finished: anything but Open. */
  done: number;
  /** Rounded percent done, 0 when there are no checks. */
  percent: number;
}

export function rolloutProgress(checks: RolloutCheck[] | undefined): RolloutProgress {
  const list = checks ?? [];
  const count = (s: RolloutStatus) => list.filter((c) => c.status === s).length;
  const open = count("open");
  const done = list.length - open;
  return {
    total: list.length,
    open,
    noIssue: count("no_issue"),
    sameProblem: count("same_problem"),
    fixed: count("fixed"),
    done,
    percent: list.length ? Math.round((done / list.length) * 100) : 0,
  };
}

/** "Same problem found" and not yet "Fixed": the ones that need work. */
export function needsFixing(checks: RolloutCheck[] | undefined): RolloutCheck[] {
  return (checks ?? []).filter((c) => c.status === "same_problem");
}
