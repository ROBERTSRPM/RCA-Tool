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

export interface Loss {
  eventsPerYear: number | null;
  downtimeHours: number | null;
  ratePerHour: number | null;
  unitName: string;
  marginPerUnit: number | null;
  repairCost: number | null;
  currency: string;
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
