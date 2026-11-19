// A07: post-login `next` redirect. Requests to the attacker host are ABORTED in the browser (never sent), we only
// record where the app tried to navigate.
const { chromium } = require('playwright');
const BASE = 'https://rca-tool-omega.vercel.app', EMAIL = 'qa-user-b@rca-tool.test', PW = require('fs').readFileSync(process.env.QA_PW_FILE || (()=>{throw new Error('set QA_PW_FILE')})(), 'utf8').trim();
const CASES = ['//evil.example.com', '/\\evil.example.com', 'https://evil.example.com', '/%09/evil.example.com', '/\t/evil.example.com', '/\n/evil.example.com', '/%2f/evil.example.com', '/app'];
(async () => {
  const browser = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } });
  for (const n of CASES) {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    const hits = [];
    await page.route(/^https?:\/\/evil\.example\.com/, (r) => { hits.push(r.request().url()); r.abort(); });
    await page.goto(BASE + '/login?next=' + encodeURIComponent(n));
    await page.getByLabel(/email/i).fill(EMAIL); await page.getByLabel(/password/i).fill(PW);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await page.waitForTimeout(4000);
    console.log(JSON.stringify(n).padEnd(34), '-> final url:', page.url().replace(BASE, '<site>'), '| attacker-host navigation attempted:', hits.length ? hits[0] : 'no');
    await ctx.close();
  }
  await browser.close();
})();
