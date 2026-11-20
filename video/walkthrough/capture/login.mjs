// Sets the preview share cookie (from $DEMO_SHARE, never stored in the repo), signs in, saves the session to $SCRATCH/state-w.json.
import fs from "node:fs";
import { launch, login } from "./lib.mjs";
const S = process.env.SCRATCH;
const { browser, context, page } = await launch();
await page.goto(process.env.DEMO_SHARE, { waitUntil: "networkidle" });
await login(page, "qa-user-b@rca-tool.test", fs.readFileSync(`${S}/qa_password.txt`, "utf8").trim());
await page.waitForTimeout(2000);
await page.screenshot({ path: `${S}/w-dash.png` });
await context.storageState({ path: `${S}/state-w.json` });
console.log(page.url(), await page.locator("main").innerText());
await browser.close();
