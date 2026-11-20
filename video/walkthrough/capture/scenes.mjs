// Usage: node scenes.mjs <N>   records walkthrough scene N (3..15); earlier scenes are replayed instantly to rebuild the state.
// Env: SCRATCH (state-w.json + qa_password.txt), DEMO_BASE (preview URL, no secrets), CLIPS (output dir).
import fs from "node:fs";
import path from "node:path";
import { launch, login, BASE } from "./lib.mjs";
import { Ctx } from "./ctx.mjs";
import * as D from "./data.mjs";
const S = process.env.SCRATCH;
const OUT = process.env.CLIPS || path.join(S, "clips-w");
const N = +process.argv[2];
const { browser, context, page } = await launch();
// fresh sign-in every run (refresh tokens rotate, so a saved session goes stale); the share cookie comes from $DEMO_SHARE
await page.goto(process.env.DEMO_SHARE, { waitUntil: "networkidle" });
await login(page, "qa-user-b@rca-tool.test", fs.readFileSync(`${S}/qa_password.txt`, "utf8").trim());
const c = new Ctx(page, S);
const step = (name) => page.locator("button").filter({ hasText: new RegExp("^\\s*\\d?\\s*" + name) }).first();
const lab = (t) => page.getByLabel(t, { exact: true });
const escRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const btn = (t, o = {}) => page.locator("button").filter({ hasText: typeof t === "string" ? new RegExp(o.exact ? "^\\s*" + escRe(t) + "\\s*$" : escRe(t)) : t });
const settle = () => page.waitForTimeout(350);
async function goStep(name) { await c.click(step(name), 0.9); await settle(); await c.top(); await c.hold(0.3); }
async function ai(trigger, resultSel, { wait = 150000 } = {}) {
  await c.click(trigger, 0.9);
  const wasRec = c.rec; if (wasRec) c.r.stop();
  const got = btn("Got it");
  try { await got.waitFor({ state: "visible", timeout: 2500 }); await got.click(); } catch {}
  try { await page.locator(resultSel).first().waitFor({ state: "visible", timeout: wait }); }
  catch { console.log("AI result timeout", resultSel, await page.locator("[data-testid=ai-error]").allTextContents()); }
  await page.waitForTimeout(600);
  if (wasRec) { c.r.start(); await c.hold(0.3); }
}
const fail = async (where, e) => { await page.screenshot({ path: `${S}/fail-${where}.png` }); console.log("FAILED at", where, String(e).split("\n")[0]); throw e; };
const run = async (n, fn) => { try { await fn(); } catch (e) { await fail(`s${n}`, e); } };

// ---------- scene functions ----------
async function s3b() { // prepared empty account -> New investigation
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" }); await page.getByText("No investigations yet").waitFor({ timeout: 20000 }); await page.waitForTimeout(800);
  c.mark("dash"); await c.hold(3.0);
  c.mark("new"); await c.click(btn(/New investigation/).first(), 1.2);
  await page.waitForURL(/investigations/); await page.waitForLoadState("networkidle"); await page.waitForTimeout(1500);
  await c.hold(1.5);
}
async function s4() {
  c.mark("type"); await c.click(btn(/\s*Process or quality failure/), 1.0); await c.hold(0.6);
  if (c.rec) {
    c.mark("notes"); await c.type(lab("Rough notes"), D.NOTES, 3);
    c.mark("draft");
    await ai(btn("Draft problem statement from notes").last(), "[data-testid=draft-problem-result]");
    c.mark("draft-result"); await c.scrollTo(page.getByTestId("draft-problem-result"), 1.0, 130); await c.hold(5.0);
    c.mark("edit");
    const box = page.getByTestId("draft-problem-result");
    const first = box.locator("input[type=text], textarea").first();
    await c.set(first, D.PROBLEM.title, 0.9); await c.hold(1.5);
    c.mark("use"); await c.click(btn("Use this draft"), 1.0); await settle(); await c.hold(1.0);
  }
  c.mark("fields");
  await c.scrollTo(page.getByText("1. Describe the problem").first(), 1.2, 120); await c.hold(2.0);
  await c.type(lab("Title"), D.PROBLEM.title, 3);
  await c.type(lab("Line or process"), D.PROBLEM.asset, 3);
  await c.type(lab("Site / area"), D.PROBLEM.site, 3);
  await c.set(lab("Date of event"), D.PROBLEM.date);
  await c.set(lab("What happened?"), D.PROBLEM.what); await c.set(lab("Where in the process?"), D.PROBLEM.where);
  await c.set(lab("When did it happen?"), D.PROBLEM.when); await c.set(lab("What was the impact?"), D.PROBLEM.impact);
  await c.hold(2.0);
}
async function s5() {
  c.mark("ncr"); await c.scrollTo(lab(/^Quality reference/), 1.2, 260); await c.type(lab(/^Quality reference/), "NCR-2291", 2); await c.hold(2.0);
  c.mark("details");
  await c.scrollTo(lab("Line", ), 1.4, 220);
  await c.type(lab("Line"), D.LINE.line, 3); await c.type(lab("Product"), D.LINE.product, 3); await c.type(lab("Pack type"), D.LINE.pack, 3);
  await c.type(lab("Process step"), D.LINE.step, 3); await c.type(lab("Asset type"), "Tray sealer", 3); await page.keyboard.press("Tab"); await c.type(lab("Failure mode"), D.LINE.mode, 3); await c.hold(3.0);
}
async function s6() {
  c.mark("tab"); await goStep("Loss"); await c.hold(1.5);
  c.mark("options"); await c.moveTo(btn("Not known yet"), 1.0); await c.hold(2.0);
  c.mark("figures");
  await c.type(lab("How many times a year does it happen?"), D.LOSS.events, 2); await c.type(lab("Downtime per event"), D.LOSS.hours, 2);
  await c.type(lab("Production rate"), D.LOSS.rate, 2); await c.type(lab("Unit name"), D.LOSS.unit, 2);
  await c.type(lab("Margin per unit"), D.LOSS.margin, 2); await c.type(lab("Repair cost per event"), D.LOSS.repair, 2);
  await c.hold(2.0);
  c.mark("other");
  for (const [name, amt] of D.OTHER) {
    await c.scrollTo(btn(name, { exact: true }).first(), 1.0, 300); await c.click(btn(name, { exact: true }).first(), 0.8); await settle();
    const amount = page.getByLabel(/Amount per event/).last(); await c.type(amount, amt, 2); await c.hold(0.8);
  }
  c.mark("calc"); await c.hold(6.0);
  c.mark("lost-good"); await c.hold(3.0);
}
async function s7() {
  c.mark("tab"); await goStep("Evidence"); await c.hold(1.2);
  for (let i = 0; i < D.EVIDENCE.length; i++) {
    const [t, ty, dt, note] = D.EVIDENCE[i];
    c.mark(`e${i + 1}`);
    await c.click(btn(/\s*Add evidence/).first(), 0.9); await settle();
    const form = page.locator("form, div").filter({ has: lab("Title") }).last();
    await c.type(lab("Title").last(), t, 4, 0.6);
    await c.choose(lab("Type").last(), ty); await c.set(lab("Date").last(), dt); await c.type(lab("Note").last(), note, 5, 0.5);
    await c.click(btn("Done").last(), 0.7); await settle();
  }
  c.mark("list"); await c.top(); await c.scrollBy(300, 1.5); await c.hold(5.0);
}
async function selBox(re) { await c.click(page.getByRole("button", { name: re }).first(), 0.7); await settle(); }
async function s8() {
  c.mark("tab"); await goStep("Cause tree"); await c.hold(1.5);
  c.mark("failure"); await c.scrollBy(180, 1.0);
  await c.type(lab("Failure event text"), D.FAILURE, 4); await c.hold(1.0);
  const made = {};
  for (const [id, parent, type, area, text, status, ev, root] of D.TREE) {
    c.mark(id);
    if (parent === null) { await c.click(btn("Why?").first(), 0.8); }
    else if (parent.startsWith("sib:")) { await selBox(new RegExp("Select cause: " + escapeRe(made[parent.slice(4)].slice(0, 25)))); await c.click(btn("Sibling").first(), 0.8); }
    else { await selBox(new RegExp("Select cause: " + escapeRe(made[parent].slice(0, 25)))); await c.click(btn("Why?").first(), 0.8); }
    await settle();
    await c.type(lab("Cause text"), text, 5, 0.6); made[id] = text;
    await c.click(btn(type, { exact: true }).first(), 0.6); await c.click(btn(area, { exact: true }).first(), 0.6);
    for (const e of ev) await c.click(page.getByRole("checkbox", { name: new RegExp("^E" + e + "\\.") }).first(), 0.5);
    await c.click(btn(status, { exact: true }).first(), 0.6);
    if (root) await c.click(page.getByRole("checkbox", { name: /This is a root cause/ }).first(), 0.6);
    await c.hold(0.8);
  }
  c.mark("whole"); await c.hold(3.0);
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
async function s9() {
  c.mark("tab"); await goStep("Cause tree"); await c.scrollBy(260, 0.8); await c.hold(0.5);
  c.mark("forced"); await selBox(new RegExp("Select cause: " + escapeRe(D.TREE[1][4].slice(0, 25))));
  await c.moveTo(btn("Forced deterioration"), 0.9); await c.hold(1.5); await c.click(btn("Forced deterioration"), 0.6); await c.hold(2.0);
  c.mark("na"); await selBox(new RegExp("Select cause: " + escapeRe(D.TREE[3][4].slice(0, 25)))); await c.click(btn("Not applicable"), 0.9); await c.hold(2.0);
  c.mark("whys"); await c.top(); await c.scrollBy(120, 0.8); await c.click(btn("5 Whys"), 1.0); await c.hold(4.0);
  c.mark("fishbone"); await c.click(btn("Fishbone"), 0.9); await c.hold(4.0);
  c.mark("level"); await c.click(btn("Level", { exact: true }), 0.9); await c.hold(3.0);
  c.mark("back"); await c.click(btn("Tree", { exact: true }).first(), 0.9); await c.hold(1.5);
}
async function s10() {
  await goStep("Cause tree");
  c.mark("coach"); await c.scrollTo(page.getByTestId("ai-card").filter({ hasText: /^Cause coach/ }).first(), 1.6, 100); await c.hold(1.0);
  await selBox(new RegExp("Select cause: " + escapeRe(D.TREE[0][4].slice(0, 25)))); await c.scrollTo(page.getByTestId("ai-card").filter({ hasText: /^Cause coach/ }).first(), 1.0, 100);
  c.mark("coach-run"); await ai(page.getByTestId("coach-node"), "[data-testid=coach-results]");
  c.mark("coach-results"); await c.scrollTo(page.getByTestId("coach-results"), 1.2, 140); await c.hold(6.0);
  c.mark("accept"); await c.click(page.getByTestId("coach-item").first().getByTestId("ai-accept"), 1.0); await c.hold(2.0);
  c.mark("dismiss"); await c.click(page.getByTestId("coach-item").first().getByTestId("ai-dismiss"), 1.0); await c.hold(2.5);
  c.mark("challenge"); await c.scrollTo(page.getByTestId("ai-card").filter({ hasText: /^Challenge my analysis/ }).first(), 1.4, 90); await c.hold(0.6);
  await ai(btn("Challenge my analysis").last(), "[data-testid=challenge-results]");
  c.mark("challenge-results"); await c.scrollTo(page.getByTestId("challenge-results"), 1.2, 140); await c.hold(6.0);
  c.mark("fix");
  await c.scrollTo(page.getByRole("button", { name: /Select cause: Line 3 tray sealer produced/ }).first(), 1.6, 300);
  await selBox(new RegExp("Select cause: " + escapeRe(D.TREE[8][4].slice(0, 25))));
  await c.click(page.getByRole("checkbox", { name: /^E5\./ }).first(), 0.8); await c.click(btn("Verified", { exact: true }).first(), 0.8); await c.hold(4.0);
}
async function s10silent() { // replay without AI: only the Challenge fix
  await goStep("Cause tree"); await selBox(new RegExp("Select cause: " + escapeRe(D.TREE[8][4].slice(0, 25))));
  await c.click(page.getByRole("checkbox", { name: /^E5\./ }).first()); await c.click(btn("Verified", { exact: true }).first());
}
async function s11() {
  c.mark("tab"); await goStep("Actions"); await c.hold(1.5);
  const A = D.ACTIONS, cr = A.corrective;
  c.mark("corrective"); await c.click(btn(/\s*Add corrective action/).first(), 0.9); await settle();
  await fillAction({ ...cr, what: cr.what, kind: null });
  let i = 0;
  for (const p of A.preventive) {
    c.mark(`p${++i}`);
    const rootGroup = page.locator("section, div").filter({ hasText: new RegExp("^.*ROOT") });
    const addBtns = btn(/\s*Add preventive action/);
    const idx = await rootIndex(p.root);
    await c.scrollTo(addBtns.nth(idx), 1.2, 260); await c.click(addBtns.nth(idx), 0.8); await settle();
    await fillAction(p);
  }
  c.mark("plan"); await c.scrollTo(page.getByText("Maintenance plan changes", { exact: true }).first(), 1.6, 110); await c.hold(5.0);
  c.mark("tiles"); await c.top(); await c.scrollBy(240, 1.2); await c.hold(4.0);
}
// root cause order on the Actions step follows the tree order of the four roots
const ROOTS = ["A3", "B3", "C3", "D2"];
async function rootIndex(r) { return ROOTS.indexOf(r); }
async function fillAction(a) {
  const open = page.locator("[data-testid=action-form], form").last();
  await c.type(lab("What will be done?").last(), a.what, 6, 0.7);
  if (a.link) await c.choose(lab("Linked to").last(), a.link);
  if (a.cat) await c.choose(lab("Category").last(), a.cat);
  if (a.task) {
    await c.type(lab("Task description").last(), a.task, 6, 0.6);
    await c.type(lab("Do this every").last(), a.every, 2, 0.6); await c.choose(lab("Interval unit").last(), a.unit);
    await c.type(lab("Craft or trade").last(), a.craft, 4, 0.6); await c.choose(lab("New task or a change?").last(), a.change);
  }
  await c.type(lab("Owner").last(), a.owner, 3, 0.6); await c.set(lab("Due date").last(), a.due);
  if (a.status) await c.choose(lab("Status").last(), a.status);
  await c.type(lab("Cost").last(), a.cost, 2, 0.6);
  await c.click(btn("Close").last(), 0.7); await settle();
}
async function s12() {
  c.mark("tab"); await goStep("Actions");
  const sug = btn("Suggested actions").or(btn(/Suggest actions for this root cause/));
  const idx = 2; const target = btn(/Suggest actions for this root cause/).nth(idx);
  c.mark("suggest"); await c.scrollTo(target, 1.4, 360); await ai(target, "[data-testid=capa-results]");
  c.mark("capa-results"); await c.scrollTo(page.getByTestId("capa-results").first(), 1.0, 200); await c.hold(6.0);
  c.mark("accept"); await c.click(page.getByTestId("capa-item").first().getByTestId("ai-accept"), 1.0); await c.hold(2.0);
  c.mark("dismiss"); await c.click(page.getByTestId("capa-item").first().getByTestId("ai-dismiss"), 1.0); await c.hold(2.0);
  c.mark("fixit");
  const sugRow = page.locator("button").filter({ hasText: /Suggested/ }).filter({ hasText: /\$\d/ }).first();
  await c.scrollTo(sugRow, 1.2, 300); await c.click(sugRow, 0.9); await settle();
  await c.type(lab("Owner").last(), "Lee Tran", 3, 0.6); await c.set(lab("Due date").last(), "2026-12-18"); await c.click(btn("Close").last(), 0.7); await settle(); await c.hold(1.0);
  c.mark("quality"); await c.top(); await c.click(page.locator("button").filter({ hasText: /Quality check/ }).first(), 1.0); await c.hold(5.0);
}
async function s13() {
  c.mark("tab-actions"); await goStep("Actions"); await c.hold(0.8);
  c.mark("done");
  await setAllDone();
  c.mark("verify"); await goStep("Verify"); await c.hold(1.0);
  await c.set(lab("Review date"), D.VERIFY.date); await c.choose(lab("Has the failure recurred since the actions were completed?"), D.VERIFY.recurred);
  await c.type(lab(/Expected events per year after/), D.VERIFY.events, 2); await c.set(lab("What did you find?"), D.VERIFY.found); await c.hold(1.0);
  c.mark("result"); await c.scrollTo(page.getByText("The result in money").first(), 1.6, 120); await c.hold(8.0);
  c.mark("rollout"); await c.scrollTo(page.getByText("Roll out this countermeasure", { exact: false }).first(), 1.6, 100); await c.hold(2.0);
  await rollout();
}
async function setAllDone() {
  const open = page.locator("button").filter({ hasText: /(Open|In progress)\s*\$\d/ });
  for (let g = 0; g < 12 && (await open.count()) > 0; g++) {
    await c.click(open.first(), 0.5); await settle();
    await c.choose(lab("Status").last(), "Done"); await c.click(btn("Close").last(), 0.5); await settle();
  }
}
async function rollout() {
  const tagField = page.getByLabel("Tag of the similar asset");
  const addAnother = btn(/Add a similar asset that is not listed/);
  for (let i = 0; i < D.ROLL.tags.length; i++) {
    if (i > 0) { await addAnother.first().waitFor({ state: "visible", timeout: 10000 }); await page.waitForTimeout(500); await c.click(addAnother.first(), 0.9); await page.waitForTimeout(700); }
    await tagField.waitFor({ state: "visible", timeout: 10000 });
    await c.type(tagField, D.ROLL.tags[i], 2); await c.type(page.getByLabel("Its duty or service"), D.ROLL.duty, 3);
    await c.click(btn(/Add to the register/).last(), 0.8); await page.waitForTimeout(800); await c.hold(0.6);
  }
  c.mark("create");
  await page.waitForTimeout(900);
  for (const tag of D.ROLL.tags) { const cb = page.locator("label, li, div").filter({ hasText: new RegExp("^\\s*" + tag) }).getByRole("checkbox").first(); if (!(await cb.isChecked())) await c.click(cb, 0.6); await page.waitForTimeout(300); }
  await c.click(btn(/Create \d rollout check/), 1.0); await page.waitForTimeout(900); await c.hold(1.5);
  c.mark("owners");
  const who = page.getByLabel(/Who will check/), due = page.getByLabel(/Check due/);
  const nw = await who.count().catch(() => 0);
  for (let i = 0; i < nw; i++) { await c.type(who.nth(i), D.ROLL.who, 3, 0.6); await c.set(due.nth(i), D.ROLL.due); }
  console.log("rollout owner fields", nw);
  await c.hold(3.0);
}
async function s14() {
  c.mark("tab"); await goStep("Report"); await c.hold(1.5);
  c.mark("note"); await c.type(lab(/Anything to add/), D.AUDIENCE, 3);
  if (!c.rec) return;
  c.mark("summary"); await ai(btn(/Management summary/), "[data-testid=draft-doc]");
  c.mark("draft"); await c.scrollTo(page.getByTestId("draft-doc"), 1.4, 140); await c.hold(6.0);
  c.mark("edit"); const f = page.getByTestId("draft-doc").locator("textarea").nth(1); await c.click(f, 0.9); await page.keyboard.press("End"); await page.keyboard.type(" Checked against the evidence."); await c.hold(2.0);
  c.mark("print"); await c.scrollTo(btn(/Print this draft/), 1.2, 400); await c.hold(3.0);
}
async function s15() {
  c.mark("tab"); await goStep("Cause tree"); await c.scrollBy(260, 1.0); await c.hold(6.0);
  await goStep("Verify"); c.mark("saving"); await c.scrollTo(page.getByText("The result in money").first(), 1.4, 120); await c.hold(9.0);
  c.mark("dash"); await page.goto(`${BASE}/app`, { waitUntil: "networkidle" }); await page.waitForTimeout(1500); await c.hold(8.0);
}

const SEQ = { 4: s4, 5: s5, 6: s6, 7: s7, 8: s8, 9: s9, 10: s10, 11: s11, 12: null, 13: s13, 14: s14, 15: s15 };
await run(0, async () => {
  if (N === 3) {
    // 3a: anonymous browser: landing page -> create-account form (never submitted), 3b: prepared empty dashboard -> New investigation
    const anon = await launch();
    await anon.page.goto(process.env.DEMO_SHARE, { waitUntil: "networkidle" });
    await anon.page.goto(`${BASE}/`, { waitUntil: "networkidle" }); await anon.page.waitForTimeout(1200);
    const a = new Ctx(anon.page, S); a.startRecording("3a");
    a.mark("landing"); await a.hold(3.5);
    const link = anon.page.getByRole("link", { name: /Create account|Sign up|Get started|Try it/i }).first();
    a.mark("signup"); await a.click(link, 1.2); await anon.page.waitForLoadState("networkidle"); await anon.page.waitForTimeout(800); await a.hold(1.0);
    a.mark("form");
    await a.type(anon.page.getByLabel("Email"), "name@yourcompany.com", 2);
    await a.type(anon.page.getByLabel("Password", { exact: true }), "examplepassword", 2);
    await a.type(anon.page.getByLabel(/Confirm password/), "examplepassword", 2); await a.hold(3.5);
    const secA = await a.finish(OUT, "3a"); console.log("scene 3a", secA);
    await anon.browser.close();
    c.startRecording("3b"); await s3b(); const secB = await c.finish(OUT, "3b"); console.log("scene 3b", secB);
    const { execFileSync } = await import("node:child_process");
    fs.writeFileSync(`${S}/c3.txt`, `file '${OUT}/scene3a.mp4'\nfile '${OUT}/scene3b.mp4'\n`);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", `${S}/c3.txt`, "-c:v", "libx264", "-crf", "14", "-pix_fmt", "yuv420p", "-r", "30", `${OUT}/scene3.mp4`]);
    const ma = JSON.parse(fs.readFileSync(`${OUT}/scene3a.marks.json`)), mb = JSON.parse(fs.readFileSync(`${OUT}/scene3b.marks.json`));
    fs.writeFileSync(`${OUT}/scene3.marks.json`, JSON.stringify({ seconds: ma.seconds + mb.seconds, marks: [...ma.marks, ...mb.marks.map((m) => ({ ...m, t: +(m.t + ma.seconds).toFixed(2) }))] }));
    return;
  }
  await s3b0();
  for (let k = 4; k < N; k++) { if (k === 10) await s10silent(); else if (SEQ[k]) await run(k, SEQ[k]); }
  c.startRecording(N);
  await run(N, N === 12 ? s12 : SEQ[N]);
  const sec = await c.finish(OUT, N); console.log("scene", N, "done", sec, "s");
});
async function s3b0() { // silent: dashboard -> new investigation
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" }); await page.waitForTimeout(1500);
  await btn(/New investigation/).first().click(); await page.waitForURL(/investigations/); await page.waitForLoadState("networkidle"); await page.waitForTimeout(1500);
}
await browser.close();
