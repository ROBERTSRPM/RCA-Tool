import { describe, expect, it } from "vitest";
import { AiError } from "../lib/ai/anthropic";
import { buildAllCalls, coreCases, filterCases, loadCases, loadCoreIds, parseFeatureFilter } from "./cases";
import { findWordingProblem as runHardChecksWording, runHardChecks } from "./checks";
import { compare, makeBaseline, type Baseline } from "./gate";
import { parseJudgement } from "./judge";
import { costOf } from "./pricing";
import { featureStats, finalScore, renderMarkdown, worst, type ItemResult } from "./report";
import { apiErrorMessage, describeSdkError, isFatalStatus, isRetryable, statusOfDetail, withRetry } from "./runtime";
import { DEFAULT_JUDGE_MODEL, getJudgeModel } from "./judge";
import { derivedNumbers, findDates, findInventedNumber, findVerifiedClaims } from "./checks";
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

describe("false-alarm fixes in the hard checks", () => {
  const known = ["Output seal lip hard and cracked"];
  it("verified: questions and instructions pass", () => {
    for (const t of ["Who confirmed the cause?", "Check whether X is verified.", "Confirm with the fitter.", "Ask who has verified it.", "Find out if it was confirmed.", "Review what was verified.", "Please verify the confirmed cause."]) {
      expect(findVerifiedClaims([t], known), t).toBeNull();
    }
  });
  it("verified: real assertions still fail", () => {
    expect(findVerifiedClaims(["The cause is verified."], known)).not.toBeNull();
    expect(findVerifiedClaims(["Why? Contamination is confirmed as the cause."], known)).not.toBeNull();
    expect(findVerifiedClaims(["Confirmed contamination caused it."], known)).not.toBeNull();
  });
  const allowed = (texts: string[]) => new Set(["14", "1", ...derivedNumbers(texts)]);
  it("numbers: differences, sums, products and day counts pass", () => {
    const texts = ["Changed 14 times, with 1 spare, 3 shifts.", "Failed 2026-09-04 and 2026-09-21."];
    const set = new Set(["14", "1", "3", ...derivedNumbers(texts)]);
    for (const n of ["13", "15", "17", "42", "11"]) expect(findInventedNumber([`${n} here`], set, false), n).toBeNull();
    expect(derivedNumbers(["Failed on 4 May 2026 and 21 May 2026."]).has("17")).toBe(true);
    expect(findDates(["1 Oct 2026 and May 9, 2026"]).days.length).toBe(2);
    expect(allowed(texts).has("13")).toBe(true);
  });
  it("numbers: an invented interval still fails", () => {
    const set = new Set(["14", "1", "3", ...derivedNumbers(["Changed 14 times, with 1 spare, 3 shifts."])]);
    expect(findInventedNumber(["Inspect the seal every 6 weeks."], set, false)).toBe("6");
    expect(findInventedNumber(["Expect 47 trips a year."], set, false)).toBe("47");
  });
  it("wording: fix as a noun still fails", () => {
    expect(runHardChecksWording(["The permanent fix is a new sleeve."])).not.toBeNull();
  });
});

describe("judge default and account errors", () => {
  it("defaults the judge to Sonnet, Opus stays selectable", () => {
    expect(DEFAULT_JUDGE_MODEL).toBe("claude-sonnet-5-5");
    expect(getJudgeModel({} as NodeJS.ProcessEnv)).toBe("claude-sonnet-5-5");
    expect(getJudgeModel({ JUDGE_MODEL: "claude-opus-5-5" } as unknown as NodeJS.ProcessEnv)).toBe("claude-opus-5-5");
  });
  it("keeps the API message and flags 400, 401, 402 and 403 as fatal", () => {
    expect(apiErrorMessage('{"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the API."}}')).toBe("Your credit balance is too low to access the API.");
    expect(apiErrorMessage("upstream down")).toBe("upstream down");
    expect(describeSdkError({ status: 400, message: "400 {}", error: { error: { message: "credit balance is too low" } } })).toEqual({ status: 400, message: "credit balance is too low" });
    expect([400, 401, 402, 403].every(isFatalStatus)).toBe(true);
    expect([429, 500, 529, 404, null].some((s) => isFatalStatus(s))).toBe(false);
    expect(statusOfDetail("402")).toBe(402);
    expect(statusOfDetail("APIConnectionError")).toBeNull();
  });
  it("the production error stays generic (no API detail in the AiError)", async () => {
    const { classifyError } = await import("../lib/ai/anthropic");
    const e = classifyError({ status: 400, message: "credit balance is too low" });
    expect(e.detail).toBe("400");
    expect(e.message).toBe("unavailable");
  });
});

describe("cases", () => {
  it("loads 25 cases and 5 injection cases and builds 7 calls each", () => {
    expect(all.length).toBe(30);
    expect(calls.length).toBe(210);
  });
  it("the core set is 12 regular and 3 injection cases, all existing, covering every feature", () => {
    const core = coreCases(all);
    expect(core.length).toBe(15);
    expect(core.filter((c) => c.kind === "injection").length).toBe(3);
    expect(new Set(loadCoreIds()).size).toBe(15);
    const coreCalls = buildAllCalls(core, all, () => true);
    expect(coreCalls.length).toBe(105);
    expect(new Set(coreCalls.map((c) => c.label.replace(/^(coach|draft:\w+|capa).*/, "$1").replace(/^challenge$/, "challenge"))).size).toBe(6);
    expect(new Set(coreCalls.map((c) => c.feature))).toEqual(new Set(["coach", "challenge", "capa", "draft"]));
    expect(() => coreCases(all, ["case-99"])).toThrow();
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
    expect(compare(stats, makeBaseline(stats, "m", "j", ["case-01", "case-02"]), { ...opts, caseIds: ["case-02", "case-01"] }).status).toBe("pass");
  });
  it("refuses to compare with a baseline made from a different case set", () => {
    const b = makeBaseline(stats, "m", "j", ["case-01", "case-02"]);
    expect(compare(stats, b, { ...opts, caseIds: ["case-01", "case-02", "case-03"] }).status).toBe("set_mismatch");
    const old: Baseline = { ...b };
    delete old.caseIds;
    expect(compare(stats, old, { ...opts, caseIds: ["case-01", "case-02"] }).status).toBe("set_mismatch");
  });
  it("markdown escapes html outside code fences and never breaks the fence", () => {
    const evil = item({ score: 1, answer: { t: "```<img src=x onerror=1>```" }, judge: { score: 1, met: [], missed: ["<b>x</b>"], violations: [], reason: "<script>" } });
    const md = renderMarkdown({ startedAt: "t", model: "m", judgeModel: "j", caseCount: 1, items: [evil], stats: featureStats([evil]), gate: compare(featureStats([evil]), null, opts), totals: { model: evil.modelUsage, judge: evil.judgeUsage, modelName: "claude-sonnet-5-5", judgeName: "claude-sonnet-5-5" }, partial: false });
    expect(md).not.toMatch(/Judge: <script>/);
    expect(md).toContain("&lt;script&gt;");
    expect(md).toContain("````text");
  });
  it("prices known models and says unknown for others", () => {
    expect(costOf({ input: 1_000_000, output: 1_000_000, cacheRead: 0, cacheWrite: 0 }, "claude-sonnet-5-5")).toBe(12);
    expect(costOf({ input: 1, output: 1, cacheRead: 0, cacheWrite: 0 }, "some-other-model")).toBeNull();
  });
});
