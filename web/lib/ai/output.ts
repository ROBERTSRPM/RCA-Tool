/**
 * Validation of what the model returns. The model is asked for JSON in a
 * given shape, but nothing it says is trusted: every field is checked,
 * clipped, and references (N1, A2) are mapped back to real ids or dropped.
 * Each validator returns null when nothing usable is left.
 */
import { ISSUE_TYPES } from "./schemas";
import type { Aliases } from "./prompts";
import type { AiLevel } from "./context";
import type { DraftKind } from "./requests";

export interface CoachSuggestion {
  parentId: string;
  level: AiLevel;
  text: string;
  why: string;
  confirmWith: string;
  ruleOutWith: string;
  deterioration: "" | "natural" | "forced";
}
export interface CoachResult {
  suggestions: CoachSuggestion[];
}

export type IssueType = (typeof ISSUE_TYPES)[number];
export interface ChallengeIssue {
  /** Real id of the cause the issue refers to, or "" */
  nodeId: string;
  /** Real id of the action the issue refers to, or "" */
  actionId: string;
  type: IssueType;
  severity: "high" | "medium" | "low";
  message: string;
  question: string;
}
export interface ChallengeResult {
  summary: string;
  issues: ChallengeIssue[];
}

export interface CapaAction {
  kind: "corrective" | "preventive";
  category:
    | "repair"
    | "design"
    | "maintenance_task"
    | "condition_monitoring"
    | "spares"
    | "procedure"
    | "training"
    | "operating_practice";
  description: string;
  intervalValue: number | null;
  intervalUnit: "hours_run" | "days" | "weeks" | "months";
  craft: string;
  rationale: string;
}
export interface CapaResult {
  deterioration: "natural" | "forced" | "unclear";
  deteriorationReason: string;
  actions: CapaAction[];
  horizontalExpansion: string;
}

export interface ProblemDraft {
  title: string;
  whatHappened: string;
  where: string;
  when: string;
  impact: string;
  missingFacts: string[];
}
export interface DocumentDraft {
  title: string;
  sections: { heading: string; body: string }[];
}

export const OUT_LIMITS = {
  suggestions: 8,
  issues: 10,
  actions: 8,
  text: 400,
  note: 600,
  sectionBody: 3000,
  sections: 14,
  docTotal: 14000,
  summaryTotal: 3800,
} as const;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, n: number): string =>
  typeof v === "string" ? v.replace(/\u0000/g, "").trim().slice(0, n) : "";
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | null =>
  typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null;
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/**
 * The user never sees the N#/A#/E# labels used in prompts. If the model writes one in prose anyway,
 * drop a bracketed reference "(N4)" and turn a bare one into the item's own words.
 */
export function stripRefs(s: string, a: Aliases): string {
  const known = (ref: string) => a.titleByAlias.has(ref);
  return s
    .replace(/\s*[([]\s*[NAE]\d{1,3}(?:\s*(?:,|;|\/|&|and|to|-)\s*[NAE]\d{1,3})*\s*[)\]]/g, "")
    .replace(/\b([NAE]\d{1,3})\b/g, (m) => {
      if (!known(m)) return m;
      const t = a.titleByAlias.get(m) ?? "";
      return t ? `"${t}"` : "";
    })
    .replace(/\s{2,}/g, " ")
    .replace(/ ([.,;:])/g, "$1")
    .trim();
}

const ID_KEYS = new Set(["parentId", "nodeId", "actionId"]);

/** Applies stripRefs to every text field of a validated result (ids are left alone). */
export function cleanResult<T>(value: T, a: Aliases): T {
  if (typeof value === "string") return stripRefs(value, a) as T;
  if (Array.isArray(value)) return value.map((v) => cleanResult(v, a)) as T;
  if (isObj(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = ID_KEYS.has(k) ? v : cleanResult(v, a);
    return out as T;
  }
  return value;
}

export function validateCoach(raw: unknown, a: Aliases, scope: "node" | "tree", nodeId: string): CoachResult | null {
  if (!isObj(raw)) return null;
  const out: CoachSuggestion[] = [];
  for (const s of list(raw.suggestions)) {
    if (!isObj(s) || out.length >= OUT_LIMITS.suggestions) continue;
    const t = text(s.text, OUT_LIMITS.text);
    const level = oneOf(s.level, ["physical", "human", "system"] as const);
    if (!t || !level) continue;
    const parent = typeof s.parent === "string" ? a.nodeByAlias.get(s.parent.trim().toUpperCase()) : undefined;
    const det = oneOf(s.deterioration, ["natural", "forced"] as const);
    out.push({
      parentId: scope === "node" ? nodeId : (parent ?? nodeId),
      level,
      text: t,
      why: text(s.why, OUT_LIMITS.note),
      confirmWith: text(s.confirmWith, OUT_LIMITS.note),
      ruleOutWith: text(s.ruleOutWith, OUT_LIMITS.note),
      deterioration: level === "physical" && det ? det : "",
    });
  }
  return out.length ? { suggestions: out } : null;
}

export function validateChallenge(raw: unknown, a: Aliases): ChallengeResult | null {
  if (!isObj(raw)) return null;
  const issues: ChallengeIssue[] = [];
  for (const i of list(raw.issues)) {
    if (!isObj(i) || issues.length >= OUT_LIMITS.issues) continue;
    const message = text(i.message, OUT_LIMITS.text);
    if (!message) continue;
    const ref = typeof i.ref === "string" ? i.ref.trim().toUpperCase() : "";
    const type = oneOf(i.type, ISSUE_TYPES) ?? "other";
    // The failure event at the top does not carry evidence; evidence belongs on the causes beneath it.
    if (type === "no_evidence" && ref === "N1") continue;
    issues.push({
      nodeId: a.nodeByAlias.get(ref) ?? "",
      actionId: a.actionByAlias.get(ref) ?? "",
      type,
      severity: oneOf(i.severity, ["high", "medium", "low"] as const) ?? "medium",
      message,
      question: text(i.question, OUT_LIMITS.text),
    });
  }
  const summary = text(raw.summary, OUT_LIMITS.note);
  if (!summary && issues.length === 0) return null;
  return { summary, issues };
}

export function validateCapa(raw: unknown): CapaResult | null {
  if (!isObj(raw)) return null;
  const actions: CapaAction[] = [];
  for (const x of list(raw.actions)) {
    if (!isObj(x) || actions.length >= OUT_LIMITS.actions) continue;
    const description = text(x.description, OUT_LIMITS.text * 2);
    const kind = oneOf(x.kind, ["corrective", "preventive"] as const);
    const category = oneOf(x.category, [
      "repair",
      "design",
      "maintenance_task",
      "condition_monitoring",
      "spares",
      "procedure",
      "training",
      "operating_practice",
    ] as const);
    if (!description || !kind || !category) continue;
    const isTask = category === "maintenance_task" || category === "condition_monitoring";
    const iv = typeof x.intervalValue === "number" && Number.isFinite(x.intervalValue) ? x.intervalValue : 0;
    actions.push({
      kind,
      category,
      description,
      intervalValue: isTask && iv > 0 && iv <= 100000 ? Math.round(iv * 100) / 100 : null,
      intervalUnit: oneOf(x.intervalUnit, ["hours_run", "days", "weeks", "months"] as const) ?? "months",
      craft: isTask ? text(x.craft, 80) : "",
      rationale: text(x.rationale, OUT_LIMITS.note),
    });
  }
  if (!actions.length) return null;
  return {
    deterioration: oneOf(raw.deterioration, ["natural", "forced", "unclear"] as const) ?? "unclear",
    deteriorationReason: text(raw.deteriorationReason, OUT_LIMITS.note),
    actions,
    horizontalExpansion: text(raw.horizontalExpansion, OUT_LIMITS.note),
  };
}

export function validateProblem(raw: unknown): ProblemDraft | null {
  if (!isObj(raw)) return null;
  const d: ProblemDraft = {
    title: text(raw.title, 120),
    whatHappened: text(raw.whatHappened, 1200),
    where: text(raw.where, 800),
    when: text(raw.when, 800),
    impact: text(raw.impact, 1000),
    missingFacts: list(raw.missingFacts)
      .map((m) => text(m, 200))
      .filter(Boolean)
      .slice(0, 8),
  };
  return d.title || d.whatHappened ? d : null;
}

export function validateDocument(raw: unknown, kind: Exclude<DraftKind, "problem">): DocumentDraft | null {
  if (!isObj(raw)) return null;
  const sections = list(raw.sections)
    .filter(isObj)
    .map((s) => ({ heading: text(s.heading, 100), body: text(s.body, OUT_LIMITS.sectionBody) }))
    .filter((s) => s.heading && s.body)
    .slice(0, OUT_LIMITS.sections);
  if (!sections.length) return null;
  const total = sections.reduce((n, s) => n + s.heading.length + s.body.length, 0);
  if (total > (kind === "summary" ? OUT_LIMITS.summaryTotal : OUT_LIMITS.docTotal)) return null;
  return { title: text(raw.title, 140), sections };
}
