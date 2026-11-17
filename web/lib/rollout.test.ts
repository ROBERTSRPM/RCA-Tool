import { describe, expect, it } from "vitest";
import { blankAsset } from "./assets";
import {
  createRolloutChecks,
  defaultRolloutCheckText,
  needsFixing,
  rankRolloutCandidates,
  rolloutProgress,
  subjectFromProblem,
} from "./rollout";
import { action, inv, withCause } from "./testing";
import type { RolloutCheck } from "./types";

const a = (tag: string, extra: Record<string, string> = {}) =>
  blankAsset({ id: tag, tag, type: "Slurry pump", ...extra });

const subject = { tag: "P-101", type: "Slurry pump", makeModel: "Warman 8/6 AH", duty: "Slurry feed to the concentrator" };

describe("rankRolloutCandidates", () => {
  it("requires the same type and excludes the asset itself", () => {
    const list = [a("P-101"), a("P-102"), a("P-210", { type: "Centrifugal pump" }), a("P-300", { type: "" })];
    expect(rankRolloutCandidates(subject, list).map((c) => c.asset.tag)).toEqual(["P-102"]);
  });

  it("lists nothing when this asset has no meaningful type", () => {
    expect(rankRolloutCandidates({ ...subject, type: "" }, [a("P-102")])).toEqual([]);
    expect(rankRolloutCandidates({ ...subject, type: "Other" }, [a("P-102", { type: "Other" })])).toEqual([]);
  });

  it("ranks same duty words, same make/model and higher criticality first", () => {
    const list = [
      a("P-1", { criticality: "C" }),
      a("P-2", { criticality: "A" }),
      a("P-3", { makeModel: "warman 8/6 ah" }),
      a("P-4", { duty: "Concentrator slurry feed, line 2" }),
      a("P-5", { duty: "Concentrator slurry feed", makeModel: "Warman 8/6 AH", criticality: "A" }),
    ];
    const order = rankRolloutCandidates(subject, list).map((c) => c.asset.tag);
    expect(order[0]).toBe("P-5");
    expect(order.indexOf("P-4")).toBeLessThan(order.indexOf("P-2"));
    expect(order.indexOf("P-3")).toBeLessThan(order.indexOf("P-2"));
    expect(order.indexOf("P-2")).toBeLessThan(order.indexOf("P-1"));
  });

  it("gives plain reasons and breaks ties by tag", () => {
    const out = rankRolloutCandidates(subject, [a("P-20"), a("P-3")]);
    expect(out.map((c) => c.asset.tag)).toEqual(["P-3", "P-20"]);
    const r = rankRolloutCandidates(subject, [a("P-9", { criticality: "B", makeModel: "Warman 8/6 AH" })])[0];
    expect(r.reasons).toEqual(expect.arrayContaining(["Same make and model (Warman 8/6 AH)", "Criticality B"]));
  });

  it("builds the subject from a problem, treating missing fields as empty", () => {
    expect(subjectFromProblem({ title: "x" })).toEqual({ tag: "", type: "", makeModel: "", duty: "" });
  });
});

describe("rollout checks", () => {
  it("prefills the check text from root causes and preventive actions", () => {
    let i = inv("1", { title: "Seal leak", failureMode: "Seal or gland leak" });
    i = withCause(i, null, { id: "rc", text: "No flush on inspection route", isRootCause: true });
    i = {
      ...i,
      actions: [
        action({ id: "p", causeId: "rc", kind: "preventive", description: "Add flush check to the route" }),
        action({ id: "c", causeId: "rc", kind: "corrective", description: "Replace seal" }),
      ],
    };
    const text = defaultRolloutCheckText(i);
    expect(text).toContain("Seal or gland leak");
    expect(text).toContain("No flush on inspection route");
    expect(text).toContain("Add flush check to the route");
    expect(text).not.toContain("Replace seal");
  });

  it("creates one open check per chosen asset and skips assets that already have one", () => {
    const existing: RolloutCheck[] = createRolloutChecks([a("P-102")], "x");
    const made = createRolloutChecks([a("P-102"), a("P-103"), a("P-103")], "Check it", existing, "Sam", "2030-01-01");
    expect(made.map((c) => c.assetTag)).toEqual(["P-103"]);
    expect(made[0]).toMatchObject({ status: "open", what: "Check it", owner: "Sam", dueDate: "2030-01-01" });
    expect(made[0].assetLabel).toContain("P-103");
  });

  it("summarises progress", () => {
    expect(rolloutProgress(undefined)).toMatchObject({ total: 0, done: 0, percent: 0 });
    const mk = (status: RolloutCheck["status"]): RolloutCheck => ({ ...createRolloutChecks([a(status)], "w")[0], status });
    const checks = [mk("open"), mk("no_issue"), mk("same_problem"), mk("fixed")];
    const p = rolloutProgress(checks);
    expect(p).toMatchObject({ total: 4, open: 1, noIssue: 1, sameProblem: 1, fixed: 1, done: 3, percent: 75 });
    expect(needsFixing(checks).map((c) => c.status)).toEqual(["same_problem"]);
  });
});
