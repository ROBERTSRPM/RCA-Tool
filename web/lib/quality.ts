import { lossStatus } from "./finance";
import { isOverdue } from "./status";
import { CATEGORY_LABEL, findNode, flatten, pathTo, rootCauses } from "./tree";
import { criticalSpareFlag, hasSparesAction, isTaskCategory, SPARES_FLAG_TEXT } from "./capa";
import { todayISO } from "./dates";
import type { ActionItem, ActionCategory, CauseNode, Investigation, StepId } from "./types";

/** Action categories that address a System / Latent cause. */
const SYSTEMIC_CATEGORIES: ActionCategory[] = ["procedure", "training", "maintenance_task", "design"];

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

const PROBLEM_FIELDS: {
  key: "title" | "asset" | "site" | "eventDate" | "whatHappened" | "where" | "when" | "impact";
  label: string;
}[] = [
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
  // Missing loss is only a gentle reminder: many teams cannot cost a failure on day one.
  if (lossStatus(inv.loss) !== "costed") {
    out.push({
      id: "loss-missing",
      rule: "loss-not-quantified",
      severity: "low",
      message: "Add a rough figure when you can. Managers act on dollars.",
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

  // 6b. Actions whose cause is missing or no longer a root cause
  const rootIds = new Set(roots.map((r) => r.id));
  for (const a of inv.actions) {
    // An empty causeId is a deliberately general action (the sample has some);
    // a causeId that points at nothing, or at a cause that is no longer a root
    // cause, is an action that lost its cause.
    // A corrective action is linked to the failure event itself (the top node).
    if (a.causeId !== "" && a.causeId !== inv.tree.id && !rootIds.has(a.causeId)) {
      out.push({
        id: `action-unlinked-${a.id}`,
        rule: "action-not-linked",
        severity: "medium",
        message: `Action "${clip(a.description)}" is not linked to a root cause (its cause was removed or is no longer flagged as a root cause). Link it to a root cause or delete it.`,
        step: "actions",
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

  // 10. Corrective and preventive balance, per root cause
  for (const rc of roots) {
    const mine = inv.actions.filter((a) => a.causeId === rc.id);
    const hasCorrective = mine.some((a) => a.kind === "corrective");
    const hasPreventive = mine.some((a) => a.kind === "preventive");
    if (hasCorrective && !hasPreventive) {
      out.push({
        id: `root-no-preventive-${rc.id}`,
        rule: "corrective-without-preventive",
        severity: "high",
        message: `Root cause "${clip(rc.text)}" has corrective actions but no preventive action. Fixing the damage will not stop it happening again.`,
        step: "actions",
        nodeId: rc.id,
      });
    }
  }

  // 11. A System / Latent root cause needs a systemic fix. Only judged when the
  // root cause has actions and every one of them has a category (older
  // investigations have none, and are not flagged on a guess).
  for (const rc of roots) {
    if (rc.category !== "system") continue;
    const mine = inv.actions.filter((a) => a.causeId === rc.id);
    if (mine.length === 0 || mine.some((a) => !a.category)) continue;
    if (!mine.some((a) => a.category && SYSTEMIC_CATEGORIES.includes(a.category))) {
      out.push({
        id: `system-root-no-systemic-action-${rc.id}`,
        rule: "system-root-without-systemic-action",
        severity: "medium",
        message: `System / Latent root cause "${clip(rc.text)}" has no procedure, training, maintenance-task or design action. A repair alone will not remove a gap in how the work is managed.`,
        step: "actions",
        nodeId: rc.id,
      });
    }
  }

  // 12. A verified natural-deterioration cause must be managed by inspection or planned work.
  for (const { node } of nodes) {
    if (node.status === "verified" && node.deterioration === "natural") {
      if (!naturalIsManaged(inv, node)) {
        out.push({
          id: `natural-no-task-${node.id}`,
          rule: "natural-deterioration-unmanaged",
          severity: "medium",
          message: `"${clip(node.text)}" is verified as natural deterioration, but there is no maintenance task or condition monitoring action to manage it.`,
          step: "actions",
          nodeId: node.id,
        });
      }
    }
  }

  // 13. Maintenance tasks a planner could not load: no interval or no task text.
  for (const a of inv.actions) {
    if (!isTaskCategory(a.category)) continue;
    const t = a.task;
    const missing: string[] = [];
    if (!(t?.description ?? "").trim()) missing.push("a task description");
    if (!t || t.intervalValue === null || !(t.intervalValue > 0)) missing.push("an interval");
    if (missing.length) {
      out.push({
        id: `task-incomplete-${a.id}`,
        rule: "task-missing-detail",
        severity: "medium",
        message: `Maintenance plan item "${clip(a.description)}" needs ${missing.join(" and ")} before a planner can load it.`,
        step: "actions",
      });
    }
  }

  // 14. Spares gap with nothing done about it.
  if (criticalSpareFlag(inv.spares) && !hasSparesAction(inv.actions)) {
    out.push({
      id: "spares-gap",
      rule: "spares-long-lead-no-stock",
      severity: "medium",
      message: `${SPARES_FLAG_TEXT}: the supplier lead time is ${inv.spares?.leadTimeDays} days and none was in stock. Add a spares holding action.`,
      step: "actions",
    });
  }

  const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

const MANAGING: ActionCategory[] = ["maintenance_task", "condition_monitoring"];

function isManaging(a: ActionItem): boolean {
  return !!a.category && MANAGING.includes(a.category);
}

/**
 * True when a maintenance-task or condition-monitoring action is linked to the
 * cause, to anything beneath it, or to anything above it on the same branch.
 */
export function naturalIsManaged(
  inv: Pick<Investigation, "tree" | "actions">,
  node: CauseNode,
): boolean {
  const branch = new Set<string>([
    ...pathTo(inv.tree, node.id).map((n) => n.id),
    ...flatten(findNode(inv.tree, node.id) ?? node).map((f) => f.node.id),
  ]);
  return inv.actions.some((a) => isManaging(a) && branch.has(a.causeId));
}
