import { describe, expect, it } from "vitest";
import { buildSample } from "../sample";
import { buildAiContext } from "./context";
import {
  cleanResult,
  OUT_LIMITS,
  stripRefs,
  validateCapa,
  validateChallenge,
  validateCoach,
  validateDocument,
  validateProblem,
} from "./output";
import { makeAliases } from "./prompts";

const context = buildAiContext(buildSample());
const a = makeAliases(context);
const top = context.nodes[0].id;
const n3 = context.nodes[2].id;

describe("validateCoach", () => {
  const s = (o: object = {}) => ({ parent: "N3", level: "human", text: "No alignment check", why: "w", confirmWith: "c", ruleOutWith: "r", deterioration: "not_applicable", ...o });
  it("maps references back to real ids in tree scope", () => {
    const r = validateCoach({ suggestions: [s()] }, a, "tree", top);
    expect(r?.suggestions[0].parentId).toBe(n3);
  });
  it("node scope always attaches to the selected cause, whatever the model says", () => {
    const r = validateCoach({ suggestions: [s({ parent: "N3" })] }, a, "node", top);
    expect(r?.suggestions[0].parentId).toBe(top);
  });
  it("falls back to the selected node for unknown references", () => {
    expect(validateCoach({ suggestions: [s({ parent: "N999" })] }, a, "tree", top)?.suggestions[0].parentId).toBe(top);
  });
  it("drops bad items, caps the count and clips text", () => {
    const many = Array.from({ length: 20 }, () => s({ text: "x".repeat(2000) }));
    const r = validateCoach({ suggestions: [{ text: "" }, { text: "t", level: "bogus" }, "str", ...many] }, a, "tree", top)!;
    expect(r.suggestions).toHaveLength(OUT_LIMITS.suggestions);
    expect(r.suggestions[0].text.length).toBe(OUT_LIMITS.text);
  });
  it("only physical causes keep a deterioration tag", () => {
    const r = validateCoach({ suggestions: [s({ level: "system", deterioration: "forced" }), s({ level: "physical", deterioration: "forced" })] }, a, "tree", top)!;
    expect(r.suggestions.map((x) => x.deterioration)).toEqual(["", "forced"]);
  });
  it("returns null for junk", () => {
    expect(validateCoach(null, a, "tree", top)).toBeNull();
    expect(validateCoach({ suggestions: [] }, a, "tree", top)).toBeNull();
    expect(validateCoach({ nope: 1 }, a, "tree", top)).toBeNull();
  });
});

describe("validateChallenge", () => {
  const actionRef = context.actions.length ? "A1" : "none";
  it("maps node and action references, defaults unknown values", () => {
    const r = validateChallenge(
      { summary: "ok", issues: [{ ref: "n3", type: "blame", severity: "high", message: "m", question: "q" }, { ref: actionRef, type: "weird", severity: "huge", message: "m2", question: "" }, { ref: "none", type: "other", severity: "low", message: "m3", question: "" }] },
      a,
    )!;
    expect(r.issues[0].nodeId).toBe(n3);
    expect(r.issues[1].type).toBe("other");
    expect(r.issues[1].severity).toBe("medium");
    if (context.actions.length) expect(r.issues[1].actionId).toBe(context.actions[0].id);
    expect(r.issues[2]).toMatchObject({ nodeId: "", actionId: "" });
  });
  it("skips issues without a message, caps the list, accepts a clean bill of health", () => {
    expect(validateChallenge({ summary: "Looks sound.", issues: [] }, a)).toEqual({ summary: "Looks sound.", issues: [] });
    const r = validateChallenge({ summary: "", issues: Array.from({ length: 30 }, () => ({ ref: "N1", type: "other", severity: "low", message: "m", question: "" })).concat([{ ref: "N1", type: "other", severity: "low", message: "", question: "" }]) }, a)!;
    expect(r.issues).toHaveLength(OUT_LIMITS.issues);
    expect(validateChallenge({ summary: "", issues: [] }, a)).toBeNull();
    expect(validateChallenge("x", a)).toBeNull();
  });
});

describe("validateCapa", () => {
  const act = (o: object = {}) => ({ kind: "preventive", category: "maintenance_task", description: "Grease the bearings with a measured dose", intervalValue: 4, intervalUnit: "weeks", craft: "Lubrication technician", rationale: "r", ...o });
  it("keeps task detail for task categories only", () => {
    const r = validateCapa({ deterioration: "forced", deteriorationReason: "why", actions: [act(), act({ category: "procedure", intervalValue: 6, craft: "Fitter" })], horizontalExpansion: "h" })!;
    expect(r.actions[0]).toMatchObject({ intervalValue: 4, intervalUnit: "weeks", craft: "Lubrication technician" });
    expect(r.actions[1]).toMatchObject({ intervalValue: null, craft: "" });
  });
  it("rejects absurd or non-numeric intervals and bad enums", () => {
    const r = validateCapa({ deterioration: "maybe", actions: [act({ intervalValue: -3 }), act({ intervalValue: "soon" }), act({ intervalValue: 1e9 }), act({ category: "magic" }), act({ kind: "other" }), act({ description: "" })] })!;
    expect(r.deterioration).toBe("unclear");
    expect(r.actions).toHaveLength(3);
    expect(r.actions.every((x) => x.intervalValue === null)).toBe(true);
  });
  it("returns null with no usable actions", () => {
    expect(validateCapa({ actions: [] })).toBeNull();
    expect(validateCapa(undefined)).toBeNull();
  });
});

describe("validateProblem / validateDocument", () => {
  it("problem: needs a title or description, caps missing facts", () => {
    expect(validateProblem({ title: "", whatHappened: "" })).toBeNull();
    const r = validateProblem({ title: "T", whatHappened: "W", where: 5, when: "", impact: "I", missingFacts: Array.from({ length: 20 }, (_, i) => `q${i}`) })!;
    expect(r.where).toBe("");
    expect(r.missingFacts).toHaveLength(8);
  });
  it("document: drops empty sections, caps size", () => {
    expect(validateDocument({ title: "t", sections: [{ heading: "", body: "x" }] }, "report")).toBeNull();
    const d = validateDocument({ title: "t", sections: [{ heading: "Summary", body: "text" }, { heading: "", body: "no heading" }] }, "report")!;
    expect(d.sections).toHaveLength(1);
    const big = { title: "t", sections: Array.from({ length: 10 }, () => ({ heading: "H", body: "x".repeat(2900) })) };
    expect(validateDocument(big, "report")).toBeNull();
    expect(validateDocument({ title: "t", sections: [{ heading: "H", body: "x".repeat(3000) }, { heading: "H2", body: "y".repeat(1000) }] }, "summary")).toBeNull();
  });
});

describe("stripRefs / cleanResult (no internal labels reach the user)", () => {
  const titled = { ...a, titleByAlias: new Map([["N2", "Seal flush too low"], ["A1", "Fit flush gauge"], ["E1", "Grease sample"]]) };
  it("removes bracketed references and replaces bare ones with the item's words", () => {
    expect(stripRefs("Fix the flush (N2).", titled)).toBe("Fix the flush.");
    expect(stripRefs("Fix the flush [N2, A1]", titled)).toBe("Fix the flush");
    expect(stripRefs("Because of N2, do A1.", titled)).toBe('Because of "Seal flush too low", do "Fit flush gauge".');
    expect(stripRefs("See E1", titled)).toBe('See "Grease sample"');
  });
  it("leaves unknown labels and ordinary words alone", () => {
    expect(stripRefs("Nitrogen N2 purge on model A99 and plan B", titled)).toContain("model A99");
  });
  it("cleans every text field but never touches ids", () => {
    const out = cleanResult({ nodeId: "N2", issues: [{ message: "Check N2", parentId: "A1" }] }, titled);
    expect(out.nodeId).toBe("N2");
    expect(out.issues[0].parentId).toBe("A1");
    expect(out.issues[0].message).toBe('Check "Seal flush too low"');
  });
});

describe("challenge: the failure event carries no evidence", () => {
  it("drops 'no evidence' issues about N1 but keeps them for causes", () => {
    const r = validateChallenge(
      { summary: "s", issues: [
        { ref: "N1", type: "no_evidence", severity: "medium", message: "Top event has no evidence", question: "" },
        { ref: "N3", type: "no_evidence", severity: "medium", message: "This cause has no evidence", question: "" },
        { ref: "N1", type: "weak_logic", severity: "low", message: "Event wording is vague", question: "" },
      ] },
      a,
    )!;
    expect(r.issues.map((i) => i.message)).toEqual(["This cause has no evidence", "Event wording is vague"]);
  });
});
