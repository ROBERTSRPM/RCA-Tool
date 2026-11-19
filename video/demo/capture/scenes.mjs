// Usage: node scenes.mjs prep | 1..8
// Env: DEMO_BASE (site URL), SCRATCH (holds state-b.json = signed-in session, written by login.mjs), CLIPS (output dir),
//      DEMO_MOCK_AI=1 only to stand in for the AI routes when the account has hit its daily limit.
// Every scene marks the start of each "beat" (r.mark); plan.src.json pins those marks to the voice.
import fs from "node:fs";
import path from "node:path";
import { launch, Recorder, BASE } from "./lib.mjs";
import { installMockAi } from "./mockai.mjs";
const S = process.env.SCRATCH;
const OUT = process.env.CLIPS || path.join(S, "clips");
fs.mkdirSync(OUT, { recursive: true });
const arg = process.argv[2];
const { browser, context, page } = await launch(`${S}/state-b.json`);
if (process.env.DEMO_MOCK_AI === "1") await installMockAi(page);
const rec = (n) => new Recorder(page, path.join(S, "frames"), `scene${n}`);
const step = (name) => page.getByRole("tab", { name: new RegExp(name) }).or(page.getByRole("button", { name: new RegExp("^\\d?\\s*" + name) })).first();
const TITLE = "Repeat bearing and mechanical seal failures on slurry pump P-101";
const open = async () => {
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Open", exact: true }).first().click();
  await page.waitForURL(/investigations/); await page.waitForLoadState("networkidle");
  await page.getByText(TITLE).first().waitFor({ state: "visible", timeout: 30000 });
  await step("Problem").waitFor({ state: "visible" }); await page.waitForTimeout(1500);
};
const goStep = async (r, name) => { await r.click(step(name), 0.9); await r.hold(0.4); await page.evaluate(() => window.scrollTo(0, 0)); };
// AI call: click, dismiss the one-time notice off camera, cut the wait out of the recording
const ai = async (r, btn, resultSel) => {
  await r.click(btn, 0.9);
  r.stop();
  const gotIt = page.getByRole("button", { name: "Got it" });
  try { await gotIt.waitFor({ state: "visible", timeout: 2500 }); await gotIt.click(); } catch {}
  try { await page.locator(resultSel).first().waitFor({ state: "visible", timeout: 150000 }); }
  catch { console.log("AI result timeout", resultSel, await page.locator("[data-testid=ai-error]").allTextContents()); }
  await page.waitForTimeout(600);
  r.start(); await r.hold(0.3);
};

if (arg === "prep") {
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /reset sample/i }).click();
  await page.getByRole("button", { name: "Reset sample", exact: true }).click();
  await page.waitForTimeout(3000);
  console.log("reset done");
} else {
  const n = +arg; const r = rec(n);
  if (n === 1) {
    await page.goto(`${BASE}/app`, { waitUntil: "networkidle" }); await page.getByText(TITLE).first().waitFor(); await page.waitForTimeout(1200);
    r.start(); r.mark("dash"); await r.hold(3.0);
    r.mark("row"); await r.move(300, 330, 1.0); await r.moveTo(page.getByText(TITLE).first(), 1.0, 0.3); await r.hold(3.5);
    r.mark("saving"); await r.moveTo(page.getByText("VERIFIED ANNUAL SAVINGS").first(), 1.2); await r.hold(4.0);
  } else {
    await open();
    r.start();
    if (n === 2) {
      r.mark("problem"); await r.move(560, 230, 1.0); await r.hold(2.5);
      r.mark("facts"); await r.scroll(520, 2.0); await r.hold(5.0);
      await r.scroll(-520, 1.0); await r.hold(0.3);
      r.mark("loss"); await r.click(step("Loss"), 1.0); await r.hold(0.4); await page.evaluate(() => window.scrollTo(0, 0)); await r.hold(1.5);
      r.mark("annual"); const box = page.getByText("Annual loss", { exact: true }).first(); await r.scrollToEl(box, 1.6, 470); await r.moveTo(box, 1.0, 0.3); await r.hold(9.0);
    }
    if (n === 3) {
      r.mark("tab"); await r.click(step("Evidence"), 0.9); await r.hold(0.3); await page.evaluate(() => window.scrollTo(0, 0)); await r.hold(2.5);
      r.mark("scroll1"); await r.move(700, 500, 0.8); await r.scroll(450, 2.5); await r.hold(3.0);
      r.mark("scroll2"); await r.scroll(450, 2.5); await r.hold(4.5);
    }
    if (n === 4) {
      r.mark("tab"); await r.click(step("Cause tree"), 0.9); await r.hold(0.3); await page.evaluate(() => window.scrollTo(0, 0)); await r.hold(1.5);
      r.mark("levels"); await r.scroll(330, 1.4);
      const pan = async (dx, sec) => {
        const x0 = await page.evaluate(() => { const el = window.__pan = [...document.querySelectorAll("*")].find(e => e.scrollWidth > e.clientWidth + 50 && /auto|scroll/.test(getComputedStyle(e).overflowX) && e.textContent.includes("Why?")); return el ? el.scrollLeft : 0; });
        const steps = Math.round(sec * 30);
        for (let i = 1; i <= steps; i++) { const t = i / steps, e = t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; await page.evaluate((x) => window.__pan && (window.__pan.scrollLeft = x), x0 + dx * e); await r.cur(); await r.shot(); }
      };
      await r.move(900, 500, 0.8); await pan(500, 2.5); await r.hold(5.0); await pan(-500, 1.2);
      r.mark("coach"); await r.scrollToEl(page.getByText("Cause coach", { exact: true }).first(), 1.8, 90); await r.hold(1.5);
      r.mark("coach-run"); await ai(r, page.getByTestId("coach-node"), "[data-testid=coach-results]");
      r.mark("coach-results"); await r.scrollToEl(page.getByTestId("coach-results"), 1.2, 140); await r.hold(5.0);
      r.mark("challenge"); await r.scrollToEl(page.getByText("Challenge my analysis", { exact: true }).first(), 1.5, 90); await r.hold(0.8);
      await ai(r, page.getByRole("button", { name: "Challenge my analysis" }).first(), "[data-testid=challenge-results]");
      r.mark("challenge-results"); await r.scrollToEl(page.getByTestId("challenge-results"), 1.2, 140); await r.hold(5.0);
      r.mark("back"); await r.scrollToEl(page.getByTestId("coach-results"), 1.4, 140); await r.hold(1.5);
      const items = page.getByTestId("coach-item");
      const sys = items.filter({ hasText: "System" }).first();
      const target = (await sys.count()) ? sys : items.last();
      r.mark("accept"); await r.scrollToEl(target, 1.2, 330); await r.click(target.getByTestId("ai-accept"), 1.0); await r.hold(2.5);
      r.mark("dismiss"); await r.click(page.getByTestId("coach-item").first().getByTestId("ai-dismiss"), 1.0); await r.hold(4.5);
    }
    if (n === 5) {
      r.mark("tab"); await r.click(step("Actions"), 0.9); await r.hold(0.3); await page.evaluate(() => window.scrollTo(0, 0)); await r.hold(1.5);
      r.mark("first"); await r.move(700, 400, 0.8); await r.scroll(330, 1.8); await r.hold(6.0);
      r.mark("plan"); await r.scrollToEl(page.getByText("Maintenance plan changes", { exact: true }).first(), 2.2, 110); await r.hold(3.5);
      r.mark("spares"); await r.scroll(420, 1.8); await r.hold(3.5);
      const sug = page.getByRole("button", { name: "Suggest actions for this root cause" }).first();
      r.mark("suggest"); await r.scrollToEl(sug, 2.4, 420); await ai(r, sug, "[data-testid=capa-results]");
      r.mark("capa-results"); await r.scrollToEl(page.getByTestId("capa-results"), 1.0, 200); await r.hold(5.0);
      r.mark("accept"); await r.click(page.getByTestId("capa-item").first().getByTestId("ai-accept"), 1.2); await r.hold(4.0);
    }
    if (n === 6) {
      r.mark("tab"); await r.click(step("Verify"), 0.9); await r.hold(0.3); await page.evaluate(() => window.scrollTo(0, 0)); await r.hold(2.0);
      r.mark("result"); await r.move(700, 500, 0.8); await r.scroll(480, 2.0); await r.hold(7.0);
      r.mark("rollout"); await r.scrollToEl(page.getByText("Roll this fix out", { exact: true }).first(), 2.0, 100); await r.hold(2.0);
      const cbs = page.getByRole("checkbox");
      r.mark("tick"); await r.click(cbs.first(), 1.2); await r.hold(1.2); await r.click(cbs.nth(1), 0.8); await r.hold(4.5);
    }
    if (n === 7) {
      r.mark("tab"); await r.click(step("Report"), 0.9); await r.hold(0.3); await page.evaluate(() => window.scrollTo(0, 0)); await r.hold(2.0);
      r.mark("ai"); await r.move(900, 450, 0.8); await r.scroll(160, 1.2);
      await ai(r, page.getByRole("button", { name: /Management summary/ }), "[data-testid=draft-doc]");
      r.mark("draft"); await r.scrollToEl(page.getByTestId("draft-doc"), 1.4, 140); await r.hold(5.0);
      r.mark("print"); await r.scroll(420, 2.0); await r.moveTo(page.getByRole("button", { name: /Print this draft/ }), 1.2); await r.hold(5.0);
    }
    if (n === 8) {
      r.mark("tab"); await r.click(step("Cause tree"), 0.9); await r.hold(0.3); await page.evaluate(() => window.scrollTo(0, 0)); await r.hold(2.0);
      r.mark("tree"); await r.move(900, 520, 1.0); await r.scroll(300, 1.5); await r.hold(2.0);
      const pn = page.getByText("Hypothesis").first();
      if (await pn.count()) { await r.moveTo(pn, 1.2); }
      await r.hold(8.0);
    }
  }
  r.stop();
  const out = await r.finish();
  fs.copyFileSync(out, path.join(OUT, path.basename(out)));
  fs.copyFileSync(out.replace(".mp4", ".marks.json"), path.join(OUT, `scene${n}.marks.json`));
  console.log("scene", n, "done", JSON.parse(fs.readFileSync(out.replace(".mp4", ".marks.json"))).seconds, "s");
}
await browser.close();
