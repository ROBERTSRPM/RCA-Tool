/**
 * The slim, size-limited view of an investigation that is sent to the AI.
 * The browser builds it (buildAiContext) and the server parses it again
 * (parseAiContext): the server never trusts the browser, so every field is
 * re-checked, clipped and capped. No images, no money values, no dates of
 * edits: only what the AI needs to reason about the failure.
 */
import { calcLoss, formatMoney, isLossQuantified, isVerifiedClosed } from "../finance";
import { flatten } from "../tree";
import type { Investigation } from "../types";

export const AI_LIMITS = {
  short: 200,
  long: 1200,
  note: 400,
  nodes: 120,
  evidence: 40,
  actions: 60,
  /** Cap on the context after clipping, in characters of JSON. */
  totalChars: 30000,
  /** Cap on free-text notes typed into a draft box. */
  notes: 4000,
} as const;

export type AiLevel = "physical" | "human" | "system";
export const AI_LEVELS: AiLevel[] = ["physical", "human", "system"];
const STATUSES = ["hypothesis", "verified", "ruled_out"] as const;
const DETERIORATIONS = ["", "natural", "forced", "not_applicable"] as const;
const KINDS = ["", "corrective", "preventive"] as const;
const CATEGORIES = [
  "",
  "repair",
  "design",
  "maintenance_task",
  "condition_monitoring",
  "spares",
  "procedure",
  "training",
  "operating_practice",
] as const;
const EVIDENCE_TYPES = ["photo", "data", "document", "interview", "inspection", "other"] as const;

export interface AiProblem {
  title: string;
  asset: string;
  site: string;
  eventDate: string;
  whatHappened: string;
  where: string;
  when: string;
  impact: string;
  assetTag: string;
  assetType: string;
  makeModel: string;
  duty: string;
  criticality: string;
  failureMode: string;
  /** "process" for a process or quality failure; "equipment" otherwise. */
  failureType: "equipment" | "process";
  qualityRef: string;
}

export interface AiEvidence {
  id: string;
  type: (typeof EVIDENCE_TYPES)[number];
  title: string;
  note: string;
}

export interface AiNode {
  id: string;
  parentId: string | null;
  text: string;
  category: AiLevel;
  status: (typeof STATUSES)[number];
  isRootCause: boolean;
  deterioration: (typeof DETERIORATIONS)[number];
  evidenceIds: string[];
}

export interface AiAction {
  id: string;
  causeId: string;
  description: string;
  kind: (typeof KINDS)[number];
  category: (typeof CATEGORIES)[number];
  /** e.g. "every 3 months"; empty when none. */
  interval: string;
  /** Recorded fields the report needs. Empty string means truly not set. */
  owner: string;
  dueDate: string;
  status: "open" | "in_progress" | "done";
  craft: string;
}

export interface AiContext {
  problem: AiProblem;
  evidence: AiEvidence[];
  nodes: AiNode[];
  actions: AiAction[];
  /** Plain words, e.g. "needed, not in stock, 30 days lead time"; empty if not recorded. */
  spares: string;
  /** One line on the cost of the failure, in the user's own figures; empty if not quantified. */
  loss: string;
  /** One line on verification status, e.g. "not yet reviewed"; empty if unknown. */
  verification: string;
}

const clip = (v: unknown, n: number): string =>
  typeof v === "string" ? v.replace(/\u0000/g, "").trim().slice(0, n) : "";

function oneOf<T extends string>(v: unknown, allowed: readonly T[], d: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : d;
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/* ---------- Browser side ---------- */

function intervalText(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) return "";
  const words: Record<string, string> = { hours_run: "hours run", days: "days", weeks: "weeks", months: "months" };
  return `every ${value} ${words[unit] ?? unit}`;
}

/** Builds the slim context from a full investigation (browser side). */
export function buildAiContext(inv: Investigation): AiContext {
  const p = inv.problem;
  const flat = flatten(inv.tree);
  const sp = inv.spares;
  const spares = sp
    ? [
        sp.needed === "yes" ? "spare was needed" : sp.needed === "no" ? "no spare needed" : "",
        sp.inStock === "yes" ? "in stock" : sp.inStock === "no" ? "not in stock" : "",
        sp.leadTimeDays ? `${sp.leadTimeDays} days lead time` : "",
        sp.coverage,
      ]
        .filter(Boolean)
        .join(", ")
    : "";
  const cur = inv.loss.currency || "$";
  const loss = isLossQuantified(inv.loss)
    ? calcLoss(inv.loss).usesEstimate
      ? `rough estimate of ${formatMoney(calcLoss(inv.loss).annualLoss, cur)} lost per year (not broken down)`
      : `${inv.loss.eventsPerYear ?? "?"} events per year, ${inv.loss.downtimeHours ?? "?"} hours down per event, about ${formatMoney(calcLoss(inv.loss).annualLoss, cur)} lost per year`
    : "loss not costed yet";
  const v = inv.verification;
  const verification = isVerifiedClosed(inv)
    ? "actions done and the failure has not recurred (verified)"
    : v.recurred === "yes"
      ? "the failure recurred after the actions"
      : "not yet verified";
  return parseAiContextLoose({
    loss,
    verification,
    problem: {
      title: p.title,
      asset: p.asset,
      site: p.site,
      eventDate: p.eventDate,
      whatHappened: p.whatHappened,
      where: p.where,
      when: p.when,
      impact: p.impact,
      assetTag: p.assetTag ?? "",
      assetType: p.assetType ?? "",
      makeModel: p.makeModel ?? "",
      duty: p.duty ?? "",
      criticality: p.criticality ?? "",
      failureMode: p.failureMode ?? "",
      failureType: p.failureType === "process" ? "process" : "equipment",
      qualityRef: p.qualityRef ?? "",
    },
    evidence: inv.evidence.map((e) => ({ id: e.id, type: e.type, title: e.title, note: e.note })),
    nodes: flat.map((f) => ({
      id: f.node.id,
      parentId: f.parent?.id ?? null,
      text: f.node.text,
      category: f.node.category,
      status: f.node.status,
      isRootCause: f.node.isRootCause,
      deterioration: f.node.deterioration ?? "",
      evidenceIds: f.node.evidenceIds,
    })),
    actions: inv.actions.map((a) => ({
      id: a.id,
      causeId: a.causeId,
      description: a.description,
      kind: a.kind ?? "",
      category: a.category ?? "",
      interval: a.task ? intervalText(a.task.intervalValue, a.task.intervalUnit) : "",
      owner: a.owner,
      dueDate: a.dueDate,
      status: a.status,
      craft: a.task?.craft ?? "",
    })),
    spares,
  });
}

/* ---------- Shared parsing ---------- */

/** Clips and caps without rejecting; used by the browser builder. */
function parseAiContextLoose(raw: unknown): AiContext {
  const o = isObj(raw) ? raw : {};
  const pr = isObj(o.problem) ? o.problem : {};
  const problem: AiProblem = {
    title: clip(pr.title, AI_LIMITS.short),
    asset: clip(pr.asset, AI_LIMITS.short),
    site: clip(pr.site, AI_LIMITS.short),
    eventDate: clip(pr.eventDate, 10),
    whatHappened: clip(pr.whatHappened, AI_LIMITS.long),
    where: clip(pr.where, AI_LIMITS.long),
    when: clip(pr.when, AI_LIMITS.long),
    impact: clip(pr.impact, AI_LIMITS.long),
    assetTag: clip(pr.assetTag, 60),
    assetType: clip(pr.assetType, 80),
    makeModel: clip(pr.makeModel, 120),
    duty: clip(pr.duty, AI_LIMITS.short),
    criticality: oneOf(pr.criticality, ["", "A", "B", "C"] as const, ""),
    failureMode: clip(pr.failureMode, 120),
    failureType: oneOf(pr.failureType, ["equipment", "process"] as const, "equipment"),
    qualityRef: clip(pr.qualityRef, 80),
  };
  const evidence: AiEvidence[] = (Array.isArray(o.evidence) ? o.evidence : [])
    .filter(isObj)
    .slice(0, AI_LIMITS.evidence)
    .map((e) => ({
      id: clip(e.id, 64),
      type: oneOf(e.type, EVIDENCE_TYPES, "other"),
      title: clip(e.title, AI_LIMITS.short),
      note: clip(e.note, AI_LIMITS.note),
    }))
    .filter((e) => e.id);
  const evIds = new Set(evidence.map((e) => e.id));
  const nodes: AiNode[] = (Array.isArray(o.nodes) ? o.nodes : [])
    .filter(isObj)
    .slice(0, AI_LIMITS.nodes)
    .map((n) => ({
      id: clip(n.id, 64),
      parentId: typeof n.parentId === "string" && n.parentId ? clip(n.parentId, 64) : null,
      text: clip(n.text, AI_LIMITS.short * 2),
      category: oneOf(n.category, AI_LEVELS, "physical"),
      status: oneOf(n.status, STATUSES, "hypothesis"),
      isRootCause: n.isRootCause === true,
      deterioration: oneOf(n.deterioration, DETERIORATIONS, ""),
      evidenceIds: (Array.isArray(n.evidenceIds) ? n.evidenceIds : [])
        .filter((x): x is string => typeof x === "string" && evIds.has(x))
        .slice(0, 20),
    }))
    .filter((n) => n.id);
  const nodeIds = new Set(nodes.map((n) => n.id));
  const actions: AiAction[] = (Array.isArray(o.actions) ? o.actions : [])
    .filter(isObj)
    .slice(0, AI_LIMITS.actions)
    .map((a) => ({
      id: clip(a.id, 64),
      causeId: typeof a.causeId === "string" && nodeIds.has(a.causeId) ? a.causeId : "",
      description: clip(a.description, AI_LIMITS.short * 2),
      kind: oneOf(a.kind, KINDS, ""),
      category: oneOf(a.category, CATEGORIES, ""),
      interval: clip(a.interval, 60),
      owner: clip(a.owner, 80),
      dueDate: /^\d{4}-\d{2}-\d{2}$/.test(clip(a.dueDate, 10)) ? clip(a.dueDate, 10) : "",
      status: oneOf(a.status, ["open", "in_progress", "done"] as const, "open"),
      craft: clip(a.craft, 80),
    }))
    .filter((a) => a.id);
  return {
    problem,
    evidence,
    nodes: nodes.map((n) => ({ ...n, parentId: n.parentId && nodeIds.has(n.parentId) ? n.parentId : null })),
    actions,
    spares: clip(o.spares, AI_LIMITS.short),
    loss: clip(o.loss, 300),
    verification: clip(o.verification, 200),
  };
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; message: string };

/** Server side: strict about shape, tolerant about length. Rejects what is still too big. */
export function parseAiContext(raw: unknown): ParseResult<AiContext> {
  if (!isObj(raw)) return { ok: false, message: "The investigation was missing." };
  if (!isObj(raw.problem) || !Array.isArray(raw.nodes) || raw.nodes.length === 0) {
    return { ok: false, message: "The investigation has no cause tree to work from." };
  }
  const value = parseAiContextLoose(raw);
  if (value.nodes.length === 0) {
    return { ok: false, message: "The investigation has no cause tree to work from." };
  }
  if (JSON.stringify(value).length > AI_LIMITS.totalChars) {
    return { ok: false, message: "This investigation is too large to send to the AI. Shorten some long notes and try again." };
  }
  return { ok: true, value };
}

/** Free-text notes from a draft box. */
export function parseNotes(raw: unknown, required: boolean): ParseResult<string> {
  if (raw === undefined || raw === null || raw === "") {
    return required ? { ok: false, message: "Type some rough notes first." } : { ok: true, value: "" };
  }
  if (typeof raw !== "string") return { ok: false, message: "The notes were not text." };
  const t = raw.replace(/\u0000/g, "").trim();
  if (t.length > AI_LIMITS.notes) {
    return { ok: false, message: `Notes are too long (limit ${AI_LIMITS.notes} characters). Shorten them and try again.` };
  }
  if (required && t.length < 10) return { ok: false, message: "Type a few more words so there is something to work from." };
  return { ok: true, value: t };
}
