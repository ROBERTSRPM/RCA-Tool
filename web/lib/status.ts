import { todayISO } from "./dates";
import type { ActionItem, Investigation, InvestigationStatus } from "./types";
import { isVerifiedClosed, verifiedHoursBack, verifiedSaving, verifiedSavingSplit } from "./finance";

export const STATUS_LABELS: Record<InvestigationStatus, string> = {
  draft: "Draft",
  investigating: "Investigating",
  actions: "Actions in progress",
  verifying: "Verifying",
  closed: "Closed",
};

export const STATUS_DESCRIPTIONS: Record<InvestigationStatus, string> = {
  draft: "No causes added yet.",
  investigating: "Causes are being explored; no actions yet.",
  actions: "Actions are being carried out.",
  verifying: "All actions done; waiting to confirm the failure has stopped.",
  closed: "Reviewed: the failure has not come back.",
};

export function isOpenAction(a: ActionItem): boolean {
  return a.status !== "done";
}

export function isOverdue(a: ActionItem, today: string = todayISO()): boolean {
  return isOpenAction(a) && a.dueDate !== "" && a.dueDate < today;
}

/** Status is derived from the work recorded, so it can never go stale. */
export function deriveStatus(inv: Investigation): InvestigationStatus {
  const { actions, verification, tree } = inv;
  if (verification.recurred === "yes") return "investigating";
  if (actions.length > 0 && actions.every((a) => a.status === "done")) {
    return isVerifiedClosed(inv) ? "closed" : "verifying";
  }
  if (actions.length > 0) return "actions";
  return tree.children.length === 0 ? "draft" : "investigating";
}

export interface InvestigationSummary {
  status: InvestigationStatus;
  openActions: number;
  overdueActions: number;
  verifiedSaving: number;
  verifiedCash: number;
  verifiedOpportunity: number;
  /** hours of line time back per year (verified closed only) */
  verifiedHours: number;
}

export function summarise(
  inv: Investigation,
  today: string = todayISO(),
): InvestigationSummary {
  return {
    status: deriveStatus(inv),
    openActions: inv.actions.filter(isOpenAction).length,
    overdueActions: inv.actions.filter((a) => isOverdue(a, today)).length,
    verifiedSaving: verifiedSaving(inv),
    verifiedCash: verifiedSavingSplit(inv).cash,
    verifiedOpportunity: verifiedSavingSplit(inv).opportunity,
    verifiedHours: verifiedHoursBack(inv),
  };
}
