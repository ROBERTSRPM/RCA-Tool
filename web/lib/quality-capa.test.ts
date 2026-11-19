import { describe, expect, it } from "vitest";
import { runQualityCheck, naturalIsManaged } from "./quality";
import { action, inv, withCause } from "./testing";
import { addChild, newNode } from "./tree";
import type { Investigation } from "./types";

const TODAY = "2026-06-01";
const rules = (i: Investigation) => runQualityCheck(i, TODAY).map((f) => f.rule);
const ids = (i: Investigation, rule: string) =>
  runQualityCheck(i, TODAY).filter((f) => f.rule === rule).map((f) => f.nodeId ?? f.id);

function base(cat: "system" | "physical" = "system") {
  return withCause(inv("1"), null, { id: "rc", text: "No standard", isRootCause: true, category: cat, status: "hypothesis" });
}

describe("corrective without preventive", () => {
  it("flags a root cause with corrective actions only", () => {
    const i = { ...base(), actions: [action({ id: "a", causeId: "rc", kind: "corrective", category: "repair" })] };
    expect(ids(i, "corrective-without-preventive")).toEqual(["rc"]);
    expect(runQualityCheck(i, TODAY).find((f) => f.rule === "corrective-without-preventive")?.step).toBe("actions");
  });
  it("is satisfied by a preventive action, and ignores unclassified (old) actions", () => {
    const both = {
      ...base(),
      actions: [
        action({ id: "a", causeId: "rc", kind: "corrective" }),
        action({ id: "b", causeId: "rc", kind: "preventive", category: "procedure" }),
      ],
    };
    expect(rules(both)).not.toContain("corrective-without-preventive");
    const old = { ...base(), actions: [action({ id: "a", causeId: "rc" })] };
    expect(rules(old)).not.toContain("corrective-without-preventive");
  });
  it("judges each root cause on its own", () => {
    let i = base();
    i = withCause(i, null, { id: "rc2", text: "Other", isRootCause: true });
    i = {
      ...i,
      actions: [
        action({ id: "a", causeId: "rc", kind: "corrective" }),
        action({ id: "b", causeId: "rc2", kind: "preventive" }),
      ],
    };
    expect(ids(i, "corrective-without-preventive")).toEqual(["rc"]);
  });
});

describe("system root cause needs a systemic action", () => {
  it("flags a System root whose actions are all categorised and none is systemic", () => {
    const i = {
      ...base(),
      actions: [
        action({ id: "a", causeId: "rc", kind: "corrective", category: "repair" }),
        action({ id: "b", causeId: "rc", kind: "preventive", category: "condition_monitoring" }),
      ],
    };
    expect(ids(i, "system-root-without-systemic-action")).toEqual(["rc"]);
  });
  it.each(["procedure", "training", "maintenance_task", "design"] as const)("is satisfied by a %s action", (category) => {
    const i = { ...base(), actions: [action({ id: "a", causeId: "rc", kind: "preventive", category })] };
    expect(rules(i)).not.toContain("system-root-without-systemic-action");
  });
  it("does not flag a Physical root cause, or one with no actions (another rule covers that)", () => {
    const phys = { ...base("physical"), actions: [action({ id: "a", causeId: "rc", category: "repair" })] };
    expect(rules(phys)).not.toContain("system-root-without-systemic-action");
    expect(rules(base())).not.toContain("system-root-without-systemic-action");
    expect(rules(base())).toContain("root-cause-without-action");
  });
  it("does not guess for older actions that have no category", () => {
    const i = { ...base(), actions: [action({ id: "a", causeId: "rc" }), action({ id: "b", causeId: "rc", category: "repair" })] };
    expect(rules(i)).not.toContain("system-root-without-systemic-action");
  });
});

describe("natural deterioration needs managing", () => {
  function natural(status: "verified" | "hypothesis" = "verified", deterioration: "natural" | "forced" | "" = "natural") {
    let i = inv("n");
    i = withCause(i, null, { id: "wear", text: "Normal bearing wear", status, deterioration, evidenceIds: ["e"], category: "physical" });
    i = { ...i, tree: addChild(i.tree, "wear", newNode({ id: "root", text: "No life tracking", isRootCause: true, category: "system", status: "hypothesis" })) };
    return i;
  }
  it("flags a verified natural cause with no maintenance or monitoring action on its branch", () => {
    const i = { ...natural(), actions: [action({ id: "a", causeId: "root", kind: "preventive", category: "procedure" })] };
    expect(ids(i, "natural-deterioration-unmanaged")).toEqual(["wear"]);
  });
  it.each(["maintenance_task", "condition_monitoring"] as const)("is satisfied by a %s action beneath it", (category) => {
    const i = { ...natural(), actions: [action({ id: "a", causeId: "root", category })] };
    expect(rules(i)).not.toContain("natural-deterioration-unmanaged");
    expect(naturalIsManaged(i, i.tree.children[0])).toBe(true);
  });
  it("does not count such an action on an unrelated branch", () => {
    let i = natural();
    i = withCause(i, null, { id: "other", text: "Other", isRootCause: true });
    i = { ...i, actions: [action({ id: "a", causeId: "other", category: "maintenance_task" })] };
    expect(ids(i, "natural-deterioration-unmanaged")).toEqual(["wear"]);
  });
  it("ignores forced, unset and unverified causes", () => {
    expect(rules(natural("verified", "forced"))).not.toContain("natural-deterioration-unmanaged");
    expect(rules(natural("verified", ""))).not.toContain("natural-deterioration-unmanaged");
    expect(rules(natural("hypothesis", "natural"))).not.toContain("natural-deterioration-unmanaged");
  });
});

describe("maintenance plan items a planner can load", () => {
  it("flags a task with no interval or no task text, only for those categories", () => {
    const i = {
      ...base(),
      actions: [
        action({ id: "a", causeId: "rc", category: "maintenance_task", description: "x" }),
        action({
          id: "b",
          causeId: "rc",
          category: "condition_monitoring",
          task: { description: "Read it", intervalValue: 1, intervalUnit: "months", craft: "", change: "new" },
        }),
        action({ id: "c", causeId: "rc", category: "procedure" }),
      ],
    };
    const f = runQualityCheck(i, TODAY).filter((x) => x.rule === "task-missing-detail");
    expect(f).toHaveLength(1);
    // The plan falls back to the action description, so only the interval is missing here.
    expect(f[0].message).toContain("needs an interval before");
    expect(f[0].message).not.toContain("task description");
  });

  it("asks for task text only when the action description is empty too", () => {
    const i = { ...base(), actions: [action({ id: "e", causeId: "rc", category: "maintenance_task", description: "" })] };
    const f = runQualityCheck(i, TODAY).filter((x) => x.rule === "task-missing-detail");
    expect(f[0].message).toContain("task description and an interval");
  });
});

describe("spares gap", () => {
  const spares = { needed: "yes" as const, inStock: "no" as const, leadTimeDays: 30, coverage: "" };
  it("flags the long-lead gap until a spares holding action exists", () => {
    const i = { ...base(), spares };
    expect(rules(i)).toContain("spares-long-lead-no-stock");
    const covered = { ...i, actions: [action({ id: "s", causeId: "rc", category: "spares", kind: "preventive" })] };
    expect(rules(covered)).not.toContain("spares-long-lead-no-stock");
  });
  it("does not flag below 14 days", () => {
    expect(rules({ ...base(), spares: { ...spares, leadTimeDays: 13 } })).not.toContain("spares-long-lead-no-stock");
  });
});
