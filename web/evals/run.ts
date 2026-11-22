/**
 * RCA Pilot AI eval runner.   npm run evals -- --help
 *
 * Exit codes: 0 pass (or nothing to compare), 1 regression against the baseline, 2 the run could
 * not be completed (bad arguments, no API key, calls that kept failing).
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { getModel, hasApiKey } from "../lib/ai/anthropic";
import { modelCall } from "../lib/ai/handler";
import { mockModel } from "../lib/ai/mock";
import { SYSTEM_PROMPT } from "../lib/ai/prompts";
import { buildAllCalls, coreCases, EVALS_DIR, filterCases, loadCases, parseFeatureFilter, type EvalCall } from "./cases";
import { runHardChecks } from "./checks";
import { compare, DEFAULT_THRESHOLD, loadBaseline, makeBaseline } from "./gate";
import { buildJudgePrompt, getJudgeModel, JUDGE_SYSTEM, judge } from "./judge";
import { addUsage, costOf, fmtUsd, zeroUsage, type Usage } from "./pricing";
import { featureStats, finalScore, renderMarkdown, type ItemResult } from "./report";
import { installUsageCapture, runModel } from "./runtime";
import { selfTest } from "./selftest";

const HELP = `Usage: npm run evals -- [options]   (run from web/)

  --all                 Run all 30 cases (about twice the cost of the default). For occasional deep checks. Its scores are not compared with the baseline and cannot write one.
  --cases <list>        Case ids to run: case-03,injection-02, numbers (3), ranges (1-5), or the groups case / injection. Default: the 15-case core set in evals/core.json. A filtered run never fails the gate.
  --features <list>     coach, challenge, capa, draft, or draft:problem|report|summary. Default: all.
  --dry-run             Build every prompt (all 30 cases unless --cases is given) and run the hard checks on mock outputs. No API calls, no key needed. Prints the cost estimate for the core run and for --all.
  --update-baseline     After a default (core) run, write evals/baseline.json (use only for a run the owner accepts).
  --threshold <n>       Largest allowed drop per feature before the gate fails. Default ${DEFAULT_THRESHOLD}.
  --concurrency <n>     Parallel cases of work. Default 4.
  --baseline <file>     Baseline file. Default evals/baseline.json.
  --out-dir <dir>       Where results go. Default evals/results.

Environment: ANTHROPIC_API_KEY (required for a real run), ANTHROPIC_MODEL (default claude-sonnet-5-5), JUDGE_MODEL (default claude-opus-5-5).`;

async function pool<T, R>(items: T[], n: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

const log = (s: string) => process.stderr.write(s + "\n");
const redact = (text: string): string => {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key ? text.split(key).join("[redacted]") : text;
};

/* ---------- one item ---------- */

function assess(call: EvalCall, raw: unknown, validate: (r: unknown) => unknown) {
  let result: unknown | null = null;
  try {
    result = validate(raw);
  } catch {
    result = null;
  }
  const modelCallInfo = modelCall(call.request);
  const checks = runHardChecks({
    request: call.request,
    raw,
    result,
    schema: modelCallInfo.call.schema,
    spec: call.checks.spec,
    allowedNumbers: call.checks.allowedNumbers,
    verifiedNodeTexts: call.checks.verifiedNodeTexts,
    isInjection: call.checks.isInjection,
    expectsIssues: call.checks.expectsIssues,
  });
  return { result, checks, hardPass: checks.every((c) => c.pass) };
}

const blankItem = (call: EvalCall): ItemResult => ({
  callId: call.callId,
  caseId: call.caseId,
  feature: call.feature,
  label: call.label,
  isInjection: call.checks.isInjection,
  answer: null,
  raw: null,
  checks: [],
  hardPass: false,
  judge: null,
  judgeError: null,
  score: null,
  error: null,
  modelUsage: zeroUsage(),
  judgeUsage: zeroUsage(),
});

async function evalReal(call: EvalCall): Promise<ItemResult> {
  const item = blankItem(call);
  const m = modelCall(call.request);
  const out = await runModel(m.call);
  item.modelUsage = out.usage;
  if (!out.ok) {
    if (out.kind === "error") {
      item.error = `model call failed after retries (${out.code} ${out.detail})`.trim();
      return item;
    }
    // The model gave nothing usable (refusal, cut off, not JSON): that is a failed answer, scored 0.
    item.checks = [{ name: "schemaValid", pass: false, detail: `model output unusable (${out.detail})` }];
    item.score = 0;
    return item;
  }
  item.raw = out.raw;
  const a = assess(call, out.raw, m.validate);
  item.answer = a.result;
  item.checks = a.checks;
  item.hardPass = a.hardPass;
  if (a.result === null) {
    item.score = 0;
    return item;
  }
  const j = await judge(call, a.result);
  item.judgeUsage = j.usage;
  if (j.ok) item.judge = j.judgement;
  else item.judgeError = `judge failed (${j.code})`;
  item.score = finalScore(item);
  return item;
}

/* ---------- dry run ---------- */

const TOK_PER_CHAR = 1 / 3.5;
const OUT_TOKENS: Record<string, number> = { "coach:node": 1200, "coach:tree": 1600, challenge: 1000, capa: 1800, "draft:problem": 600, "draft:report": 2500, "draft:summary": 900 };
const THINKING_TOKENS = 1500;
const JUDGE_OUT = 400;

async function dryRun(calls: EvalCall[], concurrency: number, coreIds: Set<string>): Promise<number> {
  // The mock refuses to run in production; the dry run is a local tool, so make sure it is not.
  (process.env as Record<string, string | undefined>).NODE_ENV = process.env.NODE_ENV === "production" ? "development" : process.env.NODE_ENV;
  process.env.AI_MOCK = "1";
  const st = selfTest();
  log(`Self-test of the hard checks: ${st.passed}/${st.total} controls behaved as expected.`);
  for (const f of st.failures) log(`  SELF-TEST FAILED: ${f}`);

  let bad = 0;
  const modelName = getModel();
  const judgeName = getJudgeModel();
  const est = { m: zeroUsage(), j: zeroUsage() };
  const estCore = { m: zeroUsage(), j: zeroUsage(), n: 0 };
  const promptTokens: number[] = [];
  const rows = await pool(calls, Math.max(concurrency, 16), async (call) => {
    const m = modelCall(call.request);
    const inTok = Math.round((SYSTEM_PROMPT.length + m.call.instructions.length + m.call.user.length) * TOK_PER_CHAR);
    const raw = await mockModel(call.request);
    const a = assess(call, raw, m.validate);
    const jIn = Math.round((JUDGE_SYSTEM.length + buildJudgePrompt(call, a.result ?? raw).length) * TOK_PER_CHAR);
    return { call, inTok, a, jIn, sys: Math.round(SYSTEM_PROMPT.length * TOK_PER_CHAR), outTok: OUT_TOKENS[call.label.replace(/^(coach:\w+|draft:\w+).*/, "$1").replace(/^capa:.*/, "capa")] ?? 1500 };
  });
  const checkFailures: string[] = [];
  rows.forEach((r, idx) => {
    promptTokens.push(r.inTok);
    const sysCached = idx > 0 ? r.sys : 0;
    const mu = { input: r.inTok - sysCached, output: r.outTok + THINKING_TOKENS, cacheRead: sysCached, cacheWrite: 0 };
    const ju = { input: r.jIn, output: JUDGE_OUT + THINKING_TOKENS, cacheRead: 0, cacheWrite: 0 };
    est.m = addUsage(est.m, mu);
    est.j = addUsage(est.j, ju);
    if (coreIds.has(r.call.caseId)) {
      estCore.m = addUsage(estCore.m, mu);
      estCore.j = addUsage(estCore.j, ju);
      estCore.n++;
    }
    const schemaBad = r.a.checks.find((c) => c.name === "schemaValid" && !c.pass);
    if (schemaBad) {
      bad++;
      log(`  ${r.call.callId}: mock output is not schema valid (${schemaBad.detail})`);
    }
    for (const c of r.a.checks.filter((c) => !c.pass && c.name !== "schemaValid")) checkFailures.push(`${r.call.callId} ${c.name}: ${c.detail}`);
  });
  log(`Built ${calls.length} prompts for ${new Set(calls.map((c) => c.caseId)).size} cases; largest prompt about ${Math.max(...promptTokens)} input tokens, median ${[...promptTokens].sort((a, b) => a - b)[Math.floor(promptTokens.length / 2)]}.`);
  log(`Mock outputs through the hard checks: ${rows.length - bad} schema valid of ${rows.length}.`);
  if (checkFailures.length) {
    log(`Other hard checks that flagged the generic mock answers (expected, the mock is canned text, not a model): ${checkFailures.length}`);
    for (const f of checkFailures.slice(0, 5)) log(`  ${f}`);
  }
  const sum = (label: string, n: number, e: { m: Usage; j: Usage }) => {
    const mc = costOf(e.m, modelName);
    const jc = costOf(e.j, judgeName);
    log(`${label}: ${n} answers (ESTIMATE: real prompt sizes, assumed output sizes incl. ${THINKING_TOKENS} thinking tokens, system prompt cached)`);
    log(`  model ${modelName}: ${e.m.input + e.m.cacheRead} in, ${e.m.output} out, ${fmtUsd(mc)}`);
    log(`  judge ${judgeName}: ${e.j.input} in, ${e.j.output} out, ${fmtUsd(jc)}`);
    log(`  total ${fmtUsd(mc !== null && jc !== null ? mc + jc : null)}`);
  };
  log("");
  if (estCore.n > 0 && estCore.n < calls.length) {
    sum(`Pre-flight estimate for the default real run (core set, ${new Set(calls.filter((c) => coreIds.has(c.caseId)).map((c) => c.caseId)).size} cases)`, estCore.n, estCore);
    log("");
    sum("Pre-flight estimate for a real run with --all", calls.length, est);
  } else {
    sum(`Pre-flight estimate for a real run of these ${calls.length} answers`, calls.length, est);
  }
  const ok = bad === 0 && st.failures.length === 0;
  log(ok ? "\nDRY RUN PASSED" : "\nDRY RUN FAILED");
  return ok ? 0 : 2;
}

/* ---------- main ---------- */

async function main(): Promise<number> {
  const { values: o } = parseArgs({
    options: {
      cases: { type: "string" },
      features: { type: "string" },
      all: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      "update-baseline": { type: "boolean", default: false },
      threshold: { type: "string" },
      concurrency: { type: "string" },
      baseline: { type: "string" },
      "out-dir": { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (o.help) {
    log(HELP);
    return 0;
  }
  const threshold = o.threshold === undefined ? DEFAULT_THRESHOLD : Number(o.threshold);
  const concurrency = o.concurrency === undefined ? 4 : Number(o.concurrency);
  if (!Number.isFinite(threshold) || threshold < 0 || !Number.isInteger(concurrency) || concurrency < 1) {
    log("--threshold must be a number >= 0 and --concurrency a whole number >= 1.");
    return 2;
  }
  const everything = loadCases();
  const core = coreCases(everything);
  const casesFilter = o.cases === "all" ? undefined : o.cases;
  if (o.all && casesFilter) {
    log("Use either --all or --cases, not both.");
    return 2;
  }
  // Default: the core set. --all or --cases all: every case. --cases <list>: just those (a filtered run).
  const runAll = Boolean(o.all) || o.cases === "all";
  const cases = casesFilter ? filterCases(everything, casesFilter) : runAll || o["dry-run"] ? everything : core;
  const featureOk = parseFeatureFilter(o.features);
  const calls = buildAllCalls(cases, everything, featureOk);
  if (!calls.length) {
    log("Nothing to run: the filters match no calls.");
    return 2;
  }
  const partial = Boolean(casesFilter) || Boolean(o.features && o.features !== "all");

  if (o["dry-run"]) return dryRun(calls, concurrency, new Set(core.map((c) => c.id)));

  if (!hasApiKey()) {
    log("ANTHROPIC_API_KEY is not set. Set it in the environment (never in a file) or use --dry-run.");
    return 2;
  }
  installUsageCapture();
  const model = getModel();
  const judgeModel = getJudgeModel();
  const startedAt = new Date().toISOString();
  log(`Running ${calls.length} answers over ${cases.length} cases (${casesFilter ? "filtered" : runAll ? "all" : "core set"}). Model ${model}, judge ${judgeModel}, concurrency ${concurrency}.`);
  let done = 0;
  const items = await pool(calls, concurrency, async (call) => {
    const item = await evalReal(call);
    done++;
    const state = item.error ? `ERROR ${item.error}` : item.judgeError ? item.judgeError : `score ${item.score?.toFixed(1)}${item.hardPass ? "" : " HARD-CHECK FAIL"}`;
    log(`[${done}/${calls.length}] ${call.callId}: ${state}`);
    return item;
  });

  const stats = featureStats(items);
  const baselineFile = o.baseline ? path.resolve(o.baseline) : path.join(EVALS_DIR, "baseline.json");
  const baseline = loadBaseline(baselineFile);
  const gate = compare(stats, baseline, { threshold, partial, model, judgeModel, caseIds: cases.map((c) => c.id) });
  const totals = {
    model: items.reduce((u: Usage, i) => addUsage(u, i.modelUsage), zeroUsage()),
    judge: items.reduce((u: Usage, i) => addUsage(u, i.judgeUsage), zeroUsage()),
    modelName: model,
    judgeName: judgeModel,
  };
  const incomplete = items.some((i) => i.error || i.score === null);
  const md = renderMarkdown({ startedAt, model, judgeModel, caseCount: cases.length, items, stats, gate, totals, partial });

  const outDir = o["out-dir"] ? path.resolve(o["out-dir"]) : path.join(EVALS_DIR, "results");
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = startedAt.replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(outDir, `${stamp}.json`), redact(JSON.stringify({ startedAt, model, judgeModel, partial, gate, stats, totals, items }, null, 2)));
  fs.writeFileSync(path.join(outDir, `${stamp}.md`), redact(md));
  log(`\nResults: ${path.join(outDir, stamp)}.json and .md`);
  process.stdout.write(redact(md));

  const mc = costOf(totals.model, model);
  const jc = costOf(totals.judge, judgeModel);
  log(`\nTokens: model ${totals.model.input + totals.model.cacheRead + totals.model.cacheWrite} in / ${totals.model.output} out; judge ${totals.judge.input} in / ${totals.judge.output} out. Cost: ${fmtUsd(mc !== null && jc !== null ? mc + jc : null)}.`);

  if (incomplete) {
    log("INCOMPLETE: some calls could not be scored. Not a gate result.");
    return 2;
  }
  if (o["update-baseline"]) {
    if (partial || runAll) {
      log("Refusing to write a baseline from a filtered or --all run. Run the default core set with all features.");
      return 2;
    }
    fs.writeFileSync(baselineFile, JSON.stringify(makeBaseline(stats, model, judgeModel, cases.map((c) => c.id)), null, 2) + "\n");
    log(`Baseline written to ${baselineFile}.`);
    return 0;
  }
  if (gate.status === "fail") {
    log("GATE FAILED: a feature dropped by more than the threshold, or hard-check failures increased.");
    return 1;
  }
  log(`Gate: ${gate.status}.`);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    // Never print the error object: it could carry request details. Name and message only.
    log(`Eval runner error: ${(err as Error)?.message ?? String(err)}`);
    process.exit(2);
  },
);
