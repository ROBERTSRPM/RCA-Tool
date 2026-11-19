// Tiny test harness shared by all suites. Results are appended to results/<suite>.json
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE = (process.env.BASE_URL || 'http://localhost:3555').replace(/\/$/, '');
const PASSWORD = process.env.QA_PASSWORD;
if (!PASSWORD) {
  console.error('QA_PASSWORD is not set. Export the QA test accounts\' password first, e.g.:\n  QA_PASSWORD=\'...\' BASE_URL=http://localhost:3555 node run-all.js');
  process.exit(1);
}
const USER_A = 'qa-user-a@rca-tool.test';
const USER_B = 'qa-user-b@rca-tool.test';
const SHOTS = path.join(__dirname, 'shots');
const RESULTS = path.join(__dirname, 'results');
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(RESULTS, { recursive: true });

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 375, height: 812 };

const tests = [];
const notes = []; // non-pass/fail observations (timings, inventory rows)
function test(id, title, fn) { tests.push({ id, title, fn }); }
function note(kind, text, data) { notes.push({ kind, text, data }); console.log(`  [${kind}] ${text}`, data ?? ''); }

function eq(actual, expected, msg) {
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(`${msg || 'values differ'}: expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
}
function ok(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

async function run(suite, { only } = {}) {
  const browser = await chromium.launch();
  const out = [];
  for (const t of tests) {
    if (only && !t.id.startsWith(only)) continue;
    const t0 = Date.now();
    let status = 'pass', detail = '';
    // sub(): records an independent pass/fail row from inside a test and keeps going
    const sub = async (sid, stitle, fn) => {
      let st = 'pass', d = '';
      try { await fn(); } catch (e) { st = 'fail'; d = String(e && e.message || e).split('\n').slice(0, 6).join(' | '); }
      out.push({ id: t.id + '.' + sid, title: stitle, status: st, detail: d, ms: 0 });
      console.log(`  ${st === 'pass' ? 'pass' : 'FAIL'} ${t.id}.${sid} ${stitle}${d ? '\n       ' + d : ''}`);
    };
    try { await t.fn({ browser, sub }); }
    catch (e) { status = 'fail'; detail = String(e && e.message || e).split('\n').slice(0, 6).join(' | '); }
    out.push({ id: t.id, title: t.title, status, detail, ms: Date.now() - t0 });
    console.log(`${status === 'pass' ? 'PASS' : 'FAIL'} ${t.id} ${t.title}${detail ? '\n     ' + detail : ''}`);
  }
  await browser.close();
  fs.writeFileSync(path.join(RESULTS, suite + '.json'), JSON.stringify({ suite, base: BASE, at: new Date().toISOString(), results: out, notes }, null, 2));
  const f = out.filter(r => r.status === 'fail').length;
  console.log(`\n${suite}: ${out.length - f}/${out.length} passed, ${f} failed`);
  return f;
}

// ---- page helpers
async function newPage(browser, { viewport = DESKTOP, storageState, offline } = {}) {
  const context = await browser.newContext({ viewport, storageState, acceptDownloads: true });
  const page = await context.newPage();
  page.errs = [];
  // QA_LOCAL_SIGNOUT=1: turn the app's global sign-out into a local one, so a test run never revokes
  // the sessions of the shared QA accounts (someone else may be using them).
  if (process.env.QA_LOCAL_SIGNOUT) {
    await context.route('**/auth/v1/logout*', (route) => {
      const u = new URL(route.request().url()); u.searchParams.set('scope', 'local'); route.continue({ url: u.toString() });
    });
  }
  // round 3: every Content-Security-Policy violation is logged as a console error, so it counts as a failure everywhere errs is asserted
  await page.addInitScript(() => { document.addEventListener('securitypolicyviolation', (e) => console.error('CSP violation: ' + e.violatedDirective + ' blocked ' + e.blockedURI + ' at ' + (e.sourceFile || '') + ':' + (e.lineNumber || ''))); });
  page.fails = [];
  page.on('console', m => { if (m.type() === 'error') page.errs.push(m.text()); });
  page.on('pageerror', e => page.errs.push('pageerror: ' + e.message));
  page.on('requestfailed', r => {
    // aborted Next.js RSC prefetches are benign (navigation cancelled them)
    if (/_rsc=/.test(r.url()) && /ABORTED/.test(r.failure()?.errorText || '')) return;
    page.fails.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`);
  });
  page.on('response', r => { if (r.status() >= 400) page.fails.push(`${r.status()} ${r.request().method()} ${r.url()}`); });
  return page;
}
async function shot(page, name) {
  const p = path.join(SHOTS, name.replace(/[^a-z0-9._-]/gi, '_') + '.png');
  await page.screenshot({ path: p, fullPage: true });
  return p;
}
async function overflowX(page) {
  return page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
}

// ---- app helpers
const STEP_LABELS = ['Problem', 'Loss', 'Evidence', 'Cause tree', 'Actions', 'Verify', 'Report'];
async function step(page, label) {
  await page.locator('nav[aria-label="Investigation steps"]').getByRole('button', { name: new RegExp('^\\s*(\\d+|)\\s*' + label) }).click();
  await page.waitForTimeout(150);
}
async function settle(page) { // wait for autosave indicator
  await page.getByText('All changes saved').waitFor({ timeout: 15000 });
}
async function waitSaved(page) {
  await page.waitForTimeout(700);
  await settle(page);
}
async function demoNew(page) {
  await page.goto(BASE + '/app');
  await page.getByRole('button', { name: 'New investigation' }).click();
  await page.waitForURL(/\/app\/investigations\/[^/]+/);
  await page.getByRole('heading', { name: 'New investigation', level: 1 }).waitFor();
  return page.url().split('/').pop().split('#')[0];
}
async function login(page, email, pw = PASSWORD) {
  await page.goto(BASE + '/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(pw);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(/\/app/, { timeout: 20000 });
}
async function loginState(browser, email) {
  const page = await newPage(browser);
  await login(page, email);
  await page.getByRole('heading', { name: 'Investigations', level: 1 }).waitFor();
  const st = await page.context().storageState();
  await page.context().close();
  return st;
}
async function withPage(browser, opts, fn) {
  const page = await newPage(browser, opts);
  try {
    const r = await fn(page);
    // round 3: any Content-Security-Policy violation seen during a test is a failure of that test
    const csp = page.errs.filter(x => /CSP violation|Content Security Policy|Refused to (apply|load|execute|connect|frame)/i.test(x));
    if (csp.length) throw new Error('CSP violations during test: ' + csp.slice(0, 3).join(' || '));
    return r;
  } finally { await page.context().close().catch(() => {}); }
}
const money = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');

module.exports = { withPage, BASE, PASSWORD, USER_A, USER_B, SHOTS, DESKTOP, MOBILE, test, note, eq, ok, run, newPage, shot, overflowX, step, settle, waitSaved, demoNew, login, loginState, money, STEP_LABELS };
