import { describe, expect, it } from "vitest";
import { blankInvestigation } from "./investigation";
import { normaliseInvestigation } from "./normalize";
import { COST_PRESETS, PROCESS_FAILURE_MODES, DETERIORATION_OPTIONS, CAUSE_AREAS, FAILURE_TYPES } from "./options";
import { runQualityCheck } from "./quality";
import { calcLoss } from "./finance";
import { buildSample } from "./sample";
import { addChild, newNode, updateNode } from "./tree";
import { buildAiContext } from "./ai/context";
import { buildPrompt, makeAliases, renderInvestigation, SYSTEM_PROMPT } from "./ai/prompts";
import { validateCoach } from "./ai/output";

describe("process / quality failures", () => {
  it("old investigations load with no failure type (equipment)", () => {
    const old = normaliseInvestigation(JSON.parse(JSON.stringify(buildSample())))!;
    expect(old.problem.failureType).toBeUndefined();
    expect(old.problem.qualityRef).toBeUndefined();
  });

  it("keeps failure type and quality reference, and drops junk", () => {
    const inv = blankInvestigation();
    const ok = normaliseInvestigation({ ...inv, problem: { ...inv.problem, failureType: "process", qualityRef: " NCR-2291 " } })!;
    expect(ok.problem.failureType).toBe("process");
    expect(ok.problem.qualityRef).toBe(" NCR-2291 ");
    const bad = normaliseInvestigation({ ...inv, problem: { ...inv.problem, failureType: "banana", qualityRef: "  " } })!;
    expect(bad.problem.failureType).toBeUndefined();
    expect(bad.problem.qualityRef).toBeUndefined();
  });

  it("uses the exact labels", () => {
    expect(FAILURE_TYPES.map((f) => f.label)).toEqual(["Equipment failure", "Process or quality failure"]);
    expect(COST_PRESETS.map((p) => p.label)).toEqual([
      "Scrapped product",
      "Rework",
      "Product on hold",
      "Customer claims and credits",
      "Retailer penalties",
    ]);
    expect(DETERIORATION_OPTIONS.map((d) => d.label)).toContain("Not applicable");
    expect(CAUSE_AREAS.map((a) => a.label)).toEqual(
      expect.arrayContaining(["Materials", "Method", "Measurement", "Environment"]),
    );
  });

  it("cost presets are cash costs the user fills in", () => {
    const l = { ...blankInvestigation().loss, eventsPerYear: 2 };
    const withPresets = {
      ...l,
      otherCosts: COST_PRESETS.map((p, i) => ({ id: String(i), category: p.category, description: p.label, amount: 100 })),
    };
    expect(calcLoss(withPresets).otherPerEvent).toBe(500);
    const empty = { ...l, otherCosts: COST_PRESETS.map((p, i) => ({ id: String(i), category: p.category, description: p.label, amount: null })) };
    expect(calcLoss(empty).otherPerEvent).toBe(0);
  });

  it("keeps Not applicable and cause area on a cause; old values unchanged", () => {
    const inv = blankInvestigation();
    const node = { ...newNode(), text: "Seal temperature set low", deterioration: "not_applicable" as const, area: "method" as const };
    const tree = addChild(inv.tree, inv.tree.id, node);
    const back = normaliseInvestigation({ ...inv, tree })!;
    const n = back.tree.children[0];
    expect(n.deterioration).toBe("not_applicable");
    expect(n.area).toBe("method");
    const junk = normaliseInvestigation({ ...inv, tree: addChild(inv.tree, inv.tree.id, { ...node, area: "zzz" as never }) })!;
    expect(junk.tree.children[0].area).toBeUndefined();
  });

  it("quality check does not nag about natural/forced when Not applicable", () => {
    const inv = blankInvestigation();
    const node = { ...newNode(), text: "Wrong sealing dwell time", status: "verified" as const, deterioration: "not_applicable" as const };
    const tree = updateNode(addChild(inv.tree, inv.tree.id, node), node.id, { isRootCause: true });
    const rules = runQualityCheck({ ...inv, tree }, "2026-06-01").map((f) => f.rule);
    expect(rules).not.toContain("natural-deterioration-unmanaged");
    expect(rules.join(" ")).not.toMatch(/deterioration/);
  });

  it("AI context and prompt carry the failure type and quality reference", () => {
    const inv = buildSample();
    inv.problem.failureType = "process";
    inv.problem.qualityRef = "NCR-2291";
    const ctx = buildAiContext(inv);
    expect(ctx.problem.failureType).toBe("process");
    const text = renderInvestigation(ctx, makeAliases(ctx));
    expect(text).toContain("Process or quality failure");
    expect(text).toContain("NCR-2291");
    const plain = buildAiContext(buildSample());
    expect(renderInvestigation(plain, makeAliases(plain))).not.toContain("Process or quality failure");
  });

  it("prompts cover process causes and CAPA, without claiming HACCP compliance", () => {
    expect(SYSTEM_PROMPT).toMatch(/film batch/);
    expect(SYSTEM_PROMPT).toMatch(/sealing temperature, dwell, pressure/);
    expect(SYSTEM_PROMPT).toMatch(/Do not claim the analysis meets HACCP/);
    const ctx = buildAiContext(buildSample());
    const a = makeAliases(ctx);
    const root = ctx.nodes[1].id;
    const capa = buildPrompt({ feature: "capa", context: ctx, rootCauseId: root } as never, a).instructions;
    expect(capa).toMatch(/control-plan/);
    expect(capa).toMatch(/settings lockout/);
    expect(capa).toMatch(/leak test frequency/);
    expect(capa).toMatch(/QA or CAPA/);
    const coach = buildPrompt({ feature: "coach", scope: "tree", context: ctx } as never, a).instructions;
    expect(coach).toMatch(/measurement/);
    expect(coach).toMatch(/not_applicable/);
  });

  it("coach suggestions may be Not applicable at any level", () => {
    const ctx = buildAiContext(buildSample());
    const a = makeAliases(ctx);
    const r = validateCoach(
      { suggestions: [{ level: "system", text: "Changeover sheet has no sealing check", why: "", confirmWith: "", ruleOutWith: "", deterioration: "not_applicable" }] },
      a,
      "node",
      ctx.nodes[0].id,
    );
    expect(r?.suggestions[0].deterioration).toBe("not_applicable");
  });

  it("process fields round-trip and old data has none", () => {
    const inv = blankInvestigation();
    const back = normaliseInvestigation({
      ...inv,
      problem: { ...inv.problem, failureType: "process", line: "Line 3", product: "Tikka", packType: "400 g tray", processStep: "Sealing" },
    })!;
    expect(back.problem).toMatchObject({ line: "Line 3", product: "Tikka", packType: "400 g tray", processStep: "Sealing" });
    expect(normaliseInvestigation(blankInvestigation())!.problem.line).toBeUndefined();
    const ctx = buildAiContext(back);
    expect(renderInvestigation(ctx, makeAliases(ctx))).toContain("Pack type: 400 g tray");
  });

  it("process failure modes include the leaking pack option", () => {
    expect(PROCESS_FAILURE_MODES).toEqual(
      expect.arrayContaining(["Seal failure (leaking pack)", "Underweight / overfill", "Foreign body", "Labelling error", "Temperature excursion", "Contamination"]),
    );
  });

  it("AI context carries cost per event and the verified saving", () => {
    const inv = buildSample();
    const ctx = buildAiContext(inv);
    expect(ctx.loss).toMatch(/per event/);
    inv.actions = inv.actions.map((a) => ({ ...a, status: "done" as const }));
    inv.verification = { ...inv.verification, recurred: "no", reviewDate: "2026-06-01", eventsPerYearAfter: 0 };
    const v = buildAiContext(inv).verification;
    expect(v).toMatch(/verified saving/);
    const notDone = buildSample();
    notDone.verification = { ...notDone.verification, recurred: "unreviewed" };
    const open = buildAiContext(notDone).verification;
    expect(open).not.toMatch(/saving/);
  });

  it("coach and summary prompts: contamination is not wear; summary uses event cost and saving", () => {
    const ctx = buildAiContext(buildSample());
    const a = makeAliases(ctx);
    const coach = buildPrompt({ feature: "coach", scope: "tree", context: ctx } as never, a).instructions;
    expect(coach).toMatch(/Contamination, materials, methods and settings are not wear/);
    const summary = buildPrompt({ feature: "draft", kind: "summary", notes: "", context: ctx } as never, a).instructions;
    expect(summary).toMatch(/cost of one event/);
    expect(summary).toMatch(/verified saving/);
  });
});
