import { launch, BASE } from "./lib.mjs";
const S = process.env.SCRATCH;
const { browser, page } = await launch(`${S}/state-w.json`);
await page.goto(`${BASE}/app/investigations/e0f070aa-17da-4f84-926b-af3c8d891228`, { waitUntil: "networkidle" }); await page.waitForTimeout(2500);
const step = (name) => page.getByRole("button", { name: new RegExp("^\\d?\\s*" + name) }).first();
const dump = async (tag) => {
  const items = await page.evaluate(() => [...document.querySelectorAll("input,textarea,select,button")].filter(e=>e.offsetParent).map(e => `${e.tagName.toLowerCase()}${e.type?":"+e.type:""} | ${(e.labels&&e.labels[0]?.innerText||e.getAttribute("aria-label")||e.placeholder||e.innerText||"").replace(/\s+/g," ").slice(0,80)}`).filter(s=>!/^button:submit \| \d |Account menu/.test(s)));
  console.log("== " + tag + "\n" + items.join("\n"));
};
await step("Loss").click(); await page.waitForTimeout(800); await dump("loss");
await step("Evidence").click(); await page.waitForTimeout(800); await page.getByRole("button", { name: /Add evidence/ }).first().click(); await page.waitForTimeout(600); await dump("evidence-form");
await step("Cause tree").click(); await page.waitForTimeout(800); await dump("tree");
await page.getByRole("button", { name: /Why\?/ }).first().click(); await page.waitForTimeout(800); await dump("tree after why");
await step("Actions").click(); await page.waitForTimeout(800); await dump("actions");
await page.getByRole("button", { name: /Add corrective action/ }).first().click(); await page.waitForTimeout(800); await dump("corrective form");
await step("Verify").click(); await page.waitForTimeout(800); await dump("verify");
await step("Report").click(); await page.waitForTimeout(800); await dump("report");
await browser.close();
