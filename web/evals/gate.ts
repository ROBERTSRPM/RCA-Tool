/** Baseline file and the regression gate. Pure functions, no I/O except load/save. */
import fs from "node:fs";
import type { FeatureStats } from "./report";

export const DEFAULT_THRESHOLD = 0.5;

export interface BaselineFeature {
  score: number;
  hardCheckFailures: number;
  hardCheckPassRate: number;
  items: number;
}
export interface Baseline {
  formatVersion: 1;
  updatedAt: string;
  model: string;
  judgeModel: string;
  note: string;
  /** The case set the baseline was made from: "core" (the default) or "all". Absent in old files. */
  caseSet?: string;
  /** The exact case ids in that run, sorted. A baseline is only compared with a run of the same ids. */
  caseIds?: string[];
  features: Record<string, BaselineFeature>;
}

export function loadBaseline(file: string): Baseline | null {
  try {
    const b = JSON.parse(fs.readFileSync(file, "utf8")) as Baseline;
    return b && b.formatVersion === 1 && b.features ? b : null;
  } catch {
    return null;
  }
}

export function makeBaseline(stats: Record<string, FeatureStats>, model: string, judgeModel: string, caseIds: string[], now = new Date(), caseSet = "core"): Baseline {
  const features: Record<string, BaselineFeature> = {};
  for (const [f, s] of Object.entries(stats)) {
    if (s.meanScore === null) continue;
    features[f] = {
      score: round2(s.meanScore),
      hardCheckFailures: s.hardFailItems,
      hardCheckPassRate: round2(s.hardPassRate),
      items: s.scored,
    };
  }
  return {
    formatVersion: 1,
    updatedAt: now.toISOString(),
    model,
    judgeModel,
    caseSet,
    caseIds: [...caseIds].sort(),
    note: "Per-feature mean judge score (0-10; a hard-check failure counts as 0) and number of items with a hard-check failure. Written by the eval runner with --update-baseline.",
    features,
  };
}

const round2 = (x: number) => Math.round(x * 100) / 100;

export interface GateRow {
  feature: string;
  baseline: number;
  current: number;
  delta: number;
  baselineHardFailures: number;
  currentHardFailures: number;
  scoreRegressed: boolean;
  hardRegressed: boolean;
}
export interface GateResult {
  status: "pass" | "fail" | "no_baseline" | "partial" | "set_mismatch";
  threshold: number;
  rows: GateRow[];
  notes: string[];
}

/** Fails if any feature drops by more than the threshold, or the count of hard-check failures goes up. */
export function compare(
  stats: Record<string, FeatureStats>,
  baseline: Baseline | null,
  opts: { threshold: number; partial: boolean; model: string; judgeModel: string; caseIds?: string[] },
): GateResult {
  const notes: string[] = [];
  if (opts.partial) return { status: "partial", threshold: opts.threshold, rows: [], notes: ["Filtered run (--cases or --features): the gate is not enforced because scores are not comparable to a full-run baseline."] };
  if (!baseline) {
    return { status: "no_baseline", threshold: opts.threshold, rows: [], notes: ["No baseline.json yet, so there is nothing to compare with. The gate is NOT enforced. Run with --update-baseline once the owner accepts a run."] };
  }
  if (opts.caseIds) {
    const now = [...opts.caseIds].sort().join(",");
    const then = baseline.caseIds ? [...baseline.caseIds].sort().join(",") : null;
    if (then !== now) {
      const how = then === null ? "does not record which cases it was made from" : `was made from ${baseline.caseIds!.length} cases`;
      return {
        status: "set_mismatch",
        threshold: opts.threshold,
        rows: [],
        notes: [`The baseline ${how}, but this run used ${opts.caseIds.length} cases (a different set). Scores are not comparable, so the gate is NOT enforced. Run the default core set with --update-baseline to make a matching baseline.`],
      };
    }
  }
  if (baseline.model !== opts.model) notes.push(`Model differs from the baseline (${baseline.model} then, ${opts.model} now).`);
  if (baseline.judgeModel !== opts.judgeModel) notes.push(`Judge differs from the baseline (${baseline.judgeModel} then, ${opts.judgeModel} now): scores may not be comparable.`);
  const rows: GateRow[] = [];
  for (const [feature, b] of Object.entries(baseline.features)) {
    const s = stats[feature];
    if (!s || s.meanScore === null) {
      notes.push(`Feature "${feature}" is in the baseline but has no score in this run.`);
      continue;
    }
    const delta = round2(s.meanScore - b.score);
    rows.push({
      feature,
      baseline: b.score,
      current: round2(s.meanScore),
      delta,
      baselineHardFailures: b.hardCheckFailures,
      currentHardFailures: s.hardFailItems,
      scoreRegressed: b.score - s.meanScore > opts.threshold + 1e-9,
      hardRegressed: s.hardFailItems > b.hardCheckFailures,
    });
  }
  const fail = rows.some((r) => r.scoreRegressed || r.hardRegressed);
  return { status: fail ? "fail" : "pass", threshold: opts.threshold, rows, notes };
}
