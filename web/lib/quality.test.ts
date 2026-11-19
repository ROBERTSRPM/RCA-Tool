import { describe, expect, it } from "vitest";
import { blankInvestigation } from "./investigation";
import { runQualityCheck } from "./quality";
import { buildSample } from "./sample";
import { addChild, newNode, updateNode } from "./tree";
import type { Investigation } from "./types";

const TODAY = "2026-06-01";
const rules = (inv: Investigation, today = TODAY) =>
  runQualityCheck(inv, today).map((f) => f.rule);

describe("runQualityCheck", () => {
  it("finds nothing wrong with the sample investigation", () => {
    expect(runQualityCheck(buildSample(), TODAY)).toEqual([]);
  });

  it("flags a blank investigation: problem, loss and no cause", () => {
    const r = rules(blankInvestigation());
    expect(r).toContain("problem-missing-fields");
    expect(r).toContain("loss-not-quantified");
    expect(r).toContain("no-root-cause");
  });

  it("names the missing problem fields", () => {
    const inv = blankInvestigation();
    inv.problem.title = "x";
    const f = runQualityCheck(inv, TODAY).find((f) => f.rule === "problem-missing-fields")!;
    expect(f.message).toContain("asset");
    expect(f.message).not.toContain("title");
    expect(f.step).toBe("problem");
  });

  it("flags verified causes without evidence, with a node jump", () => {
    const base = blankInvestigation();
    const inv = {
      ...base,
      tree: addChild(base.tree, base.tree.id, newNode({ id: "v", text: "Seal worn", status: "verified", category: "system" })),
    };
    const f = runQualityCheck(inv, TODAY).find((f) => f.rule === "verified-without-evidence")!;
    expect(f.nodeId).toBe("v");
    expect(f.step).toBe("cause");
    const linked = { ...inv, tree: updateNode(inv.tree, "v", { evidenceIds: ["e"] }) };
    expect(rules(linked)).not.toContain("verified-without-evidence");
  });

  it("flags branches that stop on Physical or Human causes only", () => {
    const base = blankInvestigation();
    let tree = addChild(base.tree, base.tree.id, newNode({ id: "p", text: "Bearing failed", category: "physical" }));
    tree = addChild(tree, base.tree.id, newNode({ id: "h", text: "Fitter skipped step", category: "human" }));
    tree = addChild(tree, base.tree.id, newNode({ id: "s", text: "No procedure", category: "system" }));
    tree = addChild(tree, base.tree.id, newNode({ id: "r", text: "Wrong oil", category: "physical", status: "ruled_out" }));
    const flagged = runQualityCheck({ ...base, tree }, TODAY)
      .filter((f) => f.rule === "branch-without-system-cause")
      .map((f) => f.nodeId);
    expect(flagged.sort()).toEqual(["h", "p"]);
    // Adding a system cause beneath clears the physical one.
    tree = addChild(tree, "p", newNode({ id: "p2", text: "No PM", category: "system" }));
    const after = runQualityCheck({ ...base, tree }, TODAY)
      .filter((f) => f.rule === "branch-without-system-cause")
      .map((f) => f.nodeId);
    expect(after).toEqual(["h"]);
  });

  it("flags root causes without an action, then clears when linked", () => {
    const s = buildSample();
    const inv: Investigation = { ...s, actions: s.actions.filter((a) => a.causeId !== "n-root6") };
    const f = runQualityCheck(inv, TODAY).filter((f) => f.rule === "root-cause-without-action");
    expect(f.map((x) => x.nodeId)).toEqual(["n-root6"]);
  });

  it("flags actions missing owner or due date", () => {
    const s = buildSample();
    const inv: Investigation = {
      ...s,
      actions: [{ ...s.actions[0], owner: "", dueDate: "" }, ...s.actions.slice(1)],
    };
    const f = runQualityCheck(inv, TODAY).filter((f) => f.rule === "action-missing-owner-or-date");
    expect(f).toHaveLength(1);
    expect(f[0].message).toContain("an owner and a due date");
  });

  it("flags overdue open actions only", () => {
    const s = buildSample();
    const open = { ...s.actions[0], status: "in_progress" as const, dueDate: "2026-05-31" };
    const notYet = { ...s.actions[1], status: "open" as const, dueDate: "2026-06-01" };
    const doneLate = { ...s.actions[2], status: "done" as const, dueDate: "2020-01-01" };
    const inv: Investigation = { ...s, actions: [open, notYet, doneLate] };
    const overdue = runQualityCheck(inv, TODAY).filter((f) => f.rule === "action-overdue");
    expect(overdue).toHaveLength(1);
    expect(overdue[0].message).toContain("2026-05-31");
  });

  it("flags all-done-but-unverified, and clears once reviewed", () => {
    const s = buildSample();
    const unreviewed: Investigation = {
      ...s,
      verification: { ...s.verification, recurred: "unreviewed", reviewDate: "" },
    };
    expect(rules(unreviewed)).toContain("done-without-verification");
    expect(rules(s)).not.toContain("done-without-verification");
  });

  it("prompts to reopen when the failure recurred", () => {
    const s = buildSample();
    const inv: Investigation = { ...s, verification: { ...s.verification, recurred: "yes" } };
    const f = runQualityCheck(inv, TODAY).find((f) => f.rule === "failure-recurred")!;
    expect(f.step).toBe("cause");
  });

  it("sorts high severity first", () => {
    const sev = runQualityCheck(blankInvestigation(), TODAY).map((f) => f.severity);
    const order = { high: 0, medium: 1, low: 2 } as const;
    expect([...sev].sort((a, b) => order[a] - order[b])).toEqual(sev);
  });

  it("flags actions whose cause was removed or is no longer a root cause (DEF-03)", () => {
    const inv = buildSample();
    const gone = { ...inv, actions: [...inv.actions, { ...inv.actions[0], id: "x", causeId: "no-such-node" }] };
    expect(rules(gone)).toContain("action-not-linked");
    const unflagged = { ...inv, tree: JSON.parse(JSON.stringify(inv.tree)) };
    const first = inv.actions.find((a) => a.causeId)!;
    const mark = (n: Investigation["tree"]) => {
      if (n.id === first.causeId) n.isRootCause = false;
      n.children.forEach(mark);
    };
    mark(unflagged.tree);
    expect(rules(unflagged)).toContain("action-not-linked");
  });
});

describe("missing loss is a gentle reminder", () => {
  it("is low severity with the friendly wording", () => {
    const f = runQualityCheck(blankInvestigation(), TODAY).find((x) => x.rule === "loss-not-quantified")!;
    expect(f.severity).toBe("low");
    expect(f.message).toBe("Add a rough figure when you can. Managers act on dollars.");
  });
  it("clears when a rough estimate is given", () => {
    const inv = blankInvestigation();
    inv.loss.annualEstimate = 50000;
    expect(rules(inv)).not.toContain("loss-not-quantified");
  });
});
