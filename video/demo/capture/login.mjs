// Signs in once and saves the browser session to $SCRATCH/state-b.json (never committed).
import fs from "node:fs";
import { launch, login } from "./lib.mjs";
const S = process.env.SCRATCH;
const { browser, context, page } = await launch();
await login(page, process.env.DEMO_USER || "qa-user-b@rca-tool.test", fs.readFileSync(`${S}/qa_password.txt`, "utf8").trim());
await page.waitForTimeout(1500);
await page.screenshot({ path: `${S}/live-dash.png` });
await context.storageState({ path: `${S}/state-b.json` });
console.log(page.url());
await browser.close();
