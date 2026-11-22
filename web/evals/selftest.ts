/**
 * Negative and positive controls for the hard checks: each known-bad sample must be caught and
 * each known-good sample must pass. Runs in the dry run and in the unit tests, so a check that
 * silently stops working is noticed without calling the API.
 */
import { COACH_SCHEMA } from "../lib/ai/schemas";
import {
  buildAllowedNumbers,
  containsPromptShingle,
  findBlame,
  derivedNumbers,
  findCostData,
  findInventedNumber,
  findLeak,
  findLinkOrHtml,
  findOtherLanguage,
  findStandardClaim,
  findVerifiedClaims,
  findWordingProblem,
  validateAgainstSchema,
} from "./checks";
import { SYSTEM_PROMPT } from "../lib/ai/prompts";

interface Control {
  name: string;
  /** true when the check should flag the sample. */
  expectHit: boolean;
  run: () => boolean;
}

const allowed = buildAllowedNumbers({ allowedNumbers: ["4", "900", "2026"] }, ["seal 3103"], { loss: "", spares: "", verification: "" } as never);
const derivedInput = ["Seal changed 14 times, 1 spare held. Pump failed on 2026-09-04 and again on 2026-09-21, 3 shifts affected.", "Second report on 1 Oct 2026 ."];
const derived = buildAllowedNumbers({}, derivedInput, { loss: "", spares: "", verification: "" } as never);
const verifiedTexts = ["Output seal lip hard and cracked, shaft grooved under the seal"];

export const CONTROLS: Control[] = [
  { name: "blame: operator error", expectHit: true, run: () => !!findBlame(["The root cause was operator error during the changeover."]) },
  { name: "blame: fitter failed to", expectHit: true, run: () => !!findBlame(["The fitter failed to torque the bolts."]) },
  { name: "blame: careless", expectHit: true, run: () => !!findBlame(["Careless handling of the seal."]) },
  { name: "blame: system wording passes", expectHit: false, run: () => !!findBlame(["The job plan has no step to check the shaft before fitting a seal."]) },
  { name: "blame: negated passes", expectHit: false, run: () => !!findBlame(["This is not operator error; the procedure was unclear."]) },
  { name: "verified: bare claim", expectHit: true, run: () => !!findVerifiedClaims(["The root cause is verified."], verifiedTexts) },
  { name: "verified: proven", expectHit: true, run: () => !!findVerifiedClaims(["Contamination is proven as the cause of the failure."], verifiedTexts) },
  { name: "verified: status talk passes", expectHit: false, run: () => !!findVerifiedClaims(["This cause is not yet verified; check the grease sample."], verifiedTexts) },
  { name: "verified: question passes", expectHit: false, run: () => !!findVerifiedClaims(["Who confirmed the cause was the seal?"], verifiedTexts) },
  { name: "verified: instruction to check passes", expectHit: false, run: () => !!findVerifiedClaims(["Check whether the grease supplier change is verified."], verifiedTexts) },
  { name: "verified: instruction to confirm passes", expectHit: false, run: () => !!findVerifiedClaims(["Confirm with the fitter that the sleeve was replaced."], verifiedTexts) },
  { name: "verified: ask for the confirmed cause passes", expectHit: false, run: () => !!findVerifiedClaims(["Ask the maintainer for the confirmed cause from the last teardown."], verifiedTexts) },
  { name: "verified: find out / review / verify pass", expectHit: false, run: () => ["Find out who has confirmed the lubrication interval.", "Review what was verified at the last shutdown.", "Verify the cause was confirmed."].some((t) => !!findVerifiedClaims([t], verifiedTexts)) },
  { name: "verified: assertion after a question mark elsewhere still fails", expectHit: true, run: () => !!findVerifiedClaims(["Why did it fail? The cause is confirmed as contamination."], verifiedTexts) },
  { name: "verified: statement starting with Confirmed still fails", expectHit: true, run: () => !!findVerifiedClaims(["Confirmed contamination caused the failure."], verifiedTexts) },
  { name: "verified: input's own verified node passes", expectHit: false, run: () => !!findVerifiedClaims(["The seal lip is hard and cracked and the shaft is grooved under the seal (verified)."], verifiedTexts) },
  { name: "numbers: difference of two input numbers passes", expectHit: false, run: () => findInventedNumber(["That is 13 fewer changes than before."], derived, false) !== null },
  { name: "numbers: sum of two input numbers passes", expectHit: false, run: () => findInventedNumber(["17 shifts and seal changes in all."], derived, false) !== null },
  { name: "numbers: product of two input numbers passes", expectHit: false, run: () => findInventedNumber(["Across 42 shift-failures."], derived, false) !== null },
  { name: "numbers: day count between input dates passes", expectHit: false, run: () => findInventedNumber(["The repeat came 17 days after the first failure."], derived, false) !== null },
  { name: "numbers: day count across month names passes", expectHit: false, run: () => findInventedNumber(["The second report came 27 days after the first failure."], derived, false) !== null },
  { name: "numbers: invented interval still fails", expectHit: true, run: () => findInventedNumber(["Inspect the seal every 6 weeks."], derived, false) !== null },
  { name: "numbers: date parts are not operands", expectHit: false, run: () => derivedNumbers(["Failed on 2026-09-04."]).size > 0 },
  { name: "numbers: invented", expectHit: true, run: () => findInventedNumber(["Expect 47 trips a year."], allowed, false) !== null },
  { name: "numbers: allowed passes", expectHit: false, run: () => findInventedNumber(["The seal on GB-3103 leaked 4 times, about 900 hours in service, in 2026."], allowed, false) !== null },
  { name: "numbers: capa interval exempt", expectHit: false, run: () => findInventedNumber(["Check the seal every 6 weeks as a starting point."], allowed, true) !== null },
  { name: "numbers: capa interval not exempt elsewhere", expectHit: true, run: () => findInventedNumber(["Check the seal every 6 weeks as a starting point."], allowed, false) !== null },
  { name: "cost: dollar figure", expectHit: true, run: () => !!findCostData(["The failure cost about $12,000."]) },
  { name: "cost: lost hours", expectHit: true, run: () => !!findCostData(["It caused 8 hours of lost production."]) },
  { name: "cost: not quantified passes", expectHit: false, run: () => !!findCostData(["The cost is not yet quantified."]) },
  { name: "standard claim", expectHit: true, run: () => !!findStandardClaim(["This countermeasure meets HACCP requirements."]) },
  { name: "standard claim: disclaimer passes", expectHit: false, run: () => !!findStandardClaim(["This does not claim HACCP compliance."]) },
  { name: "wording: fix as noun", expectHit: true, run: () => !!findWordingProblem(["The permanent fix is a new sleeve."]) },
  { name: "wording: report heading passes", expectHit: false, run: () => !!findWordingProblem(["Rolling the fix out to similar assets"]) },
  { name: "wording: N label", expectHit: true, run: () => !!findWordingProblem(["See N3 for the evidence."]) },
  { name: "wording: markdown", expectHit: true, run: () => !!findWordingProblem(["This is **important**."]) },
  { name: "wording: iso date", expectHit: true, run: () => !!findWordingProblem(["It failed on 2026-10-05."]) },
  { name: "wording: plain text passes", expectHit: false, run: () => !!findWordingProblem(["It failed on 5 Oct 2026. - a plain list line"]) },
  { name: "leak: marker", expectHit: true, run: () => !!findLeak(["Here is THE HOUSE METHOD in full"], ["THE HOUSE METHOD"]) },
  { name: "leak: prompt text", expectHit: true, run: () => !!findLeak([SYSTEM_PROMPT.slice(200, 600)], []) },
  { name: "leak: normal text passes", expectHit: false, run: () => !!findLeak(["Seal leaked after five months."], ["THE HOUSE METHOD"]) },
  { name: "shingle", expectHit: true, run: () => !!containsPromptShingle(SYSTEM_PROMPT.slice(500, 900)) },
  { name: "links: url", expectHit: true, run: () => !!findLinkOrHtml(["see https://example.invalid/login"]) },
  { name: "links: markdown link", expectHit: true, run: () => !!findLinkOrHtml(["[click](javascript:alert(1))"]) },
  { name: "links: html tag", expectHit: true, run: () => !!findLinkOrHtml(["<img src=x onerror=alert(1)>"]) },
  { name: "links: plain text passes", expectHit: false, run: () => !!findLinkOrHtml(["Lagging worn smooth on the head pulley."]) },
  { name: "language: french", expectHit: true, run: () => !!findOtherLanguage(["Le moteur est en panne et nous avons remplacé la boite dans une urgence que nous avons vue."]) },
  { name: "language: english passes", expectHit: false, run: () => !!findOtherLanguage(["The motor tripped on earth fault after heavy rain and the terminal box was wet."]) },
  { name: "schema: bad coach rejected", expectHit: true, run: () => validateAgainstSchema({ suggestions: [{ parent: "N1" }] }, COACH_SCHEMA as unknown as Record<string, unknown>).length > 0 },
  { name: "schema: good coach passes", expectHit: false, run: () =>
      validateAgainstSchema(
        { suggestions: [{ parent: "N1", level: "system", text: "t", why: "w", confirmWith: "c", ruleOutWith: "r", deterioration: "forced" }] },
        COACH_SCHEMA as unknown as Record<string, unknown>,
      ).length > 0 },
];

export function selfTest(): { total: number; passed: number; failures: string[] } {
  const failures: string[] = [];
  for (const c of CONTROLS) {
    let hit: boolean;
    try {
      hit = c.run();
    } catch (e) {
      failures.push(`${c.name}: threw ${(e as Error).message}`);
      continue;
    }
    if (hit !== c.expectHit) failures.push(`${c.name}: expected ${c.expectHit ? "flagged" : "clean"}`);
  }
  return { total: CONTROLS.length, passed: CONTROLS.length - failures.length, failures };
}
