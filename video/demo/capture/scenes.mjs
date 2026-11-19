// Usage: node scenes.mjs prep | 1..8   (env: SCRATCH, DEMO_BASE, DEMO_SHARE; state.json from login)
import fs from "node:fs";
import path from "node:path";
import { launch, Recorder, BASE } from "./lib.mjs";
import { installMockAi } from "./mockai.mjs";
const S = process.env.SCRATCH;
const OUT = process.env.CLIPS || path.join(S, "clips");
fs.mkdirSync(OUT, { recursive: true });
const arg = process.argv[2];
const { browser, context, page } = await launch(`${S}/state.json`);
if (process.env.DEMO_MOCK_AI === "1") await installMockAi(page);
const rec = (n) => new Recorder(page, path.join(S, "frames"), `scene${n}`);
const step = (name) => page.getByRole("tab", { name: new RegExp(name) }).or(page.getByRole("button", { name: new RegExp("^\\d?\\s*" + name) })).first();
const open = async () => {
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Open", exact: true }).first().click();
  await page.waitForURL(/investigations/); await page.waitForLoadState("networkidle"); await page.waitForTimeout(800);
};
const goStep = async (r, name) => { await r.click(step(name), 0.9); await r.hold(0.4); await page.evaluate(() => window.scrollTo(0, 0)); };
// AI call: click, then cut the wait out of the recording
const ai = async (r, btn, resultSel) => {
  await r.click(btn, 0.9);
  r.stop();
  try { await page.locator(resultSel).first().waitFor({ state: "visible", timeout: 120000 }); }
  catch { console.log("AI result timeout for", resultSel, await page.locator('[data-testid=ai-error]').allTextContents()); }
  await page.waitForTimeout(500);
  r.start(); await r.hold(0.3);
};

if (arg === "prep") {
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /reset sample/i }).click();
  await page.getByRole("button", { name: "Reset sample", exact: true }).click();
  await page.waitForTimeout(2500);
  console.log("reset done");
} else {
  const n = +arg; const r = rec(n);
  if (n === 1) {
    await page.goto(`${BASE}/app`, { waitUntil: "networkidle" }); await page.waitForTimeout(800);
    r.start(); await r.hold(2.5);
    await r.move(300, 300, 1.2); await r.hold(0.5);
    await r.moveTo(page.getByText("Repeat bearing and mechanical seal failures").first(), 1.2, 0.3); await r.hold(2.5);
    await r.moveTo(page.getByText("VERIFIED ANNUAL SAVINGS", { exact: false }).first(), 1.0); await r.hold(2);
  } else {
    await open();
    r.start();
    if (n === 2) {
      await r.hold(1.5); r.mark("problem");
      await r.move(500, 230, 1.0); await r.hold(1.5);
      await r.scroll(500, 2.0); await r.hold(1.5);
      await r.scroll(-500, 1.2);
      await goStep(r, "Loss"); r.mark("loss");
      await r.move(560, 600, 1.2); await r.hold(1.0);
      const box = page.getByText("Annual loss", { exact: true }).first(); await r.scrollToEl(box, 1.4, 470); await r.moveTo(box, 1.0, 0.3); r.mark("annual-loss"); await r.hold(3.5);
    }
    if (n === 3) {
      await goStep(r, "Evidence"); await r.hold(1.5);
      await r.move(700, 420, 1.0); await r.hold(1.0);
      await r.scroll(450, 2.5); await r.hold(1.5);
      await r.move(700, 500, 1.0); await r.hold(1.5);
      await r.scroll(400, 2.0); await r.hold(2.0);
    }
    if (n === 4) {
      await goStep(r, "Cause tree"); r.mark("tree"); await r.hold(1.5);
      await r.scroll(330, 1.4);
      // pan the tree sideways to reveal human and system levels
      const pan = async (dx, sec) => {
        const x0 = await page.evaluate(() => { const el = window.__pan = [...document.querySelectorAll("*")].find(e => e.scrollWidth > e.clientWidth + 50 && /auto|scroll/.test(getComputedStyle(e).overflowX) && e.textContent.includes("Why?")); return el ? el.scrollLeft : 0; });
        const steps = Math.round(sec * 30);
        for (let i = 1; i <= steps; i++) { const t = i / steps, e = t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; await page.evaluate((x) => window.__pan && (window.__pan.scrollLeft = x), x0 + dx * e); await r.cur(); await r.shot(); }
      };
      await r.move(900, 500, 0.8); await pan(500, 2.5); r.mark("levels"); await r.hold(2.0);
      await pan(-500, 1.5);
      await r.scrollToEl(page.getByText("Cause coach", { exact: true }).first(), 1.8, 90); r.mark("coach"); await r.hold(1.2);
      await ai(r, page.getByTestId("coach-node"), "[data-testid=coach-results]"); r.mark("coach-results");
      await r.scrollToEl(page.getByTestId("coach-results"), 1.2, 140); await r.hold(2.5);
      const accBtn = page.getByTestId("ai-accept").nth(3);
      await r.scrollToEl(accBtn, 1.4, 360); await r.hold(1.0);
      await r.click(accBtn, 1.2); r.mark("accepted"); await r.hold(1.5);
      await r.click(page.getByTestId("ai-dismiss").first(), 1.0); r.mark("dismissed"); await r.hold(1.2);
      await r.scrollToEl(page.getByText("Challenge my analysis", { exact: true }).first(), 1.5, 90); await r.hold(0.8);
      await ai(r, page.getByRole("button", { name: "Challenge my analysis" }).first(), "[data-testid=challenge-results]"); r.mark("challenge-results");
      await r.scrollToEl(page.getByTestId("challenge-results"), 1.2, 140); await r.hold(3.0);
    }
    if (n === 5) {
      await goStep(r, "Actions"); await r.hold(1.2);
      await r.move(700, 400, 1.0);
      await r.scroll(330, 1.8); r.mark("actions"); await r.hold(2.0);
      const sug = page.getByRole("button", { name: "Suggest actions for this root cause" }).first();
      await r.scrollToEl(sug, 1.2, 420);
      await ai(r, sug, "[data-testid=capa-results]"); r.mark("suggested");
      await r.scrollToEl(page.getByTestId("capa-results"), 1.0, 200); await r.hold(2.5);
      await r.click(page.getByTestId("ai-accept").first(), 1.2); r.mark("accepted"); await r.hold(1.5);
      await r.scrollToEl(page.getByText("Maintenance plan changes", { exact: true }).first(), 2.2, 110); r.mark("plan"); await r.hold(4.0);
      await r.scroll(420, 1.8); r.mark("spares"); await r.hold(2.5);
    }
    if (n === 6) {
      await goStep(r, "Verify"); await r.hold(1.5);
      await r.move(700, 500, 1.0);
      await r.scroll(480, 2.0); r.mark("result"); await r.hold(3.0);
      await r.scrollToEl(page.getByText("Roll this fix out", { exact: true }).first(), 2.0, 100); r.mark("rollout"); await r.hold(2.0);
      const cbs = page.getByRole("checkbox");
      await r.click(cbs.first(), 1.2); await r.hold(1.0);
      await r.click(cbs.nth(1), 0.8); await r.hold(2.5);
    }
    if (n === 7) {
      await goStep(r, "Report"); await r.hold(1.5);
      await r.move(900, 450, 1.0);
      await r.scroll(160, 1.2); r.mark("report-ai");
      await ai(r, page.getByRole("button", { name: /Management summary/ }), "[data-testid=draft-doc]"); r.mark("summary");
      await r.scrollToEl(page.getByTestId("draft-doc"), 1.2, 140); await r.hold(2.5);
      await r.scroll(420, 2.5); await r.hold(2.5);
    }
    if (n === 8) {
      await goStep(r, "Cause tree"); await r.hold(1.5);
      await r.move(900, 520, 1.0);
      const pn = page.getByText("Hypothesis").first();
      if (await pn.count()) { await r.moveTo(pn, 1.2); }
      await r.hold(4.0);
    }
  }
  r.stop();
  const out = await r.finish();
  fs.copyFileSync(out, path.join(OUT, path.basename(out)));
  fs.copyFileSync(out.replace(".mp4", ".marks.json"), path.join(OUT, `scene${n}.marks.json`));
  console.log("scene", n, "done", JSON.parse(fs.readFileSync(out.replace(".mp4", ".marks.json"))).seconds, "s");
}
await browser.close();
