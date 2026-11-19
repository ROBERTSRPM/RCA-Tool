// A04 resilience + A05 clickjacking, as user B. Inserts two hostile rows, observes /app, deletes them.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const BASE = 'https://rca-tool-omega.vercel.app', API = 'https://ccigtztlrvgkzyppjmxt.supabase.co';
const KEY = 'sb_publishable_QkpZg53OX_eAMLJj4Ezjjw_SHOgUZ3D', EMAIL = 'qa-user-b@rca-tool.test', PW = require('fs').readFileSync(process.env.QA_PW_FILE || (()=>{throw new Error('set QA_PW_FILE')})(), 'utf8').trim();
function curl(method, url, headers, body) {
  const a = ['-s', '-w', '\n%{http_code}', '-X', method];
  for (const [k, v] of Object.entries(headers)) a.push('-H', `${k}: ${v}`);
  if (body) a.push('--data-binary', '@-');
  a.push(url);
  const out = execFileSync('curl', a, { input: body || '', maxBuffer: 1 << 28 }).toString();
  const i = out.lastIndexOf('\n'); return { status: +out.slice(i + 1), body: out.slice(0, i) };
}
(async () => {
  const t = JSON.parse(curl('POST', `${API}/auth/v1/token?grant_type=password`, { apikey: KEY, 'Content-Type': 'application/json' }, JSON.stringify({ email: EMAIL, password: PW })).body).access_token;
  const H = { apikey: KEY, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
  const browser = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } });
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  await page.goto(BASE + '/login'); await page.getByLabel(/email/i).fill(EMAIL); await page.getByLabel(/password/i).fill(PW);
  await page.getByRole('button', { name: /sign in|log in/i }).click(); await page.waitForURL('**/app**'); await page.waitForTimeout(2500);
  const base = await page.evaluate(() => document.body.innerText.length);
  console.log('baseline /app body text length', base);

  console.log('\n## A: row whose data is not an investigation ({}), user-controllable via REST');
  console.log('insert', curl('POST', `${API}/rest/v1/investigations`, H, JSON.stringify({ id: 't-bad-1', data: {} })).status);
  await page.goto(BASE + '/app'); await page.waitForTimeout(3500);
  console.log('page errors:', JSON.stringify(errs.slice(0, 3)));
  console.log('body text (first 200):', JSON.stringify((await page.evaluate(() => document.body.innerText)).slice(0, 200)));
  console.log('sample card visible:', await page.getByText(/sample|illustrative/i).count());
  console.log('cleanup', curl('DELETE', `${API}/rest/v1/investigations?id=eq.t-bad-1`, H).status);

  console.log('\n## B: one 8 MB row, time to load /app');
  const big = JSON.stringify({ id: 't-big-8', data: { blob: 'A'.repeat(8 * 1024 * 1024) } });
  console.log('insert', curl('POST', `${API}/rest/v1/investigations`, H, big).status);
  const t0 = Date.now(); await page.goto(BASE + '/app'); await page.waitForTimeout(500);
  await page.waitForFunction(() => !document.querySelector('[aria-busy=true]'), null, { timeout: 60000 }).catch(() => {});
  console.log('ms until app idle:', Date.now() - t0, '| page errors:', JSON.stringify(errs.slice(-2)));
  console.log('cleanup', curl('DELETE', `${API}/rest/v1/investigations?id=eq.t-big-8`, H).status);

  console.log('\n## C: clickjacking, framing the live site from a foreign origin');
  const p2 = await ctx.newPage();
  await p2.setContent(`<iframe id=f src="${BASE}/login" width=800 height=600></iframe>`);
  await p2.waitForTimeout(4000);
  const fr = p2.frames().find((f) => f.url().startsWith(BASE));
  console.log('frame loaded from site inside foreign page:', !!fr, fr ? '| title: ' + (await fr.title()) : '');
  await browser.close();
  console.log('remaining rows:', curl('GET', `${API}/rest/v1/investigations?select=id`, H).body);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
