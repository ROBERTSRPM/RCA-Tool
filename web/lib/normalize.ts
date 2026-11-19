/**
 * Tolerant reading of stored investigation data. Whatever is in the database
 * or in browser storage (a partial object, wrong types, hostile values), the
 * result is either a fully shaped Investigation that every screen can render,
 * or `null` when the value is not an investigation at all.
 */
import { uid } from "./id";
import { blankInvestigation } from "./investigation";
import type {
  Problem,
  Asset,
  ActionCategory,
  ActionItem,
  ActionKind,
  ActionStatus,
  CauseNode,
  Category,
  Criticality,
  CauseArea,
  Deterioration,
  IntervalUnit,
  MaintenanceTask,
  RolloutCheck,
  RolloutStatus,
  SparesCheck,
  YesNoUnknown,
  EvidenceItem,
  EvidenceType,
  Investigation,
  Loss,
  NodeStatus,
  OtherCost,
  OtherCostCategory,
  Recurrence,
} from "./types";
import { OTHER_COST_CATEGORIES } from "./types";

/** Evidence images must be base64 data URLs of exactly these three types. */
const SAFE_IMAGE_RE = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export function isSafeImage(value: unknown): value is string {
  return typeof value === "string" && SAFE_IMAGE_RE.test(value);
}

/** The image if it is allowed, else null. */
export function safeImage(value: unknown): string | null {
  return isSafeImage(value) ? value : null;
}

/** A row that exists but cannot be shown; the user can still delete it. */
export interface UnreadableRow {
  id: string;
}

const MAX_TREE_DEPTH = 40;
const MAX_NODES = 2000;

const CATEGORIES: Category[] = ["physical", "human", "system"];
const NODE_STATUSES: NodeStatus[] = ["hypothesis", "verified", "ruled_out"];
const EVIDENCE_TYPES: EvidenceType[] = ["photo", "data", "document", "interview", "inspection", "other"];
const ACTION_STATUSES: ActionStatus[] = ["open", "in_progress", "done"];
const RECURRENCES: Recurrence[] = ["unreviewed", "no", "yes"];
const KINDS: ActionKind[] = ["", "corrective", "preventive"];
const ACTION_CATEGORIES_ALL: ActionCategory[] = [
  "",
  "repair",
  "design",
  "maintenance_task",
  "condition_monitoring",
  "spares",
  "procedure",
  "training",
  "operating_practice",
];
const INTERVAL_UNITS_ALL: IntervalUnit[] = ["hours_run", "days", "weeks", "months"];
const DETERIORATIONS: Deterioration[] = ["", "natural", "forced", "not_applicable"];
const CAUSE_AREAS: CauseArea[] = ["", "equipment", "materials", "method", "measurement", "people", "environment"];
const CRITICALITIES: Criticality[] = ["", "A", "B", "C"];
const YES_NO: YesNoUnknown[] = ["", "yes", "no"];
const ROLLOUT_STATUSES: RolloutStatus[] = ["open", "no_issue", "same_problem", "fixed"];
const COST_CATEGORIES = OTHER_COST_CATEGORIES.map((c) => c.value);

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const bool = (v: unknown, d = false): boolean => (typeof v === "boolean" ? v : d);
function oneOf<T extends string>(v: unknown, allowed: readonly T[], d: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : d;
}
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
/** Own, non-prototype key read, so "__proto__" payloads cannot leak in. */
const get = (o: Obj, k: string): unknown =>
  Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined;

function normaliseEvidence(raw: unknown): EvidenceItem | null {
  if (!isObj(raw)) return null;
  return {
    id: str(get(raw, "id")) || uid(),
    type: oneOf(get(raw, "type"), EVIDENCE_TYPES, "other"),
    title: str(get(raw, "title")),
    note: str(get(raw, "note")),
    date: str(get(raw, "date")),
    image: safeImage(get(raw, "image")),
  };
}

function normaliseNode(raw: unknown, depth: number, budget: { n: number }): CauseNode {
  const o = isObj(raw) ? raw : {};
  budget.n += 1;
  const children: CauseNode[] = [];
  if (depth < MAX_TREE_DEPTH) {
    for (const c of arr(get(o, "children"))) {
      if (budget.n >= MAX_NODES) break;
      if (isObj(c)) children.push(normaliseNode(c, depth + 1, budget));
    }
  }
  return {
    id: str(get(o, "id")) || uid(),
    text: str(get(o, "text")),
    category: oneOf(get(o, "category"), CATEGORIES, "physical"),
    status: oneOf(get(o, "status"), NODE_STATUSES, "hypothesis"),
    evidenceIds: arr(get(o, "evidenceIds")).filter((x): x is string => typeof x === "string"),
    isRootCause: bool(get(o, "isRootCause")),
    collapsed: bool(get(o, "collapsed")),
    children,
    // Optional fields stay absent when empty, so old data reads back exactly as it was stored.
    ...(oneOf(get(o, "deterioration"), DETERIORATIONS, "") !== ""
      ? { deterioration: oneOf(get(o, "deterioration"), DETERIORATIONS, "") }
      : {}),
    ...(oneOf(get(o, "area"), CAUSE_AREAS, "") !== "" ? { area: oneOf(get(o, "area"), CAUSE_AREAS, "") } : {}),
    ...(bool(get(o, "aiSuggested")) ? { aiSuggested: true } : {}),
    ...(str(get(o, "aiTest")).trim() ? { aiTest: str(get(o, "aiTest")).slice(0, 600) } : {}),
  };
}

function normaliseAction(raw: unknown): ActionItem | null {
  if (!isObj(raw)) return null;
  return {
    id: str(get(raw, "id")) || uid(),
    causeId: str(get(raw, "causeId")),
    description: str(get(raw, "description")),
    owner: str(get(raw, "owner")),
    dueDate: str(get(raw, "dueDate")),
    status: oneOf(get(raw, "status"), ACTION_STATUSES, "open"),
    cost: num(get(raw, "cost")),
    ...(oneOf(get(raw, "kind"), KINDS, "") !== "" ? { kind: oneOf(get(raw, "kind"), KINDS, "") } : {}),
    ...(oneOf(get(raw, "category"), ACTION_CATEGORIES_ALL, "") !== ""
      ? { category: oneOf(get(raw, "category"), ACTION_CATEGORIES_ALL, "") }
      : {}),
    ...(isObj(get(raw, "task")) ? { task: normaliseTask(get(raw, "task") as Obj) } : {}),
    ...(bool(get(raw, "aiSuggested")) ? { aiSuggested: true } : {}),
  };
}

function normaliseTask(o: Obj): MaintenanceTask {
  return {
    description: str(get(o, "description")),
    intervalValue: num(get(o, "intervalValue")),
    intervalUnit: oneOf(get(o, "intervalUnit"), INTERVAL_UNITS_ALL, "months"),
    craft: str(get(o, "craft")),
    change: get(o, "change") === "changed" ? "changed" : "new",
  };
}

function normaliseSpares(raw: unknown): SparesCheck | undefined {
  if (!isObj(raw)) return undefined;
  return {
    needed: oneOf(get(raw, "needed"), YES_NO, ""),
    inStock: oneOf(get(raw, "inStock"), YES_NO, ""),
    leadTimeDays: num(get(raw, "leadTimeDays")),
    coverage: str(get(raw, "coverage")),
  };
}

function normaliseRollout(raw: unknown): RolloutCheck | null {
  if (!isObj(raw)) return null;
  return {
    id: str(get(raw, "id")) || uid(),
    assetId: str(get(raw, "assetId")),
    assetTag: str(get(raw, "assetTag")),
    assetLabel: str(get(raw, "assetLabel")),
    what: str(get(raw, "what")),
    owner: str(get(raw, "owner")),
    dueDate: str(get(raw, "dueDate")),
    status: oneOf(get(raw, "status"), ROLLOUT_STATUSES, "open"),
  };
}

/** Tolerant reader for one asset document; null when it is not an object. */
export function normaliseAsset(raw: unknown, rowId?: string): Asset | null {
  if (!isObj(raw)) return null;
  const now = new Date().toISOString();
  const createdAt = str(get(raw, "createdAt")) || now;
  const asset: Asset = {
    id: rowId || str(get(raw, "id")) || uid(),
    tag: str(get(raw, "tag")).trim(),
    type: str(get(raw, "type")).trim(),
    makeModel: str(get(raw, "makeModel")),
    duty: str(get(raw, "duty")),
    criticality: oneOf(get(raw, "criticality"), CRITICALITIES, ""),
    site: str(get(raw, "site")),
    notes: str(get(raw, "notes")),
    createdAt,
    updatedAt: str(get(raw, "updatedAt")) || createdAt,
  };
  if (get(raw, "isSample") === true) asset.isSample = true;
  return asset;
}

function normaliseOtherCost(raw: unknown): OtherCost | null {
  if (!isObj(raw)) return null;
  return {
    id: str(get(raw, "id")) || uid(),
    category: oneOf<OtherCostCategory>(get(raw, "category"), COST_CATEGORIES, "other"),
    description: str(get(raw, "description")),
    amount: num(get(raw, "amount")),
  };
}

function normaliseDrafts(raw: unknown): Investigation["reportDrafts"] | undefined {
  if (!isObj(raw)) return undefined;
  const out: NonNullable<Investigation["reportDrafts"]> = {};
  for (const k of ["report", "summary"] as const) {
    const d = get(raw, k);
    if (!isObj(d)) continue;
    const sections = arr(get(d, "sections"))
      .filter(isObj)
      .slice(0, 20)
      .map((s) => ({ heading: str(get(s, "heading")).slice(0, 200), body: str(get(s, "body")).slice(0, 8000) }));
    if (!sections.length) continue;
    out[k] = { title: str(get(d, "title")).slice(0, 300), sections, savedAt: str(get(d, "savedAt")) };
  }
  return out.report || out.summary ? out : undefined;
}

function normaliseLoss(raw: unknown, base: Loss): Loss {
  const o = isObj(raw) ? raw : {};
  const loss: Loss = {
    eventsPerYear: num(get(o, "eventsPerYear")),
    downtimeHours: num(get(o, "downtimeHours")),
    ratePerHour: num(get(o, "ratePerHour")),
    unitName: str(get(o, "unitName"), base.unitName),
    marginPerUnit: num(get(o, "marginPerUnit")),
    repairCost: num(get(o, "repairCost")),
    currency: str(get(o, "currency"), base.currency),
  };
  // Optional fields stay absent when absent: readers treat "missing" specially.
  for (const k of ["shareLost", "shareMadeUp", "shareBuffer"] as const) {
    const v = num(get(o, k));
    if (v !== null) loss[k] = v;
  }
  if (get(o, "notKnown") === true) loss.notKnown = true;
  for (const k of ["recoveryCost", "bufferHoldingCostPerYear", "annualEstimate"] as const) {
    const v = num(get(o, k));
    if (v !== null) loss[k] = v;
  }
  const note = get(o, "recoveryNote");
  if (typeof note === "string") loss.recoveryNote = note;
  if (Array.isArray(get(o, "otherCosts"))) {
    loss.otherCosts = arr(get(o, "otherCosts"))
      .map(normaliseOtherCost)
      .filter((x): x is OtherCost => x !== null);
  }
  return loss;
}

/**
 * Turns stored data into a complete Investigation, or null when it is not an
 * investigation (not an object, or neither a `problem` nor a `tree` object).
 * `rowId` is the database id and always wins over any id inside the data.
 */
export function normaliseInvestigation(raw: unknown, rowId?: string): Investigation | null {
  if (!isObj(raw)) return null;
  if (!isObj(get(raw, "problem")) && !isObj(get(raw, "tree"))) return null;
  const base = blankInvestigation();
  const p = isObj(get(raw, "problem")) ? (get(raw, "problem") as Obj) : {};
  const v = isObj(get(raw, "verification")) ? (get(raw, "verification") as Obj) : {};
  const createdAt = str(get(raw, "createdAt")) || base.createdAt;
  return {
    id: rowId || str(get(raw, "id")) || base.id,
    schemaVersion: 1,
    createdAt,
    updatedAt: str(get(raw, "updatedAt")) || createdAt,
    isSample: bool(get(raw, "isSample")),
    problem: {
      title: str(get(p, "title")),
      asset: str(get(p, "asset")),
      site: str(get(p, "site")),
      eventDate: str(get(p, "eventDate")),
      whatHappened: str(get(p, "whatHappened")),
      where: str(get(p, "where")),
      when: str(get(p, "when")),
      impact: str(get(p, "impact")),
      assetTag: str(get(p, "assetTag")),
      assetType: str(get(p, "assetType")),
      makeModel: str(get(p, "makeModel")),
      duty: str(get(p, "duty")),
      criticality: oneOf(get(p, "criticality"), CRITICALITIES, ""),
      failureMode: str(get(p, "failureMode")),
      // Optional: absent for equipment failures and old investigations.
      ...(get(p, "failureType") === "process" ? { failureType: "process" as const } : {}),
      ...(["line", "product", "packType", "processStep"] as const).reduce(
        (acc, k) => (str(get(p, k)).trim() ? { ...acc, [k]: str(get(p, k)).slice(0, 200) } : acc),
        {} as Partial<Pick<Problem, "line" | "product" | "packType" | "processStep">>,
      ),
      ...(str(get(p, "qualityRef")).trim() ? { qualityRef: str(get(p, "qualityRef")).slice(0, 80) } : {}),
    },
    loss: normaliseLoss(get(raw, "loss"), base.loss),
    evidence: arr(get(raw, "evidence"))
      .map(normaliseEvidence)
      .filter((x): x is EvidenceItem => x !== null),
    tree: normaliseNode(get(raw, "tree"), 0, { n: 0 }),
    actions: arr(get(raw, "actions"))
      .map(normaliseAction)
      .filter((x): x is ActionItem => x !== null),
    verification: {
      reviewDate: str(get(v, "reviewDate")),
      recurred: oneOf(get(v, "recurred"), RECURRENCES, "unreviewed"),
      eventsPerYearAfter: num(get(v, "eventsPerYearAfter")),
      notes: str(get(v, "notes")),
    },
    ...(normaliseSpares(get(raw, "spares")) ? { spares: normaliseSpares(get(raw, "spares")) } : {}),
    ...(normaliseDrafts(get(raw, "reportDrafts")) ? { reportDrafts: normaliseDrafts(get(raw, "reportDrafts")) } : {}),
    rollouts: arr(get(raw, "rollouts"))
      .slice(0, 500)
      .map(normaliseRollout)
      .filter((x): x is RolloutCheck => x !== null),
  };
}

/** Result of reading one stored row. */
export type ReadRow = { ok: true; inv: Investigation } | { ok: false; id: string };

export function readRow(id: string, data: unknown): ReadRow {
  const inv = normaliseInvestigation(data, id);
  return inv ? { ok: true, inv } : { ok: false, id };
}

/** Drops every evidence image that is not an allowed data URL. Used on save. */
export function sanitiseForSave<T extends Pick<Investigation, "evidence">>(inv: T): T {
  if (!Array.isArray(inv.evidence)) return inv;
  let changed = false;
  const evidence = inv.evidence.map((e) => {
    if (e && e.image !== null && e.image !== undefined && !isSafeImage(e.image)) {
      changed = true;
      return { ...e, image: null };
    }
    return e;
  });
  return changed ? { ...inv, evidence } : inv;
}
