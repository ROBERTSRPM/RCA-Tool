/**
 * Core domain types. This is the single source of truth for the shape of an
 * investigation. The same shapes are intended to map onto database tables in
 * the next phase (investigation -> evidence / cause_nodes / actions).
 */

export type Category = "physical" | "human" | "system";
export type NodeStatus = "hypothesis" | "verified" | "ruled_out";
export type EvidenceType =
  | "photo"
  | "data"
  | "document"
  | "interview"
  | "inspection"
  | "other";
export type ActionStatus = "open" | "in_progress" | "done";
export type Recurrence = "unreviewed" | "no" | "yes";
export type InvestigationStatus =
  | "draft"
  | "investigating"
  | "actions"
  | "verifying"
  | "closed";

export type StepId =
  | "problem"
  | "loss"
  | "evidence"
  | "cause"
  | "actions"
  | "verify"
  | "report";

export type Criticality = "" | "A" | "B" | "C";

export interface Problem {
  title: string;
  asset: string;
  site: string;
  eventDate: string; // YYYY-MM-DD or ""
  whatHappened: string;
  where: string;
  when: string;
  impact: string;
  /*
   * Asset details, added later. Old investigations do not have them: every
   * reader treats "missing" as empty (use the helpers in lib/asset-info.ts).
   */
  /** Tag number, e.g. "P-101". Matches the asset register (case-insensitive, trimmed). */
  assetTag?: string;
  /** A label from ASSET_TYPES, or free text typed under "Other". */
  assetType?: string;
  makeModel?: string;
  /** Duty or service, free text, e.g. "tailings transfer". */
  duty?: string;
  criticality?: Criticality;
  /** A label from FAILURE_MODES, or free text. */
  failureMode?: string;
}

export type OtherCostCategory =
  | "parts"
  | "labour"
  | "contractors"
  | "scrap"
  | "penalties"
  | "secondary"
  | "safety"
  | "other";

export const OTHER_COST_CATEGORIES: { value: OtherCostCategory; label: string }[] = [
  { value: "parts", label: "Repair parts" },
  { value: "labour", label: "Repair labour and call-out" },
  { value: "contractors", label: "Contractors and hire" },
  { value: "scrap", label: "Scrap and restart waste" },
  { value: "penalties", label: "Customer penalties" },
  { value: "secondary", label: "Secondary damage" },
  { value: "safety", label: "Safety and environment" },
  { value: "other", label: "Other" },
];

export interface OtherCost {
  id: string;
  category: OtherCostCategory;
  description: string;
  amount: number | null;
}

export interface SavedDraft {
  title: string;
  sections: { heading: string; body: string }[];
  savedAt: string;
}

export interface Loss {
  eventsPerYear: number | null;
  downtimeHours: number | null;
  ratePerHour: number | null;
  unitName: string;
  marginPerUnit: number | null;
  /** Simple default cash cost per event (parts, labour, contractors). */
  repairCost: number | null;
  currency: string;
  /** The user chose "Not known yet": no figures are used or shown until they add some. */
  notKnown?: boolean;
  /** A single rough yearly cost, used when no detailed figures give an annual cost. */
  annualEstimate?: number | null;
  /*
   * Fields below were added later. Old investigations do not have them, so
   * every reader must treat "missing" as: 100% lost for good, no extra costs.
   */
  /** % of the lost production that was never made up (costed as margin). */
  shareLost?: number;
  /** % of the lost production that was made up later (costed as recovery). */
  shareMadeUp?: number;
  /** % of the lost production covered by buffer stock (no cost per event). */
  shareBuffer?: number;
  /** Cash cost per event of making the production up later. */
  recoveryCost?: number | null;
  recoveryNote?: string;
  /** Optional yearly cost of holding the buffer stock, attributed to this failure. */
  bufferHoldingCostPerYear?: number | null;
  /** Extra cash costs per event, on top of the simple repair cost. */
  otherCosts?: OtherCost[];
}

export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  title: string;
  note: string;
  date: string; // YYYY-MM-DD or ""
  image: string | null; // downscaled JPEG data URL
}

/** Natural: normal wear in service. Forced: wear we caused. "" = not decided. */
export type Deterioration = "" | "natural" | "forced";

export interface CauseNode {
  id: string;
  text: string;
  category: Category;
  status: NodeStatus;
  evidenceIds: string[];
  isRootCause: boolean;
  collapsed: boolean;
  children: CauseNode[];
  /** Optional, added later; missing means not decided. */
  deterioration?: Deterioration;
  /** True when the text came from an AI suggestion the user accepted. Still an ordinary editable cause. */
  aiSuggested?: boolean;
  /** For AI-suggested causes: the evidence that would confirm or rule the cause out. */
  aiTest?: string;
}

/** Corrective: fix this failure and its damage. Preventive: stop it happening again. */
export type ActionKind = "" | "corrective" | "preventive";

export type ActionCategory =
  | ""
  | "repair"
  | "design"
  | "maintenance_task"
  | "condition_monitoring"
  | "spares"
  | "procedure"
  | "training"
  | "operating_practice";

export type IntervalUnit = "hours_run" | "days" | "weeks" | "months";

/** Planner-ready detail for the Maintenance task and Condition monitoring categories. */
export interface MaintenanceTask {
  description: string;
  intervalValue: number | null;
  intervalUnit: IntervalUnit;
  /** Craft or trade, e.g. "Mechanical fitter". */
  craft: string;
  /** A new task, or a change to a task that already exists in the plan. */
  change: "new" | "changed";
}

export interface ActionItem {
  id: string;
  causeId: string; // id of a root cause node, or "" when not linked
  description: string;
  owner: string;
  dueDate: string; // YYYY-MM-DD or ""
  status: ActionStatus;
  cost: number | null;
  /** Added later; missing means not classified. */
  kind?: ActionKind;
  category?: ActionCategory;
  task?: MaintenanceTask;
  /** True when the action came from an AI suggestion the user accepted. Still an ordinary editable action. */
  aiSuggested?: boolean;
}

export type YesNoUnknown = "" | "yes" | "no";

/** Was the right spare available when it failed? Optional on old investigations. */
export interface SparesCheck {
  needed: YesNoUnknown;
  inStock: YesNoUnknown;
  leadTimeDays: number | null;
  /** How the gap was covered (borrowed, cannibalised, expedited, ...). */
  coverage: string;
}

export type RolloutStatus = "open" | "no_issue" | "same_problem" | "fixed";

/** A tracked check that the same failure cannot happen on a similar asset. */
export interface RolloutCheck {
  id: string;
  assetId: string;
  /** Copied from the register when created, so it still reads right if the asset is later deleted. */
  assetTag: string;
  assetLabel: string;
  what: string;
  owner: string;
  dueDate: string;
  status: RolloutStatus;
}

/** An entry in the asset register. Stored as one jsonb document per asset. */
export interface Asset {
  id: string;
  tag: string;
  type: string;
  makeModel: string;
  duty: string;
  criticality: Criticality;
  site: string;
  notes: string;
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Verification {
  reviewDate: string;
  recurred: Recurrence;
  eventsPerYearAfter: number | null;
  notes: string;
}

export interface Investigation {
  id: string;
  schemaVersion: 1;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  isSample: boolean;
  problem: Problem;
  loss: Loss;
  evidence: EvidenceItem[];
  tree: CauseNode; // the top node is the failure event
  actions: ActionItem[];
  verification: Verification;
  /** Added later; missing means not recorded. */
  spares?: SparesCheck;
  /** Added later; missing means none. */
  rollouts?: RolloutCheck[];
  /** AI write-up drafts the user edited and kept. Missing means none saved. */
  reportDrafts?: Partial<Record<"report" | "summary", SavedDraft>>;
}

export type InvestigationPatch = Partial<
  Omit<Investigation, "id" | "createdAt" | "schemaVersion">
>;
