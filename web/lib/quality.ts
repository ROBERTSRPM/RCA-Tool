import { missingLossInputs } from "./finance";
import { isOverdue } from "./status";
import { CATEGORY_LABEL, flatten, rootCauses } from "./tree";
import { todayISO } from "./dates";
import type { Investigation, StepId } from "./types";

export type Severity = "high" | "medium" | "low";

export interface Finding {
  /** stable id, useful as a React key and for future AI de-duplication */
  id: string;
  rule: string;
  severity: Severity;
  message: string;
  /** workspace step that fixes this */
  step: StepId;
  /** optional cause node to select when jumping */
  nodeId?: string;
}

const PROBLEM_FIELDS: { key: keyof Investigation["problem"]; label: string }[] = [
  { key: "title", label: "title" },
  { key: "asset", label: "asset" },
  { key: "site", label: "site or area" },
  { key: "eventDate", label: "date of event" },
  { key: "whatHappened", label: "what happened" },
  { key: "where", label: "where" },
  { key: "when", label: "when" },
  { key: "impact", label: "impact" },
];

const clip = (s: string, n = 60) =>
  s.trim().length > n ? s.trim().slice(0, n - 1) + "…" : s.trim() || "(no text yet)";

/**
 * Rule-based quality check. Pure: the same investigation and date always give
 * the same findings. `today` is injectable (YYYY-MM-DD) for testing.
 */
export function runQualityCheck(
  inv: Investigation,
  today: string = todayISO(),
): Finding[] {
  const out: Finding[] = [];

  // 1. Problem statement
  const missingProblem = PROBLEM_FIELDS.filter(
    (f) => !inv.problem[f.key].trim(),
  ).map((f) => f.label);
  if (missingProblem.length) {
    out.push({
      id: "problem-missing",
      rule: "problem-missing-fields",
      severity: "medium",
      message: `Problem statement is missing: ${missingProblem.join(", ")}.`,
      step: "problem",
    });
  }

  // 2. Loss
  const missingLoss = missingLossInputs(inv.loss);
  if (missingLoss.length) {
    out.push({
      id: "loss-missing",
      rule: "loss-not-quantified",
      severity: "high",
      message: `The loss is not quantified yet. Still needed: ${missingLoss.join(", ")}.`,
      step: "loss",
    });
  }

  const nodes = flatten(inv.tree).filter((f) => f.parent !== null);

  // 3. Verified causes with no evidence
  for (const { node } of nodes) {
    if (node.status === "verified" && node.evidenceIds.length === 0) {
      out.push({
        id: `verified-no-evidence-${node.id}`,
        rule: "verified-without-evidence",
        severity: "high",
        message: `"${clip(node.text)}" is marked Verified but has no evidence linked.`,
        step: "cause",
        nodeId: node.id,
      });
    }
  }

  // 4. Branches ending on a Physical or Human cause with nothing deeper
  for (const { node } of nodes) {
    if (
      node.children.length === 0 &&
      node.status !== "ruled_out" &&
      node.category !== "system"
    ) {
      out.push({
        id: `no-latent-${node.id}`,
        rule: "branch-without-system-cause",
        severity: "medium",
        message: `This branch stops at a ${CATEGORY_LABEL[node.category]} cause: "${clip(node.text)}". Ask "why?" again to find the System / Latent cause beneath.`,
        step: "cause",
        nodeId: node.id,
      });
    }
  }

  // 5. Root cause flagged?
  const roots = rootCauses(inv.tree);
  if (roots.length === 0) {
    out.push({
      id: "no-root-cause",
      rule: "no-root-cause",
      severity: "high",
      message:
        inv.tree.children.length === 0
          ? "No causes have been added yet. Ask \"Why?\" under the failure event to start."
          : "No cause is flagged as a root cause yet.",
      step: "cause",
    });
  }

  // 6. Root causes with no action
  for (const rc of roots) {
    if (!inv.actions.some((a) => a.causeId === rc.id)) {
      out.push({
        id: `root-no-action-${rc.id}`,
        rule: "root-cause-without-action",
        severity: "high",
        message: `Root cause "${clip(rc.text)}" has no action to fix it.`,
        step: "actions",
        nodeId: rc.id,
      });
    }
  }

  // 7. Actions with no owner or due date
  for (const a of inv.actions) {
    const missing: string[] = [];
    if (!a.owner.trim()) missing.push("an owner");
    if (!a.dueDate) missing.push("a due date");
    if (missing.length) {
      out.push({
        id: `action-incomplete-${a.id}`,
        rule: "action-missing-owner-or-date",
        severity: "medium",
        message: `Action "${clip(a.description)}" needs ${missing.join(" and ")}.`,
        step: "actions",
      });
    }
  }

  // 8. Overdue actions
  for (const a of inv.actions) {
    if (isOverdue(a, today)) {
      out.push({
        id: `action-overdue-${a.id}`,
        rule: "action-overdue",
        severity: "high",
        message: `Action "${clip(a.description)}" is overdue (was due ${a.dueDate}).`,
        step: "actions",
      });
    }
  }

  // 9. All done but not verified
  if (
    inv.actions.length > 0 &&
    inv.actions.every((a) => a.status === "done") &&
    inv.verification.recurred === "unreviewed"
  ) {
    out.push({
      id: "verify-missing",
      rule: "done-without-verification",
      severity: "medium",
      message:
        "All actions are done but nobody has checked whether the failure stopped. Record a review.",
      step: "verify",
    });
  }

  // Extra: recurrence means the analysis is incomplete
  if (inv.verification.recurred === "yes") {
    out.push({
      id: "recurred",
      rule: "failure-recurred",
      severity: "high",
      message:
        "The failure came back after the actions. Reopen the cause tree and look for what was missed.",
      step: "cause",
    });
  }

  const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}
