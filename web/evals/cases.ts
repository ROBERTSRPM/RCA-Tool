/**
 * Loads the eval cases from /evals/cases and turns each into the AI requests production would send.
 * Context building and request parsing are the app's own (buildAiContext, parseRequest).
 */
import fs from "node:fs";
import path from "node:path";
import { buildAiContext, type AiContext } from "../lib/ai/context";
import { blankInvestigation } from "../lib/investigation";
import { normaliseInvestigation } from "../lib/normalize";
import { parseRequest, type AiFeature, type AiRequest, type DraftKind } from "../lib/ai/requests";
import type { Investigation } from "../lib/types";
import { buildAllowedNumbers, type HardChecksSpec } from "./checks";

export const EVALS_DIR = path.resolve(import.meta.dirname, "../../evals");
export const CASES_DIR = path.join(EVALS_DIR, "cases");

export interface EvalCase {
  id: string;
  kind?: string;
  baseCase?: string;
  title: string;
  summary?: string;
  tests?: string;
  flags?: string[];
  input: {
    investigation: unknown;
    problemDraft: { existingFields: Record<string, unknown>; roughNotes: string };
  };
  requests: {
    coach: { scope: "node" | "tree"; nodeId?: string }[];
    challenge: { focus?: string }[];
    capa: { rootCauseId: string }[];
    draft: { kind: DraftKind; notes: string }[];
  };
  grading: Record<string, unknown>;
  hardChecks: HardChecksSpec;
}

export interface EvalCall {
  callId: string;
  caseId: string;
  feature: AiFeature;
  /** coach:node:n2, coach:tree, challenge, capa:n2, draft:problem ... */
  label: string;
  draftKind?: DraftKind;
  request: AiRequest;
  /** The part of the grading guide that applies to this call (for the judge). */
  guide: unknown;
  /** Injection cases only: what must still happen and what must not. */
  injectionGuide: unknown | null;
  checks: {
    spec: HardChecksSpec;
    allowedNumbers: Set<string>;
    verifiedNodeTexts: string[];
    isInjection: boolean;
    expectsIssues: boolean;
  };
  caseInfo: { title: string; summary: string; tests: string };
}

export function loadCases(dir = CASES_DIR): EvalCase[] {
  return fs
    .readdirSync(dir)
    .filter((f) => /^(case|injection)-\d+\.json$/.test(f))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as EvalCase);
}

/**
 * Case filter: ids ("case-03", "injection-02"), bare numbers ("3" means case-03),
 * ranges ("1-5"), and the groups "case", "injection" and "all".
 */
export function filterCases(all: EvalCase[], spec: string | undefined): EvalCase[] {
  if (!spec || spec === "all") return all;
  const wanted = new Set<string>();
  const groups = new Set<string>();
  for (const part of spec.split(",").map((s) => s.trim()).filter(Boolean)) {
    const range = /^(\d+)-(\d+)$/.exec(part);
    if (range) {
      for (let n = Number(range[1]); n <= Number(range[2]); n++) wanted.add(`case-${String(n).padStart(2, "0")}`);
    } else if (/^\d+$/.test(part)) wanted.add(`case-${part.padStart(2, "0")}`);
    else if (part === "case" || part === "injection") groups.add(part);
    else wanted.add(part);
  }
  const out = all.filter((c) => wanted.has(c.id) || groups.has(c.id.startsWith("injection") ? "injection" : "case"));
  const missing = [...wanted].filter((id) => !all.some((c) => c.id === id));
  if (missing.length) throw new Error(`Unknown case id(s): ${missing.join(", ")}`);
  return out;
}

export const FEATURE_NAMES: AiFeature[] = ["coach", "challenge", "capa", "draft"];

/** --features accepts coach, challenge, capa, draft and draft:problem|report|summary. */
export function parseFeatureFilter(spec: string | undefined): (label: string, feature: AiFeature) => boolean {
  if (!spec || spec === "all") return () => true;
  const parts = spec.split(",").map((s) => s.trim()).filter(Boolean);
  for (const p of parts) {
    const [f, k] = p.split(":");
    if (!FEATURE_NAMES.includes(f as AiFeature) || (k && !(f === "draft" && ["problem", "report", "summary"].includes(k)))) {
      throw new Error(`Unknown feature "${p}". Use coach, challenge, capa, draft or draft:problem|report|summary.`);
    }
  }
  return (label, feature) => parts.some((p) => p === feature || p === label.replace(/^(draft:\w+).*/, "$1"));
}

function textsOf(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string" || typeof v === "number") out.push(String(v));
  else if (Array.isArray(v)) v.forEach((x) => textsOf(x, out));
  else if (v && typeof v === "object") Object.values(v as object).forEach((x) => textsOf(x, out));
  return out;
}

function verifiedTexts(inv: Investigation): string[] {
  const out: string[] = [];
  const walk = (n: Investigation["tree"]) => {
    if (n.status === "verified" && n.text.trim()) out.push(n.text);
    n.children.forEach(walk);
  };
  walk(inv.tree);
  return out;
}

/** The investigation the problem-statement draft sees: a fresh one with only the asset fields filled in. */
function problemDraftInvestigation(c: EvalCase): Investigation {
  const blank = blankInvestigation();
  const merged = normaliseInvestigation({ ...blank, problem: { ...blank.problem, ...c.input.problemDraft.existingFields } });
  if (!merged) throw new Error(`${c.id}: problem-draft context could not be built`);
  return merged;
}

function must<T>(r: { ok: true; value: T } | { ok: false; message: string }, what: string): T {
  if (!r.ok) throw new Error(`${what}: ${r.message}`);
  return r.value;
}

export function buildCalls(c: EvalCase, base: EvalCase | null): EvalCall[] {
  const inv = normaliseInvestigation(c.input.investigation);
  if (!inv) throw new Error(`${c.id}: investigation did not normalise`);
  const ctx: AiContext = buildAiContext(inv);
  const probCtx = buildAiContext(problemDraftInvestigation(c));
  const grading = (base ?? c).grading as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const isInjection = c.kind === "injection";
  const injectionGuide = isInjection ? c.grading : null;
  const inputTexts = [...textsOf(c.input), ...textsOf(c.requests)];
  const expectsIssues = Array.isArray(grading.challenge?.mustFlag) && grading.challenge.mustFlag.length > 0;
  const verifiedNodeTexts = verifiedTexts(inv);
  const caseInfo = { title: c.title, summary: c.summary ?? "", tests: c.tests ?? "" };

  const mk = (
    feature: AiFeature,
    label: string,
    request: AiRequest,
    guide: unknown,
    extraSpec: Record<string, unknown> = {},
    draftKind?: DraftKind,
  ): EvalCall => ({
    callId: `${c.id}/${label}`,
    caseId: c.id,
    feature,
    label,
    draftKind,
    request,
    guide,
    injectionGuide,
    checks: {
      spec: { ...c.hardChecks, ...extraSpec },
      allowedNumbers: buildAllowedNumbers(c.hardChecks, inputTexts, request.context),
      verifiedNodeTexts,
      isInjection,
      expectsIssues,
    },
    caseInfo,
  });

  const calls: EvalCall[] = [];
  for (const r of c.requests.coach) {
    const req = must(parseRequest("coach", { context: ctx, ...r }), `${c.id} coach`);
    calls.push(mk("coach", r.scope === "tree" ? "coach:tree" : `coach:node:${r.nodeId}`, req, grading.coach));
  }
  for (const r of c.requests.challenge) {
    const req = must(parseRequest("challenge", { context: ctx, ...r }), `${c.id} challenge`);
    calls.push(mk("challenge", "challenge", req, grading.challenge));
  }
  for (const r of c.requests.capa) {
    const req = must(parseRequest("capa", { context: ctx, ...r }), `${c.id} capa`);
    const g = (grading.capa as { rootCauseId: string }[] | undefined)?.find((x) => x.rootCauseId === r.rootCauseId);
    if (!g) throw new Error(`${c.id}: no capa grading for ${r.rootCauseId}`);
    calls.push(mk("capa", `capa:${r.rootCauseId}`, req, g, { expectedCapaDeterioration: (g as { expectedDeterioration?: string }).expectedDeterioration }));
  }
  for (const r of c.requests.draft) {
    const context = r.kind === "problem" ? probCtx : ctx;
    const req = must(parseRequest("draft", { context, kind: r.kind, notes: r.kind === "problem" ? r.notes || c.input.problemDraft.roughNotes : r.notes }), `${c.id} draft:${r.kind}`);
    // The management summary has no list of its own: the report's lists serve it.
    const g = grading.draft?.[r.kind] ?? grading.draft?.report;
    if (!g) throw new Error(`${c.id}: no draft grading for ${r.kind}`);
    calls.push(mk("draft", `draft:${r.kind}`, req, g, {}, r.kind));
  }
  return calls;
}

export function buildAllCalls(cases: EvalCase[], all: EvalCase[], featureOk: (label: string, f: AiFeature) => boolean): EvalCall[] {
  const byId = new Map(all.map((c) => [c.id, c]));
  return cases.flatMap((c) => {
    const base = c.baseCase ? (byId.get(c.baseCase) ?? null) : null;
    if (c.baseCase && !base) throw new Error(`${c.id}: base case ${c.baseCase} not found`);
    return buildCalls(c, base).filter((k) => featureOk(k.label, k.feature));
  });
}
