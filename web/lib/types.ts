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

export interface Problem {
  title: string;
  asset: string;
  site: string;
  eventDate: string; // YYYY-MM-DD or ""
  whatHappened: string;
  where: string;
  when: string;
  impact: string;
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

export interface Loss {
  eventsPerYear: number | null;
  downtimeHours: number | null;
  ratePerHour: number | null;
  unitName: string;
  marginPerUnit: number | null;
  /** Simple default cash cost per event (parts, labour, contractors). */
  repairCost: number | null;
  currency: string;
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

export interface CauseNode {
  id: string;
  text: string;
  category: Category;
  status: NodeStatus;
  evidenceIds: string[];
  isRootCause: boolean;
  collapsed: boolean;
  children: CauseNode[];
}

export interface ActionItem {
  id: string;
  causeId: string; // id of a root cause node, or "" when not linked
  description: string;
  owner: string;
  dueDate: string; // YYYY-MM-DD or ""
  status: ActionStatus;
  cost: number | null;
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
}

export type InvestigationPatch = Partial<
  Omit<Investigation, "id" | "createdAt" | "schemaVersion">
>;
