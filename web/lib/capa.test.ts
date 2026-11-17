import { describe, expect, it } from "vitest";
import {
  blankSpares,
  blankTask,
  criticalSpareFlag,
  formatInterval,
  groupByRootCause,
  hasSparesAction,
  maintenancePlan,
  planAsText,
  sparesHoldingAction,
} from "./capa";
import { action, inv, withCause } from "./testing";

describe("formatInterval", () => {
  it("writes plain intervals", () => {
    expect(formatInterval(3, "months")).toBe("every 3 months");
    expect(formatInterval(1, "weeks")).toBe("every week");
    expect(formatInterval(500, "hours_run")).toBe("every 500 hours run");
    expect(formatInterval(1, "hours_run")).toBe("every hour run");
    expect(formatInterval(2.5, "days")).toBe("every 2.5 days");
  });
  it("is empty when there is no usable number", () => {
    expect(formatInterval(null, "days")).toBe("");
    expect(formatInterval(0, "days")).toBe("");
    expect(formatInterval(-2, "days")).toBe("");
    expect(formatInterval(NaN, "days")).toBe("");
  });
});

function sample() {
  let i = inv("1", { title: "Seal failures", assetTag: "P-101", asset: "Slurry pump" });
  i = withCause(i, null, { id: "r1", text: "No flush check", isRootCause: true, category: "system" });
  i = withCause(i, null, { id: "r2", text: "No alignment standard", isRootCause: true, category: "system" });
  i = {
    ...i,
    actions: [
      action({ id: "a1", causeId: "r1", kind: "corrective", category: "repair", description: "Clear strainer" }),
      action({
        id: "a2",
        causeId: "r1",
        kind: "preventive",
        category: "maintenance_task",
        description: "Weekly flush check",
        owner: "Pat",
        dueDate: "2026-02-01",
        task: { description: "Check flush flow", intervalValue: 1, intervalUnit: "weeks", craft: "Fitter", change: "new" },
      }),
      action({
        id: "a3",
        causeId: "r2",
        kind: "preventive",
        category: "condition_monitoring",
        description: "Vibration route",
        task: { description: "Take vibration reading", intervalValue: 3, intervalUnit: "months", craft: "CM tech", change: "changed" },
      }),
      action({ id: "a4", causeId: "r2", description: "old style action, no kind" }),
      action({ id: "a5", causeId: "gone", kind: "preventive", category: "training" }),
    ],
  };
  return i;
}

describe("groupByRootCause", () => {
  it("groups corrective and preventive per root cause, with legacy and orphan actions apart", () => {
    const { groups, unlinked } = groupByRootCause(sample());
    expect(groups.map((g) => g.root.id)).toEqual(["r1", "r2"]);
    expect(groups[0].corrective.map((a) => a.id)).toEqual(["a1"]);
    expect(groups[0].preventive.map((a) => a.id)).toEqual(["a2"]);
    expect(groups[1].preventive.map((a) => a.id)).toEqual(["a3"]);
    expect(groups[1].unclassified.map((a) => a.id)).toEqual(["a4"]);
    expect(unlinked.map((a) => a.id)).toEqual(["a5"]);
  });
});

describe("maintenancePlan", () => {
  it("lists only maintenance-task and condition-monitoring actions, planner ready", () => {
    const plan = maintenancePlan(sample());
    expect(plan.map((l) => l.actionId)).toEqual(["a2", "a3"]);
    expect(plan[0]).toMatchObject({
      assetTag: "P-101",
      category: "Maintenance task",
      task: "Check flush flow",
      interval: "every week",
      craft: "Fitter",
      change: "New task",
      rootCause: "No flush check",
      owner: "Pat",
    });
    expect(plan[1]).toMatchObject({ category: "Condition monitoring", interval: "every 3 months", change: "Change to existing task" });
  });

  it("falls back to the action text and shows a missing interval as empty", () => {
    const i = inv("2", {}, { actions: [action({ id: "x", category: "maintenance_task", description: "Grease it" })] });
    const [l] = maintenancePlan(i);
    expect(l.task).toBe("Grease it");
    expect(l.interval).toBe("");
    expect(l.change).toBe("New task");
  });

  it("is empty for an investigation with no such actions (old data)", () => {
    expect(maintenancePlan(inv("3", {}, { actions: [action({ id: "z" })] }))).toEqual([]);
  });

  it("writes tab-separated text a planner can paste", () => {
    const i = sample();
    const text = planAsText(maintenancePlan(i), i);
    const rows = text.split("\n");
    expect(rows[0]).toContain("P-101");
    const header = rows.find((r) => r.startsWith("Asset tag"))!;
    expect(header.split("\t")).toHaveLength(10);
    const body = rows.filter((r) => r.startsWith("P-101\t"));
    expect(body).toHaveLength(2);
    expect(body[0]).toContain("every week");
    expect(body[0].split("\t")).toHaveLength(10);
  });

  it("keeps tabs and line breaks out of cells", () => {
    const i = inv("4", { assetTag: "A" }, {
      actions: [action({ id: "q", category: "maintenance_task", task: { ...blankTask(), description: "a\tb\nc", intervalValue: 1 } })],
    });
    const body = planAsText(maintenancePlan(i), i).split("\n").filter((r) => r.startsWith("A\t"));
    expect(body).toHaveLength(1);
    expect(body[0].split("\t")).toHaveLength(10);
  });
});

describe("spares flag", () => {
  const s = (p: Partial<ReturnType<typeof blankSpares>>) => ({ ...blankSpares(), ...p });
  it("fires only when needed, not in stock and lead time is 14 days or more", () => {
    expect(criticalSpareFlag(s({ needed: "yes", inStock: "no", leadTimeDays: 14 }))).toBe(true);
    expect(criticalSpareFlag(s({ needed: "yes", inStock: "no", leadTimeDays: 30 }))).toBe(true);
    expect(criticalSpareFlag(s({ needed: "yes", inStock: "no", leadTimeDays: 13 }))).toBe(false);
    expect(criticalSpareFlag(s({ needed: "yes", inStock: "yes", leadTimeDays: 60 }))).toBe(false);
    expect(criticalSpareFlag(s({ needed: "no", inStock: "no", leadTimeDays: 60 }))).toBe(false);
    expect(criticalSpareFlag(s({ needed: "yes", inStock: "", leadTimeDays: 60 }))).toBe(false);
    expect(criticalSpareFlag(s({ needed: "yes", inStock: "no", leadTimeDays: null }))).toBe(false);
    expect(criticalSpareFlag(undefined)).toBe(false);
  });
  it("builds a ready-to-edit preventive spares holding action on the first root cause", () => {
    let i = inv("5", { assetTag: "P-101" }, { spares: s({ needed: "yes", inStock: "no", leadTimeDays: 21 }) });
    i = withCause(i, null, { id: "rc", text: "x", isRootCause: true });
    const a = sparesHoldingAction(i, "new");
    expect(a).toMatchObject({ id: "new", causeId: "rc", kind: "preventive", category: "spares", status: "open" });
    expect(a.description).toContain("P-101");
    expect(a.description).toContain("21 days");
    expect(hasSparesAction([a])).toBe(true);
    expect(hasSparesAction([])).toBe(false);
  });
});
