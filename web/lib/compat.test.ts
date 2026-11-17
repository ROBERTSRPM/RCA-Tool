/**
 * Backward compatibility: investigations saved before the asset, CAPA,
 * deterioration, spares and rollout fields existed must still read, check,
 * summarise and report without those fields.
 */
import { describe, expect, it } from "vitest";
import { assetStats, planEnsureAsset } from "./assets";
import { groupByRootCause, maintenancePlan } from "./capa";
import { normaliseAsset, normaliseInvestigation } from "./normalize";
import { runQualityCheck } from "./quality";
import { rankRolloutCandidates, rolloutProgress, subjectFromProblem } from "./rollout";
import { rankSimilar, scoreSimilarity } from "./similarity";
import { summarise } from "./status";
import { buildSample } from "./sample";
import { calcLoss } from "./finance";

/** An investigation exactly as the app stored it before these features. */
const OLD = {
  id: "old-1",
  schemaVersion: 1,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-02T00:00:00.000Z",
  isSample: false,
  problem: {
    title: "Gearbox noise",
    asset: "Gearbox G-7",
    site: "Mill",
    eventDate: "2025-01-01",
    whatHappened: "Loud noise",
    where: "Output shaft",
    when: "Night",
    impact: "Stopped",
  },
  loss: { eventsPerYear: 2, downtimeHours: 5, ratePerHour: 10, unitName: "t", marginPerUnit: 2, repairCost: 100, currency: "$" },
  evidence: [{ id: "e1", type: "photo", title: "Photo", note: "", date: "", image: null }],
  tree: {
    id: "t",
    text: "Gearbox noise",
    category: "physical",
    status: "verified",
    evidenceIds: [],
    isRootCause: false,
    collapsed: false,
    children: [
      {
        id: "c1",
        text: "Oil low",
        category: "system",
        status: "verified",
        evidenceIds: ["e1"],
        isRootCause: true,
        collapsed: false,
        children: [],
      },
    ],
  },
  actions: [
    { id: "a1", causeId: "c1", description: "Top up oil", owner: "Sam", dueDate: "2025-02-01", status: "done", cost: 50 },
  ],
  verification: { reviewDate: "", recurred: "unreviewed", eventsPerYearAfter: null, notes: "" },
};

describe("investigations saved before the new fields", () => {
  const inv = normaliseInvestigation(OLD)!;

  it("reads with the new fields empty", () => {
    expect(inv.problem.assetTag).toBe("");
    expect(inv.problem.assetType).toBe("");
    expect(inv.problem.criticality).toBe("");
    expect(inv.problem.failureMode).toBe("");
    expect(inv.spares).toBeUndefined();
    expect(inv.rollouts).toEqual([]);
    expect(inv.actions[0].kind).toBeUndefined();
    expect(inv.actions[0].category).toBeUndefined();
    expect(inv.tree.children[0].deterioration).toBeUndefined();
  });

  it("keeps every old value unchanged", () => {
    expect(inv.problem.title).toBe("Gearbox noise");
    expect(inv.actions[0]).toMatchObject({ description: "Top up oil", cost: 50, status: "done" });
    expect(calcLoss(inv.loss).annualLoss).toBe(2 * (5 * 10 * 2 + 100));
  });

  it("adds no new quality findings of the CAPA kind", () => {
    const found = runQualityCheck(inv, "2026-06-01").map((f) => f.rule);
    for (const r of [
      "corrective-without-preventive",
      "system-root-without-systemic-action",
      "natural-deterioration-unmanaged",
      "task-missing-detail",
      "spares-long-lead-no-stock",
    ]) {
      expect(found).not.toContain(r);
    }
  });

  it("summarises, groups and plans without the new fields", () => {
    expect(summarise(inv, "2026-06-01").openActions).toBe(0);
    const { groups } = groupByRootCause(inv);
    expect(groups[0].unclassified).toHaveLength(1);
    expect(maintenancePlan(inv)).toEqual([]);
    expect(rolloutProgress(inv.rollouts)).toMatchObject({ total: 0, percent: 0 });
  });

  it("takes no part in asset matching, similarity or rollout until it has a tag and type", () => {
    expect(planEnsureAsset([], inv.problem)).toEqual({ action: "none" });
    expect(rankRolloutCandidates(subjectFromProblem(inv.problem), [])).toEqual([]);
    expect(assetStats({ id: "x", tag: "G-7", type: "", makeModel: "", duty: "", criticality: "", site: "", notes: "", createdAt: "", updatedAt: "" }, [inv]).investigations).toEqual([]);
    expect(scoreSimilarity(inv, inv).score).toBeGreaterThan(0); // shares words with itself, never with ids
    expect(rankSimilar(inv, [inv])).toEqual([]); // but never lists itself
  });

  it("copes with the raw object too (the readers use optional fields)", () => {
    expect(() => scoreSimilarity(OLD as never, OLD as never)).not.toThrow();
    expect(() => maintenancePlan(OLD as never)).not.toThrow();
    expect(() => runQualityCheck(OLD as never, "2026-06-01")).not.toThrow();
  });
});

describe("hostile or partial new fields", () => {
  it("drops values that are not allowed", () => {
    const inv = normaliseInvestigation({
      ...OLD,
      problem: { ...OLD.problem, criticality: "Z", assetTag: 42, failureMode: { x: 1 } },
      tree: { ...OLD.tree, deterioration: "cosmic" },
      actions: [{ ...OLD.actions[0], kind: "maybe", category: "magic", task: { intervalValue: "x", intervalUnit: "years", change: "?" } }],
      spares: { needed: "perhaps", leadTimeDays: "soon" },
      rollouts: [{ id: "r", status: "weird", what: 5 }, "junk", null],
    })!;
    expect(inv.problem.criticality).toBe("");
    expect(inv.problem.assetTag).toBe("");
    expect(inv.problem.failureMode).toBe("");
    expect(inv.tree.deterioration).toBeUndefined();
    expect(inv.actions[0].kind).toBeUndefined();
    expect(inv.actions[0].category).toBeUndefined();
    expect(inv.actions[0].task).toEqual({ description: "", intervalValue: null, intervalUnit: "months", craft: "", change: "new" });
    expect(inv.spares).toEqual({ needed: "", inStock: "", leadTimeDays: null, coverage: "" });
    expect(inv.rollouts).toHaveLength(1);
    expect(inv.rollouts![0]).toMatchObject({ status: "open", what: "" });
  });

  it("round-trips the sample, new fields included", () => {
    const s = buildSample();
    expect(normaliseInvestigation(s, s.id)).toEqual(s);
    expect(s.problem.assetTag).toBe("P-101");
    expect(s.actions.some((a) => a.category === "maintenance_task" && a.task?.intervalValue)).toBe(true);
  });

  it("normalises a stored asset tolerantly", () => {
    expect(normaliseAsset("nope")).toBeNull();
    expect(normaliseAsset({ tag: " P-1 ", criticality: "Q", type: 5 }, "id1")).toMatchObject({ id: "id1", tag: "P-1", criticality: "", type: "" });
  });
});
