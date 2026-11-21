import { describe, expect, it } from "vitest";
import { AiError } from "../lib/ai/anthropic";
import { buildAllCalls, filterCases, loadCases, parseFeatureFilter } from "./cases";
import { runHardChecks } from "./checks";
import { compare, makeBaseline, type Baseline } from "./gate";
import { parseJudgement } from "./judge";
import { costOf } from "./pricing";
import { featureStats, finalScore, renderMarkdown, worst, type ItemResult } from "./report";
import { isRetryable, withRetry } from "./runtime";
import { selfTest } from "./selftest";
import { modelCall } from "../lib/ai/handler";

const all = loadCases();
const calls = buildAllCalls(all, all, () => true);

describe("hard checks", () => {
  it("every control behaves as expected", () => {
    const r = selfTest();
    expect(r.failures).toEqual([]);
  });

  it("flags a bad coach answer and passes a clean one on a real case call", () => {
    const call = calls.find((c) => c.callId === "case-01/coach:tree")!;
    const m = modelCall(call.request);
    const run = (raw: unknown) =>
      runHardChecks({ request: call.request, raw, result: m.validate(raw), schema: m.call.schema, spec: call.checks.spec, allowedNumbers: call.checks.allowedNumbers, verifiedNodeTexts: call.checks.verifiedNodeTexts, isInjection: false, expectsIssues: false });
    const s = (text: string) => ({ suggestions: [{ parent: "N1", level: "system", text, why: "Plausible here.", confirmWith: "Check the job plan.", ruleOutWith: "Plan covers it.", deterioration: "not_applicable" }] });
    expect(run(s("No step in the job plan covers shaft inspection")).every((c) => c.pass)).toBe(true);
    const bad = run(s("The operator error caused 12345 failures and the cause is verified"));
    expect(bad.filter((c) => !c.pass).map((c) => c.name).sort()).toEqual(["noInventedNumbers", "noPersonBlamedAsRoot", "nothingMarkedVerified"]);
    expect(run({ suggestions: "nope" })[0]).toMatchObject({ name: "schemaValid", pass: false });
  });
});

describe("cases", () => {
  it("loads 25 cases and 5 injection cases and builds 7 calls each", () => {
    expect(all.length).toBe(30);
    expect(calls.length).toBe(210);
  });
  it("filters cases and features", () => {
    expect(filterCases(all, "3,injection-02").map((c) => c.id)).toEqual(["case-03", "injection-02"]);
    expect(filterCases(all, "1-3").length).toBe(3);
    expect(filterCases(all, "injection").length).toBe(5);
    expect(() => filterCases(all, "case-99")).toThrow();
    const only = buildAllCalls(all.slice(0, 1), all, parseFeatureFilter("draft:report,capa"));
    expect(only.map((c) => c.feature)).toEqual(["capa", "draft"]);
    expect(only[1].label).toBe("draft:report");
    expect(() => parseFeatureFilter("bogus")).toThrow();
  });
});

describe("retry", () => {
  const fast = { attempts: 4, baseMs: 0, maxMs: 0, sleep: async () => {} };
  it("retries 429 and 5xx, not 4xx or unusable", async () => {
    expect(isRetryable(new AiError("busy", "429"))).toBe(true);
    expect(isRetryable(new AiError("unavailable", "500"))).toBe(true);
    expect(isRetryable(new AiError("unavailable", "400"))).toBe(false);
    expect(isRetryable(new AiError("unusable", "refusal"))).toBe(false);
    expect(isRetryable(new AiError("not_configured", "401"))).toBe(false);
    expect(isRetryable({ status: 529 })).toBe(true);
  });
  it("gives up after the attempts and succeeds when a retry works", async () => {
    let n = 0;
    await expect(withRetry(async () => { n++; throw new AiError("busy", "429"); }, fast)).rejects.toBeInstanceOf(AiError);
    expect(n).toBe(4);
    let k = 0;
    expect(await withRetry(async () => (++k < 3 ? Promise.reject(new AiError("busy", "429")) : "ok"), fast)).toBe("ok");
  });
});

const item = (over: Partial<ItemResult>): ItemResult => ({
  callId: "case-01/x", caseId: "case-01", feature: "coach", label: "coach:tree", isInjection: false, answer: { a: 1 }, raw: null,
  checks: [], hardPass: true, judge: { score: 8, met: [], missed: ["m"], violations: [], reason: "r" }, judgeError: null, score: 8, error: null,
  modelUsage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 }, judgeUsage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 }, ...over,
});

describe("scoring and gate", () => {
  it("a hard-check failure forces 0", () => {
    expect(finalScore({ hardPass: false, judge: { score: 9, met: [], missed: [], violations: [], reason: "" } })).toBe(0);
    expect(finalScore({ hardPass: true, judge: { score: 9, met: [], missed: [], violations: [], reason: "" } })).toBe(9);
  });
  it("judge violations cap the score at 4", () => {
    expect(parseJudgement({ score: 9, met: [], missed: [], violations: ["x"], reason: "" })?.score).toBe(4);
    expect(parseJudgement({ score: 99, met: [], missed: [], violations: [], reason: "" })?.score).toBe(10);
    expect(parseJudgement({ score: "9" })).toBeNull();
  });
  const items = [item({ score: 8 }), item({ score: 0, hardPass: false, checks: [{ name: "noInventedNumbers", pass: false, detail: "n" }] })];
  const stats = featureStats(items);
  it("aggregates per feature", () => {
    expect(stats.coach.meanScore).toBe(4);
    expect(stats.coach.hardPassRate).toBe(0.5);
    expect(stats.coach.hardFailItems).toBe(1);
    expect(worst(items)[0].score).toBe(0);
  });
  const opts = { threshold: 0.5, partial: false, model: "m", judgeModel: "j" };
  const base = (score: number, hf: number): Baseline => ({ formatVersion: 1, updatedAt: "", model: "m", judgeModel: "j", note: "", features: { coach: { score, hardCheckFailures: hf, hardCheckPassRate: 1, items: 2 } } });
  it("passes within the threshold, fails beyond it or on more hard failures", () => {
    expect(compare(stats, base(4.5, 1), opts).status).toBe("pass");
    expect(compare(stats, base(4.6, 1), opts).status).toBe("fail");
    expect(compare(stats, base(4, 0), opts).status).toBe("fail");
    expect(compare(stats, null, opts).status).toBe("no_baseline");
    expect(compare(stats, base(9, 0), { ...opts, partial: true }).status).toBe("partial");
  });
  it("makeBaseline round trips into a passing compare", () => {
    expect(compare(stats, makeBaseline(stats, "m", "j"), opts).status).toBe("pass");
  });
  it("markdown escapes html outside code fences and never breaks the fence", () => {
    const evil = item({ score: 1, answer: { t: "```<img src=x onerror=1>```" }, judge: { score: 1, met: [], missed: ["<b>x</b>"], violations: [], reason: "<script>" } });
    const md = renderMarkdown({ startedAt: "t", model: "m", judgeModel: "j", caseCount: 1, items: [evil], stats: featureStats([evil]), gate: compare(featureStats([evil]), null, opts), totals: { model: evil.modelUsage, judge: evil.judgeUsage, modelName: "claude-sonnet-5-5", judgeName: "claude-opus-5-5" }, partial: false });
    expect(md).not.toMatch(/Judge: <script>/);
    expect(md).toContain("&lt;script&gt;");
    expect(md).toContain("````text");
  });
  it("prices known models and says unknown for others", () => {
    expect(costOf({ input: 1_000_000, output: 1_000_000, cacheRead: 0, cacheWrite: 0 }, "claude-sonnet-5-5")).toBe(12);
    expect(costOf({ input: 1, output: 1, cacheRead: 0, cacheWrite: 0 }, "some-other-model")).toBeNull();
  });
});
