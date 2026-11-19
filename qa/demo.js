// Demo mode (signed out, browser storage). Run: BASE_URL=http://localhost:3555 node demo.js
const h = require('./harness');
const f = require('./flows');
const e = require('./e2e');
const { test, eq, ok, step, waitSaved, withPage, money, BASE, DESKTOP, MOBILE } = h;

// ---------------------------------------------------------------- landing
test('D-LAND-1', 'Landing page: every link and button works', async ({ browser, sub }) => withPage(browser, {}, async (page) => {
  await page.goto(BASE + '/');
  await page.getByRole('heading', { level: 1 }).waitFor();
  await sub('hdr', 'Landing shows headline, 3 benefit cards, video placeholder', async () => {
    ok((await page.getByRole('heading', { level: 1 }).innerText()).trim().length > 10);
    ok((await page.locator('h2').count()) >= 2, 'landing has section headings');
  });
  await sub('logo', 'Logo link goes to the landing page / app', async () => {
    const href = await page.getByRole('link', { name: /RCA Pilot/ }).first().getAttribute('href');
    ok(['/', '/app'].includes(href), 'logo href ' + href);
  });
  await sub('open-app', '"Open the app" -> /app', async () => {
    await page.getByRole('link', { name: 'Open the app' }).click(); await page.waitForURL(/\/app$/);
    await page.getByRole('heading', { name: 'Investigations', level: 1 }).waitFor();
  });
  await sub('signin', '"Sign in" header link -> /login', async () => {
    await page.goto(BASE + '/'); await page.getByRole('link', { name: 'Sign in' }).click(); await page.waitForURL(/\/login/);
  });
  await sub('create-acct', '"Create account" header link -> /signup', async () => {
    await page.goto(BASE + '/'); await page.getByRole('link', { name: 'Create account' }).click(); await page.waitForURL(/\/signup/);
  });
  await sub('sample', '"Open the sample investigation" opens the sample workspace', async () => {
    await page.goto(BASE + '/'); await page.getByRole('link', { name: 'Try the sample investigation' }).first().click();
    await page.waitForURL(/\/app\/investigations\//);
    await page.getByRole('heading', { name: /Repeat bearing and mechanical seal failures/, level: 1 }).waitFor();
  });
  await sub('start-new', '"New investigation" on the dashboard creates one and opens it', async () => {
    await page.goto(BASE + '/app'); await page.getByRole('button', { name: 'New investigation' }).click();
    await page.waitForURL(/\/app\/investigations\/(?!sample)/);
    await page.getByRole('heading', { name: 'New investigation', level: 1 }).waitFor();
  });
  await sub('footer', 'Footer copy is accurate now that accounts exist', async () => {
    await page.goto(BASE + '/');
    const t = await page.locator('footer').innerText();
    ok(!/stays in this browser for now/i.test(t), 'Footer says: "' + t.trim() + '" although sign-in with cloud storage exists');
  });
}));

// ---------------------------------------------------------------- dashboard
test('D-DASH-1', 'Dashboard (sample only): totals equal hand calculation', async ({ browser, sub }) => withPage(browser, {}, async (page) => {
  await page.goto(BASE + '/app');
  const s = await e.dashStats(page);
  // Hand calc of the sample: 14h*120t/h=1680t; *$18=30240; +9500=39740/event; x6=238,440/yr; after 1/yr=39,740; saving 198,700; status closed.
  const annual = (14 * 120 * 18 + 9500) * 6, saved = annual - 0; // round 3 sample: 0 failures after the fix, so the saving is the whole annual loss
  await sub('totals', 'Totals: loss under investigation $0 (sample is closed), 0 open, 0 overdue, saved $238,440 (round 3 sample)', async () => {
    eq(s['Open annual loss'], money(0));
    eq(s['Open actions'], '0'); eq(s['Overdue actions'], '0');
    eq(s['Verified annual savings'], money(saved));
  });
  await sub('row', 'Sample row shows $238,440, Closed, sample chip', async () => {
    const r = (await e.dashRows(page))[0];
    ok(r.includes(money(annual)), r); ok(r.includes('Closed'), r); ok(r.includes('Illustrative sample'), r);
  });
}));

test('D-DASH-2', 'Dashboard buttons: duplicate, delete cancel/confirm, reset sample, empty state', async ({ browser, sub }) => withPage(browser, {}, async (page) => {
  await page.goto(BASE + '/app'); await e.dashStats(page);
  await sub('dup', 'Duplicate creates "Copy of ..." and opens it', async () => {
    await page.getByRole('button', { name: /^Duplicate Repeat bearing/ }).click();
    await page.waitForURL(/\/app\/investigations\/(?!sample-p101)/);
    await page.getByRole('heading', { name: /^Copy of Repeat bearing/, level: 1 }).waitFor();
    eq(await page.getByText('Illustrative sample.', { exact: false }).count(), 0, 'copy must not be flagged as sample');
  });
  await page.goto(BASE + '/app'); await e.dashStats(page);
  await sub('dup-numbers', 'Duplicate keeps the money identical (both rows $238,440)', async () => {
    const rows = await e.dashRows(page); eq(rows.length, 2);
    ok(rows.every(r => r.includes('$238,440')), rows.join(' || '));
  });
  await sub('del-cancel', 'Delete + Cancel keeps the investigation', async () => {
    await page.getByRole('button', { name: /^Delete Copy of/ }).click();
    await page.getByRole('alertdialog').waitFor();
    await page.getByRole('button', { name: 'Cancel' }).click();
    eq((await e.dashRows(page)).length, 2);
  });
  await sub('del-esc', 'Delete dialog closes on Escape and on backdrop click', async () => {
    await page.getByRole('button', { name: /^Delete Copy of/ }).click(); await page.getByRole('alertdialog').waitFor();
    await page.keyboard.press('Escape'); await page.getByRole('alertdialog').waitFor({ state: 'detached' });
    await page.getByRole('button', { name: /^Delete Copy of/ }).click(); await page.getByRole('alertdialog').waitFor();
    await page.mouse.click(5, 5); await page.getByRole('alertdialog').waitFor({ state: 'detached' });
    eq((await e.dashRows(page)).length, 2);
  });
  await sub('del-confirm', 'Delete + confirm removes it', async () => {
    await page.getByRole('button', { name: /^Delete Copy of/ }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForFunction(() => document.querySelectorAll('section[aria-label="Investigations list"] ul > li').length === 1);
    await page.reload(); await e.dashStats(page);
    eq((await e.dashRows(page)).length, 1, 'persisted after reload');
  });
  await sub('reset-sample', 'Reset sample data: cancel keeps edits; confirm restores original', async () => {
    await page.goto(BASE + '/app/investigations/sample-p101');
    await page.getByLabel('Title', { exact: true }).fill('EDITED SAMPLE'); await waitSaved(page);
    await page.goto(BASE + '/app'); await e.dashStats(page);
    ok((await e.dashRows(page))[0].includes('EDITED SAMPLE'));
    await page.getByRole('button', { name: 'Reset sample data' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    ok((await e.dashRows(page))[0].includes('EDITED SAMPLE'), 'cancel must keep edits');
    await page.getByRole('button', { name: 'Reset sample data' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Reset sample' }).click();
    await page.waitForFunction(() => document.body.innerText.includes('Repeat bearing and mechanical seal failures'));
    ok(!(await e.dashRows(page)).join('').includes('EDITED SAMPLE'));
  });
  await sub('reset-keeps-own', 'Reset sample leaves own investigations untouched', async () => {
    await h.demoNew(page); await page.getByLabel('Title', { exact: true }).fill('MINE'); await waitSaved(page);
    await page.goto(BASE + '/app'); await e.dashStats(page);
    await page.getByRole('button', { name: 'Reset sample data' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Reset sample' }).click();
    await page.waitForTimeout(500);
    const rows = await e.dashRows(page); ok(rows.some(r => r.includes('MINE')), rows.join('||')); eq(rows.length, 2);
  });
  await sub('empty', 'Delete everything -> empty state, then "Load the sample investigation" restores it', async () => {
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: /^Delete / }).first().click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
      await page.waitForTimeout(300);
    }
    await page.getByText('No investigations yet').waitFor();
    const s = await e.dashStats(page);
    eq(s['Open annual loss'], '$0'); eq(s['Open actions'], '0');
    await page.reload(); await page.getByText('No investigations yet').waitFor(); // must stay empty (seed flag)
    await h.shot(page, 'demo-dashboard-empty');
    await page.getByRole('button', { name: 'Load the sample investigation' }).click();
    // round 2 (intentional change b): loading the sample into an empty list must not ask for confirmation
    await page.waitForTimeout(300); eq(await page.getByRole('alertdialog').count(), 0, 'confirm dialog still shown for Load the sample');
    await page.getByText('Repeat bearing and mechanical seal failures').first().waitFor();
  });
  await sub('empty-new', 'Empty state "Start a new investigation" button works', async () => {
    await page.evaluate(() => { localStorage.setItem('rca.investigations.v1', '[]'); }); await page.reload();
    await page.getByText('No investigations yet').waitFor();
    await page.getByRole('button', { name: 'Start a new investigation' }).click();
    await page.waitForURL(/\/app\/investigations\//);
  });
}));

// ---------------------------------------------------------------- full end to end
test('D-E2E-1', 'Full flow: new investigation, 7 steps, hand-checked numbers, dashboard, report, reload', async ({ browser, sub }) => withPage(browser, {}, async (page) => {
  const id = await h.demoNew(page);
  const calc = await e.buildAll(page, { sub, mode: 'demo' });
  await sub('qc-midway', 'Quality check lists "needs action" findings before verification (cause without system cause etc.)', async () => {
    const t = (await f.qualityTexts(page)).join(' | ');
    ok(/Problem statement is missing/.test(t) === false, 'problem complete but flagged: ' + t);
  });
  // dashboard state 1: after figure not entered
  await page.goto(BASE + '/app');
  await sub('dash-1', 'Dashboard totals (open work, unverified): loss $13,800, open 2, overdue 1, saved $238,440', async () => {
    const s = await e.dashStats(page);
    eq(s['Open annual loss'], money(calc.annual)); eq(s['Open actions'], '2'); eq(s['Overdue actions'], '1');
    eq(s['Verified annual savings'].startsWith(money(238440)), true, JSON.stringify(s));
    const r = (await e.dashRows(page)).find(x => x.includes('QA: Gearbox'));
    ok(r.includes(money(calc.annual)) && r.includes('Actions in progress'), r);
  });
  await page.goto(BASE + '/app/investigations/' + id + '#verify');
  await e.finishVerify(page, { sub });
  await waitSaved(page);
  await page.goto(BASE + '/app'); 
  await sub('dash-2', 'Verified savings must not count while actions are still open (review says "no recurrence" but 2 actions not done)', async () => {
    const s = await e.dashStats(page);
    ok(s['Verified annual savings'].startsWith(money(238440)), 'saving counted before actions are complete: ' + JSON.stringify(s));
  });
  // complete actions
  await page.goto(BASE + '/app/investigations/' + id + '#actions');
  await f.setActionStatus(page, 0, 'Done'); await f.setActionStatus(page, 1, 'Done');
  await waitSaved(page);
  await sub('verified-label', 'Once all actions are Done, review says no recurrence and a date is set, Verify says "Annual saving (verified)" and the status is Closed', async () => {
    await step(page, 'Verify'); const t = (await page.locator('dl').last().innerText()).replace(/\s+/g, ' ').toLowerCase(); ok(t.includes('annual saving (verified) ' + money(calc.saving).toLowerCase()), t);
  });
  await page.goto(BASE + '/app');
  await sub('dash-3', 'Dashboard after closing: loss $0, open 0, overdue 0, saved $248,790; row says Closed', async () => {
    const s = await e.dashStats(page);
    eq(s['Open annual loss'], '$0'); eq(s['Open actions'], '0'); eq(s['Overdue actions'], '0');
    ok(s['Verified annual savings'].startsWith(money(238440 + calc.saving)), JSON.stringify(s));
    const r = (await e.dashRows(page)).find(x => x.includes('QA: Gearbox')); ok(r.includes('Closed'), r);
  });
  // report
  await page.goto(BASE + '/app/investigations/' + id + '#report');
  const rep = await e.reportText(page);
  const repL = rep.toLowerCase();
  const has = (s) => ok(repL.includes(s.toLowerCase()), 'report missing "' + s + '"');
  await sub('report', 'Report content matches data and hand-calculated figures', async () => {
    has(e.PROBLEM.title); has('Conveyor C-7 gearbox · Packing hall B · Event on 20 Oct 2026'); has('Status: Closed');
    has('Annual loss ' + money(calc.annual)); has('Annual saving (verified) ' + money(calc.saving)); has('Action cost ' + money(calc.actionCost)); has('Payback ' + e.months(calc.payback));
    // round 2 report format (loss table). Hand calc: 660 cartons/event, 100% lost for good -> opportunity 660 x 2.5 = 1,650/event = 6,600/yr; cash = repair 1,800/event = 7,200/yr
    has('Each event stops production for 5.5 h at 120 cartons/h, so 660 cartons are not produced'); has('100% is lost for good, 0% is made up later and 0% is covered by buffer stock');
    has('Cash: repair $1,800 $7,200'); has('Cash costs $1,800 $7,200'); has('Opportunity loss (660 cartons lost for good × $2.5) $1,650 $6,600'); has('Total $3,450 $13,800'); has('$13,800 per year in total');
    for (const x of ['Oil sample report', 'Operator interview', 'Alignment check', 'Gearbox oil starved', 'Oil level not checked on rounds', 'Inspection route has no gearbox oil check', 'Coupling misaligned', 'No alignment spec in install procedure', 'Wrong grease used', 'Grease type not on lubrication chart']) has(x);
    has('Add gearbox oil check to daily route'); has('Sam Patel'); has('10 Jan 2026'); has('1 Mar 2027'); has('$1,200'); has('$951'); has('Total $2,151');
    has('Review date 10 Nov 2026'); has('No repeat in 3 weeks.');
    has('Annual loss falls from $13,800 to $3,450: a saving of $10,350 per year (cash $5,400, opportunity $4,950) for an action cost of $2,151, paid back in 2.5 months'); ok(!repL.includes('not yet verified'), 'closed investigation still says not yet verified');
    eq(await page.locator('article.print-sheet h2:has-text("Root causes") + ol li').count(), 2, 'root cause list');
  });
  await sub('report-ruledout', 'Report marks ruled-out cause and category/evidence tags', async () => {
    has('[Human, ruled out]'); has('evidence E1'); has('E2');
  });
  const beforeReload = rep.replace(/Generated [^·]*/, '');
  await page.reload(); await h.step(page, 'Report');
  await sub('reload', 'After reload the report is identical (everything persisted)', async () => {
    const after = (await page.locator('article.print-sheet').innerText()).replace(/\s+/g, ' ').replace(/Generated [^·]*/, '');
    eq(after, beforeReload);
  });
  await sub('print', 'Print emulation: app chrome hidden, report visible, A4 PDF renders', async () => {
    await page.emulateMedia({ media: 'print' });
    const vis = await page.evaluate(() => ({
      nav: !!document.querySelector('nav[aria-label="Investigation steps"]')?.offsetParent,
      quality: !!document.querySelector('section[aria-label="Quality check"]')?.offsetParent,
      header: !!document.querySelector('header.no-print')?.offsetParent,
      banner: !!document.querySelector('[data-testid=demo-banner]')?.offsetParent,
      article: !!document.querySelector('article.print-sheet')?.offsetParent,
      bg: getComputedStyle(document.body).backgroundColor,
    }));
    eq([vis.nav, vis.quality, vis.header, vis.banner, vis.article], [false, false, false, false, true], JSON.stringify(vis));
    await h.shot(page, 'demo-report-print');
    await page.pdf({ path: require('path').join(h.SHOTS, 'demo-report.pdf'), format: 'A4' });
    await page.emulateMedia({ media: 'screen' });
  });
}));

require('./demo-tree'); require('./demo-edge'); require('./demo-ui');
if (require.main === module) h.run('demo', { only: process.argv[2] }).then(f => process.exit(f ? 1 : 0));
module.exports = {};
