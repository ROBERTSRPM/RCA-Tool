/**
 * CAPA (corrective and preventive action) logic: grouping actions by root
 * cause, the maintenance plan summary a planner can load into a maintenance
 * system, the spares-check flag, and small helpers for the task fields.
 */
import { formatDate } from "./dates";
import { categoryLabel } from "./options";
import { rootCauses } from "./tree";
import type {
  ActionCategory,
  ActionItem,
  CauseNode,
  IntervalUnit,
  Investigation,
  MaintenanceTask,
  SparesCheck,
} from "./types";

export const TASK_CATEGORIES: ActionCategory[] = ["maintenance_task", "condition_monitoring"];

export function isTaskCategory(c: ActionCategory | undefined): boolean {
  return c === "maintenance_task" || c === "condition_monitoring";
}

export function blankTask(): MaintenanceTask {
  return { description: "", intervalValue: null, intervalUnit: "months", craft: "", change: "new" };
}

/* ---------- Grouping by root cause ---------- */

export interface RootGroup {
  root: CauseNode;
  corrective: ActionItem[];
  preventive: ActionItem[];
  /** Actions with no kind chosen yet (older investigations). */
  unclassified: ActionItem[];
}

export function groupByRootCause(inv: Pick<Investigation, "tree" | "actions">): {
  groups: RootGroup[];
  /** Actions not linked to a current root cause. */
  unlinked: ActionItem[];
} {
  const roots = rootCauses(inv.tree);
  const rootIds = new Set(roots.map((r) => r.id));
  const groups = roots.map<RootGroup>((root) => {
    const mine = inv.actions.filter((a) => a.causeId === root.id);
    return {
      root,
      corrective: mine.filter((a) => a.kind === "corrective"),
      preventive: mine.filter((a) => a.kind === "preventive"),
      unclassified: mine.filter((a) => a.kind !== "corrective" && a.kind !== "preventive"),
    };
  });
  return { groups, unlinked: inv.actions.filter((a) => !rootIds.has(a.causeId)) };
}

export interface ActionLayout {
  /** Every corrective action, whatever it is linked to. */
  corrective: ActionItem[];
  /** One entry per root cause: its preventive actions, then any not yet classified. */
  groups: { root: CauseNode; actions: ActionItem[] }[];
  /** Non-corrective actions not linked to a current root cause. */
  unlinked: ActionItem[];
}

/**
 * How the Actions step lays actions out: corrective ones in one list (they
 * answer to the failure event), the rest grouped by the root cause they prevent.
 */
export function layoutActions(inv: Pick<Investigation, "tree" | "actions">): ActionLayout {
  const roots = rootCauses(inv.tree);
  const rootIds = new Set(roots.map((r) => r.id));
  const rest = inv.actions.filter((a) => a.kind !== "corrective");
  return {
    corrective: inv.actions.filter((a) => a.kind === "corrective"),
    groups: roots.map((root) => ({
      root,
      actions: rest
        .filter((a) => a.causeId === root.id)
        .sort((a, b) => Number(b.kind === "preventive") - Number(a.kind === "preventive")),
    })),
    unlinked: rest.filter((a) => !rootIds.has(a.causeId)),
  };
}

/* ---------- Maintenance plan changes ---------- */

const UNIT_WORD: Record<IntervalUnit, [string, string]> = {
  hours_run: ["hour run", "hours run"],
  days: ["day", "days"],
  weeks: ["week", "weeks"],
  months: ["month", "months"],
};

/** "every 3 months", "every week", "every 500 hours run"; "" when no interval is set. */
export function formatInterval(value: number | null | undefined, unit: IntervalUnit): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) return "";
  const [one, many] = UNIT_WORD[unit] ?? UNIT_WORD.months;
  if (value === 1) return `every ${one}`;
  return `every ${Number.isInteger(value) ? value : Math.round(value * 100) / 100} ${many}`;
}

export interface PlanLine {
  actionId: string;
  assetTag: string;
  /** "Maintenance task" or "Condition monitoring". */
  category: string;
  /** What to do. Falls back to the action description when the task text is empty. */
  task: string;
  interval: string;
  craft: string;
  change: "New task" | "Change to existing task";
  /** The root cause it prevents. */
  rootCause: string;
  owner: string;
  dueDate: string;
  status: string;
}

const STATUS_WORD = { open: "Open", in_progress: "In progress", done: "Done" } as const;

/** Every new or changed maintenance task and condition monitoring task, in action order. */
export function maintenancePlan(inv: Pick<Investigation, "problem" | "tree" | "actions">): PlanLine[] {
  const roots = new Map(rootCauses(inv.tree).map((r) => [r.id, r.text.trim()]));
  const out: PlanLine[] = [];
  for (const a of inv.actions) {
    if (!isTaskCategory(a.category)) continue;
    const t = a.task ?? blankTask();
    out.push({
      actionId: a.id,
      assetTag: (inv.problem.assetTag ?? "").trim(),
      category: categoryLabel(a.category),
      task: t.description.trim() || a.description.trim(),
      interval: formatInterval(t.intervalValue, t.intervalUnit),
      craft: t.craft.trim(),
      change: t.change === "changed" ? "Change to existing task" : "New task",
      rootCause: roots.get(a.causeId) ?? "",
      owner: a.owner.trim(),
      dueDate: a.dueDate,
      status: STATUS_WORD[a.status] ?? "Open",
    });
  }
  return out;
}

/**
 * Plain text for a planner: tab separated, one task per line, with a header row,
 * so it pastes straight into a spreadsheet or a maintenance system import.
 */
export function planAsText(lines: PlanLine[], inv: Pick<Investigation, "problem">): string {
  const p = inv.problem;
  const head = [
    `Maintenance plan changes: ${[p.assetTag, p.asset].map((s) => (s ?? "").trim()).filter(Boolean).join(" ") || p.title.trim() || "asset"}`,
    `Source: root cause analysis "${p.title.trim() || "Untitled"}"`,
  ];
  const cols = ["Asset tag", "New or changed", "Type", "Task", "Interval", "Craft", "Prevents", "Owner", "Due", "Status"];
  const rows = lines.map((l) =>
    [
      l.assetTag,
      l.change,
      l.category,
      l.task,
      l.interval || "Interval not set",
      l.craft || "Craft not set",
      l.rootCause,
      l.owner,
      l.dueDate ? formatDate(l.dueDate) : "",
      l.status,
    ].map((c) => c.replace(/[\t\r\n]+/g, " ")),
  );
  return [...head, "", cols.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");
}

/* ---------- Spares check ---------- */

export const LONG_LEAD_DAYS = 14;

export function blankSpares(): SparesCheck {
  return { needed: "", inStock: "", leadTimeDays: null, coverage: "" };
}

/**
 * The derived flag: a spare was needed, it was not in stock, and the supplier
 * lead time is 14 days or more.
 */
export function criticalSpareFlag(s: SparesCheck | undefined): boolean {
  if (!s) return false;
  return (
    s.needed === "yes" &&
    s.inStock === "no" &&
    s.leadTimeDays !== null &&
    Number.isFinite(s.leadTimeDays) &&
    s.leadTimeDays >= LONG_LEAD_DAYS
  );
}

export const SPARES_FLAG_TEXT = "Critical spare with long lead time and no stock";

export function hasSparesAction(actions: ActionItem[]): boolean {
  return actions.some((a) => a.category === "spares");
}

/** A ready-to-edit spares holding action, preventive, for the first root cause if there is one. */
export function sparesHoldingAction(
  inv: Pick<Investigation, "tree" | "spares" | "problem">,
  id: string,
): ActionItem {
  const roots = rootCauses(inv.tree);
  const days = inv.spares?.leadTimeDays;
  const asset = [inv.problem.assetTag, inv.problem.asset].map((s) => (s ?? "").trim()).find(Boolean) ?? "this asset";
  return {
    id,
    causeId: roots[0]?.id ?? "",
    description: `Hold a spare in stores for ${asset}${days ? ` (supplier lead time ${days} days)` : ""}. Set a minimum stock level and re-order point.`,
    owner: "",
    dueDate: "",
    status: "open",
    cost: null,
    kind: "preventive",
    category: "spares",
  };
}
