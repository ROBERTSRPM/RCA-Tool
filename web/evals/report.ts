/** Aggregation and the markdown summary. */
import type { CheckResult } from "./checks";
import type { GateResult } from "./gate";
import type { Judgement } from "./judge";
import { costOf, fmtUsd, type Usage } from "./pricing";

export interface ItemResult {
  callId: string;
  caseId: string;
  feature: string;
  label: string;
  isInjection: boolean;
  /** What the user would see (validated), or null. */
  answer: unknown | null;
  raw: unknown | null;
  checks: CheckResult[];
  hardPass: boolean;
  judge: Judgement | null;
  judgeError: string | null;
  /** Final score: 0 on a hard-check failure, else the judge score; null if it could not be scored. */
  score: number | null;
  /** Infrastructure error (not the model's fault): the item is excluded from scores and the run is incomplete. */
  error: string | null;
  modelUsage: Usage;
  judgeUsage: Usage;
}

export interface FeatureStats {
  items: number;
  scored: number;
  errors: number;
  meanScore: number | null;
  hardPassRate: number;
  hardFailItems: number;
  byLabelKind: Record<string, { n: number; mean: number }>;
}

export function finalScore(i: Pick<ItemResult, "hardPass" | "judge">): number | null {
  if (!i.hardPass) return 0;
  return i.judge ? i.judge.score : null;
}

export function featureStats(items: ItemResult[]): Record<string, FeatureStats> {
  const out: Record<string, FeatureStats> = {};
  for (const f of [...new Set(items.map((i) => i.feature))]) {
    const mine = items.filter((i) => i.feature === f);
    const ok = mine.filter((i) => !i.error);
    const scored = ok.filter((i) => i.score !== null);
    const kinds: Record<string, number[]> = {};
    for (const i of scored) (kinds[i.label.replace(/^(draft:\w+).*/, "$1")] ??= []).push(i.score as number);
    const hardFail = ok.filter((i) => !i.hardPass).length;
    out[f] = {
      items: mine.length,
      scored: scored.length,
      errors: mine.length - ok.length + (ok.length - scored.length),
      meanScore: scored.length ? scored.reduce((n, i) => n + (i.score as number), 0) / scored.length : null,
      hardPassRate: ok.length ? (ok.length - hardFail) / ok.length : 1,
      hardFailItems: hardFail,
      byLabelKind: Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, { n: v.length, mean: v.reduce((a, b) => a + b, 0) / v.length }])),
    };
  }
  return out;
}

export function worst(items: ItemResult[], n = 5): ItemResult[] {
  return items
    .filter((i) => i.score !== null && !i.error)
    .sort((a, b) => (a.score as number) - (b.score as number) || Number(a.hardPass) - Number(b.hardPass))
    .slice(0, n);
}

/* ---------- markdown ---------- */

/** Text outside code fences: stop model output from becoming HTML or links in the job summary. */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\r?\n/g, " ");

function fence(text: string): string {
  const longest = Math.max(2, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
  const f = "`".repeat(longest + 1);
  return `${f}text\n${text}\n${f}`;
}

const fmt = (x: number | null, d = 2) => (x === null ? "n/a" : x.toFixed(d));
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export interface Totals {
  model: Usage;
  judge: Usage;
  modelName: string;
  judgeName: string;
}

export function renderMarkdown(args: {
  startedAt: string;
  model: string;
  judgeModel: string;
  caseCount: number;
  items: ItemResult[];
  stats: Record<string, FeatureStats>;
  gate: GateResult;
  totals: Totals;
  partial: boolean;
}): string {
  const { items, stats, gate, totals } = args;
  const L: string[] = [];
  const base = new Map(gate.rows.map((r) => [r.feature, r]));
  const errors = items.filter((i) => i.error || (!i.error && i.score === null));
  L.push(`# AI eval summary`);
  L.push("");
  L.push(`- Run: ${args.startedAt}`);
  L.push(`- Model under test: \`${args.model}\`. Judge: \`${args.judgeModel}\`.`);
  L.push(`- ${args.caseCount} cases, ${items.length} answers${args.partial ? " (filtered run)" : ""}.`);
  const verdict = errors.length
    ? "INCOMPLETE: some calls failed after retries, so this run cannot be used as a gate result."
    : gate.status === "pass"
      ? "PASS"
      : gate.status === "fail"
        ? "FAIL: regression against the baseline."
        : gate.status === "no_baseline"
          ? "NO BASELINE: nothing was compared (gate not enforced)."
          : gate.status === "set_mismatch"
            ? "BASELINE FROM A DIFFERENT CASE SET: nothing was compared (gate not enforced)."
            : "PARTIAL RUN: gate not enforced.";
  L.push(`- Result: **${verdict}**`);
  L.push("");
  L.push(`## Score per feature (0 to 10)`);
  L.push("");
  L.push(`| Feature | Score | Baseline | Change | Hard-check pass rate | Hard-check failures | Answers |`);
  L.push(`|---|---|---|---|---|---|---|`);
  for (const [f, s] of Object.entries(stats)) {
    const r = base.get(f);
    const flag = r?.scoreRegressed || r?.hardRegressed ? " REGRESSED" : "";
    L.push(
      `| ${f}${flag} | ${fmt(s.meanScore)} | ${r ? fmt(r.baseline) : "-"} | ${r ? (r.delta >= 0 ? "+" : "") + fmt(r.delta) : "-"} | ${pct(s.hardPassRate)} | ${s.hardFailItems}${r ? ` (baseline ${r.baselineHardFailures})` : ""} | ${s.scored}/${s.items} |`,
    );
  }
  for (const [f, s] of Object.entries(stats)) {
    const kinds = Object.entries(s.byLabelKind);
    if (f === "draft" && kinds.length > 1) L.push("", `Draft by kind: ${kinds.map(([k, v]) => `${k.replace("draft:", "")} ${fmt(v.mean)}`).join(", ")}.`);
  }
  L.push("");
  L.push(`Gate threshold: a feature may drop by at most ${gate.threshold} points, and hard-check failures may not increase.`);
  for (const n of gate.notes) L.push(`- ${esc(n)}`);

  if (errors.length) {
    L.push("", `## Calls that failed`, "");
    for (const e of errors) L.push(`- ${e.callId}: ${esc(e.error ?? e.judgeError ?? "no score")}`);
  }

  const failed = items.filter((i) => !i.hardPass && !i.error);
  L.push("", `## Hard-check failures (${failed.length})`, "");
  if (!failed.length) L.push("None.");
  for (const i of failed) {
    for (const c of i.checks.filter((c) => !c.pass)) L.push(`- ${i.callId}: **${c.name}**: ${esc(c.detail)}`);
  }

  L.push("", `## Worst 5 answers`, "");
  const w = worst(items);
  if (!w.length) L.push("No scored answers.");
  w.forEach((i, idx) => {
    L.push(`### ${idx + 1}. ${i.callId} (score ${fmt(i.score, 1)}${i.hardPass ? "" : ", hard-check failure"})`, "");
    if (!i.hardPass) L.push(`Failed checks: ${i.checks.filter((c) => !c.pass).map((c) => `${c.name} (${esc(c.detail)})`).join("; ")}`, "");
    L.push(`Judge: ${i.judge ? esc(i.judge.reason) : "no judgement"}`, "");
    if (i.judge?.missed.length) L.push(`Missed must-haves:`, ...i.judge.missed.map((m) => `- ${esc(m)}`), "");
    if (i.judge?.violations.length) L.push(`Violations:`, ...i.judge.violations.map((m) => `- ${esc(m)}`), "");
    L.push(`Answer:`, "", fence(JSON.stringify(i.answer, null, 2) ?? "null"), "");
  });

  L.push(`## Tokens and cost`, "");
  const mc = costOf(totals.model, totals.modelName);
  const jc = costOf(totals.judge, totals.judgeName);
  L.push(`| | Model | Input | Output | Cache read | Cache write | Cost |`, `|---|---|---|---|---|---|---|`);
  const row = (n: string, m: string, u: Usage, c: number | null) => `| ${n} | \`${m}\` | ${u.input} | ${u.output} | ${u.cacheRead} | ${u.cacheWrite} | ${fmtUsd(c)} |`;
  L.push(row("Under test", totals.modelName, totals.model, mc), row("Judge", totals.judgeName, totals.judge, jc));
  L.push("", `Total: ${fmtUsd(mc !== null && jc !== null ? mc + jc : null)} (from the usage the API returned; prices in web/evals/pricing.ts).`);
  return L.join("\n") + "\n";
}
