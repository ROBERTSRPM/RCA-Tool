import type { Investigation, StepId } from "./types";
import { isLossQuantified } from "./finance";
import { rootCauses } from "./tree";

export interface StepDef {
  id: StepId;
  label: string;
  hint: string;
}

export const STEPS: StepDef[] = [
  { id: "problem", label: "Problem", hint: "Describe what went wrong" },
  { id: "loss", label: "Loss", hint: "Put a money value on it" },
  { id: "evidence", label: "Evidence", hint: "Collect the facts" },
  { id: "cause", label: "Cause tree", hint: "Ask why, repeatedly" },
  { id: "actions", label: "Actions", hint: "Assign and track fixes" },
  { id: "verify", label: "Verify", hint: "Prove it stopped" },
  { id: "report", label: "Report", hint: "Print or save as PDF" },
];

/** Light-weight completeness marker shown on the stepper. */
export function isStepComplete(id: StepId, inv: Investigation): boolean {
  switch (id) {
    case "problem":
      return (
        !!inv.problem.title.trim() &&
        !!inv.problem.asset.trim() &&
        !!inv.problem.whatHappened.trim()
      );
    case "loss":
      return isLossQuantified(inv.loss);
    case "evidence":
      return inv.evidence.length > 0;
    case "cause":
      return rootCauses(inv.tree).length > 0;
    case "actions":
      return (
        inv.actions.length > 0 && inv.actions.every((a) => a.status === "done")
      );
    case "verify":
      return inv.verification.recurred === "no" && !!inv.verification.reviewDate;
    case "report":
      return false;
  }
}
