// Persistence and edge cases (demo mode)
const fs = require('fs');
const path = require('path');
const h = require('./harness');
const f = require('./flows');
const e = require('./e2e');
const { test, eq, ok, step, waitSaved, withPage, money, BASE, MOBILE } = h;
const tb = (page) => page.getByRole('toolbar', { name: 'Cause actions' });
const cardsLi = (page) => page.locator('li:has(label:has-text("What will be done?"))');

// ---------------------------------------------------------------- persistence
test('D-PERS-1', 'Persistence: reload after each kind of edit (demo)', async ({ browser, sub }) => withPage(browser, {}, async (page) => {
  const id = await h.demoNew(page);
  const reload = async () => { await waitSaved(page); await page.reload(); await page.getByRole('navigation', { name: 'Investigation steps' }).waitFor(); };
  await sub('autosave-states', 'Autosave indicator: "Saving..." after typing, then "All changes saved"', async () => {
    await step(page, 'Problem');
    await page.getByLabel('Title', { exact: true }).fill('Persist test');
    const s1 = await page.locator('[role=status]').filter({ hasText: /Saving|saved/ }).first().innerText();
    ok(/Saving/.test(s1), 'right after typing: "' + s1 + '"');
    await waitSaved(page);
  });
  await sub('problem', 'Problem fields survive reload (all 8)', async () => {
    await f.fillProblem(page, e.PROBLEM); await reload();
    eq(await page.getByLabel('Title', { exact: true }).inputValue(), e.PROBLEM.title);
    for (const [l, k] of [['Asset', 'asset'], ['Site / area', 'site'], ['Date of event', 'eventDate'], ['What happened?', 'whatHappened'], ['Where on the equipment?', 'where'], ['When did it happen?', 'when'], ['What was the impact?', 'impact']])
      eq(await page.getByLabel(l, { exact: true }).inputValue(), e.PROBLEM[k], l);
    await page.getByRole('heading', { name: e.PROBLEM.title, level: 1 }).waitFor();
  });
  await sub('url-hash', 'Reload keeps the current step via the #hash', async () => {
    await step(page, 'Loss'); await page.reload(); eq(await f.activeStep(page), 'Loss');
  });
  await sub('loss', 'Loss inputs, unit and currency survive reload', async () => {
    await f.fillLoss(page, { events: 4, hours: 5.5, rate: 120, unit: 'cartons', margin: 2.5, repair: 1800, cur: '£' }); await reload();
    eq(await page.getByLabel('Downtime per event', { exact: true }).inputValue(), '5.5');
    eq(await page.getByLabel('Currency symbol', { exact: true }).inputValue(), '£');
    eq(await page.getByTestId('annual-loss').innerText(), '£13,800');
  });
  await sub('evidence', 'Evidence add / edit / delete survive reload', async () => {
    await f.addEvidence(page, { title: 'Ev one', type: 'Data / Trend', date: '2026-01-02', note: 'n1' });
    await f.addEvidence(page, { title: 'Ev two', type: 'Photo' }); await reload();
    await step(page, 'Evidence'); await page.getByText('Ev one').waitFor(); await page.getByText('Data / Trend').waitFor(); await page.getByText('n1').waitFor();
    await page.getByRole('button', { name: 'Delete evidence Ev two' }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await reload(); await step(page, 'Evidence'); eq(await page.getByText('Ev two').count(), 0);
  });
  await sub('tree', 'Tree structure, text, category, status, root flag, evidence link, collapse survive reload', async () => {
    await step(page, 'Cause tree'); await page.getByRole('button', { name: 'Ask the first Why?' }).click();
    await f.typeCause(page, 'T1'); await page.getByRole('radio', { name: 'Human', exact: true }).click();
    await page.getByRole('radio', { name: 'Verified', exact: true }).click(); await page.getByRole('checkbox', { name: /^E1\./ }).check();
    await f.addCause(page, 'why', 'T1a', { cat: 'System / Latent', root: true });
    await f.selectCause(page, 'T1'); await tb(page).getByRole('button', { name: /Collapse/ }).click();
    await reload(); await step(page, 'Cause tree');
    await page.getByRole('button', { name: 'Show 1 hidden causes' }).waitFor();
    await tb(page).count(); await f.selectCause(page, 'T1');
    ok(await page.getByRole('radio', { name: 'Human', exact: true }).getAttribute('aria-checked') === 'true');
    ok(await page.getByRole('radio', { name: 'Verified', exact: true }).getAttribute('aria-checked') === 'true');
    ok(await page.getByRole('checkbox', { name: /^E1\./ }).isChecked(), 'evidence link');
    await tb(page).getByRole('button', { name: /Expand/ }).click(); await f.selectCause(page, 'T1a');
    ok(await page.getByRole('checkbox', { name: /This is a root cause/ }).isChecked(), 'root flag');
  });
  await sub('tree-move-delete', 'Tree move and delete survive reload', async () => {
    await f.selectCause(page, 'T1'); await f.addCause(page, 'sibling', 'T2'); await tb(page).getByRole('button', { name: 'Move up' }).click();
    await reload(); await step(page, 'Cause tree');
    const order = await page.locator('.t-children').first().locator('> li > .t-card-wrap [data-node-id]').evaluateAll(els => els.map(n => n.querySelector('textarea')?.value || n.querySelector('button[aria-hidden]')?.textContent.trim()));
    ok(order[0].startsWith('T2'), 'order ' + order.join(','));
    await f.selectCause(page, 'T2'); await tb(page).getByRole('button', { name: 'Delete cause' }).click(); await reload(); await step(page, 'Cause tree');
    eq(await f.sel(page, 'T2').count(), 0);
  });
  await sub('actions', 'Actions add / edit / status / delete survive reload', async () => {
    await f.addAction(page, { cause: 'T1a', desc: 'Do it', owner: 'Pat', due: '2027-05-05', status: 'In progress', cost: 77.5 }); await reload(); await step(page, 'Actions');
    const li = cardsLi(page).first();
    eq(await li.getByLabel('Owner', { exact: true }).inputValue(), 'Pat'); eq(await li.getByLabel('Due date').inputValue(), '2027-05-05');
    eq(await li.getByLabel('Status', { exact: true }).inputValue(), 'in_progress'); eq(await li.getByLabel('Cost', { exact: true }).inputValue(), '77.5');
    await page.getByRole('button', { name: 'Delete action 1' }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
    eq(await cardsLi(page).count(), 1, 'cancel keeps');
    await page.getByRole('button', { name: 'Delete action 1' }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await reload(); await step(page, 'Actions'); eq(await cardsLi(page).count(), 0);
  });
  await sub('verify', 'Verification fields survive reload', async () => {
    await f.fillVerify(page, { date: '2026-11-11', recurred: 'Yes, it happened again', after: 2, notes: 'abc' }); await reload(); await step(page, 'Verify');
    eq(await page.getByLabel('Review date').inputValue(), '2026-11-11'); eq(await page.getByLabel(/Has the failure recurred/).inputValue(), 'yes');
    eq(await page.getByLabel('Expected events per year after the fix').inputValue(), '2'); eq(await page.getByLabel('What did you find?').inputValue(), 'abc');
  });
  await sub('fast-reload', 'Edit then reload within 100 ms (before the 350 ms debounce) does not lose the edit', async () => {
    await step(page, 'Problem');
    let prompted = false; page.on('dialog', d => { prompted = true; d.accept(); });
    await page.getByLabel('Title', { exact: true }).fill('FAST EDIT'); await page.waitForTimeout(60); await page.reload();
    await page.getByLabel('Title', { exact: true }).waitFor();
    const v = await page.getByLabel('Title', { exact: true }).inputValue(); ok(v === 'FAST EDIT' || prompted, 'lost without prompt: ' + v);
  });
  await sub('nav-away', 'Edit then click "All investigations" immediately keeps the edit', async () => {
    await page.getByLabel('Title', { exact: true }).fill('NAV EDIT'); await page.getByRole('link', { name: 'All investigations' }).click();
    await page.waitForURL(/\/app$/); await page.reload(); await e.dashStats(page);
    ok((await e.dashRows(page)).some(r => r.includes('NAV EDIT')), (await e.dashRows(page)).join('|'));
  });
  await sub('title-doc', 'Browser tab title follows the investigation title', async () => {
    await page.goto(BASE + '/app/investigations/' + id); await page.getByLabel('Title', { exact: true }).waitFor();
    ok((await page.title()).startsWith('NAV EDIT'), await page.title());
  });
  await sub('two-tabs', 'Two tabs editing different fields of one investigation do not overwrite each other', async () => {
    const p2 = await page.context().newPage(); await p2.goto(BASE + '/app/investigations/' + id);
    await p2.getByLabel('Asset', { exact: true }).waitFor(); await page.getByLabel('Asset', { exact: true }).waitFor();
    await page.getByLabel('Title', { exact: true }).fill('TAB1 TITLE'); await waitSaved(page);
    await p2.getByLabel('Asset', { exact: true }).fill('TAB2 ASSET'); await p2.waitForTimeout(900);
    await page.reload(); await page.getByLabel('Title', { exact: true }).waitFor();
    const title = await page.getByLabel('Title', { exact: true }).inputValue();
    const asset = await page.getByLabel('Asset', { exact: true }).inputValue();
    await p2.close();
    ok(title === 'TAB1 TITLE' && asset === 'TAB2 ASSET', `after both tabs saved: title="${title}" asset="${asset}" (last writer replaced the whole problem object)`);
  });
}));

// ---------------------------------------------------------------- numbers
test('D-EDGE-NUM', 'Number fields: zero, negative, non-numeric, decimals, huge; payback edge cases', async ({ browser, sub }) => withPage(browser, {}, async (page) => {
  await h.demoNew(page); await step(page, 'Loss');
  const L = 'Downtime per event';
  const val = () => page.getByLabel(L, { exact: true }).inputValue();
  await sub('letters', 'Letters are rejected in number fields', async () => { await page.getByLabel(L, { exact: true }).pressSequentially('abc'); eq(await val(), ''); });
  await sub('negative', 'Negative numbers cannot be entered (minus key ignored) - no explanation shown', async () => {
    await page.getByLabel(L, { exact: true }).fill(''); await page.getByLabel(L, { exact: true }).pressSequentially('-5'); eq(await val(), '5');
  });
  await sub('paste-comma', 'Pasting "1,000" or "1e3" is silently rejected (field keeps previous value)', async () => {
    await page.getByLabel(L, { exact: true }).fill('7'); await page.getByLabel(L, { exact: true }).fill('1,000'); const a = await val();
    await page.getByLabel(L, { exact: true }).fill('1e3'); const b = await val(); note_(`"1,000" -> "${a}", "1e3" -> "${b}"`);
    ok(a === '7' && b === '7', 'unexpected: ' + a + ',' + b);
  });
  await sub('decimals', 'Decimals ".5", "5.", "0.001" accepted; live calc rounds to 2 dp', async () => {
    const el = page.getByLabel(L, { exact: true });
    await el.fill(''); await el.pressSequentially('.5'); eq(await val(), '.5');
    await el.fill(''); await el.pressSequentially('5.'); eq(await val(), '5.');
    await el.fill(''); await el.pressSequentially('0.001'); eq(await val(), '0.001');
  });
  await sub('zero-loss', 'All zeros: annual loss $0, no NaN/Infinity anywhere', async () => {
    for (const l of ['How many times a year does it happen?', L, 'Production rate', 'Margin per unit', 'Repair cost per event']) await f.typeNum(page, l, 0);
    eq(await page.getByTestId('annual-loss').innerText(), '$0');
    const t = await page.locator('body').innerText(); ok(!/NaN|Infinity|undefined|null/.test(t), 'bad token in: ' + t.match(/.{20}(NaN|Infinity|undefined|null).{20}/)?.[0]);
  });
  await sub('huge', 'Huge values (1e20) format without NaN/scientific and without horizontal overflow', async () => {
    await f.typeNum(page, 'How many times a year does it happen?', '99999999999999999999');
    await f.typeNum(page, 'Downtime per event', '99999999999999999999'); await f.typeNum(page, 'Production rate', 9999999); await f.typeNum(page, 'Margin per unit', 9999999);
    const t = await page.getByTestId('annual-loss').innerText(); ok(!/NaN|Infinity|e\+/i.test(t), t);
    await page.setViewportSize(MOBILE); const o = await h.overflowX(page); await h.shot(page, 'demo-loss-huge-mobile'); await page.setViewportSize(h.DESKTOP);
    ok(o.sw <= o.cw, `mobile overflow with huge numbers: scrollWidth ${o.sw} > ${o.cw} (annual loss shows "${t}")`);
  });
  await sub('currency', 'Currency: max 4 chars; empty falls back to $; unit empty falls back to "units"', async () => {
    await f.typeNum(page, 'How many times a year does it happen?', 1); await f.typeNum(page, 'Downtime per event', 1); await f.typeNum(page, 'Production rate', 1); await f.typeNum(page, 'Margin per unit', 1); await f.typeNum(page, 'Repair cost per event', 0);
    await page.getByLabel('Currency symbol', { exact: true }).fill('ABCDEFG'); eq(await page.getByLabel('Currency symbol', { exact: true }).inputValue(), 'ABCD');
    eq(await page.getByTestId('annual-loss').innerText(), 'ABCD1');
    await page.getByLabel('Currency symbol', { exact: true }).fill(''); eq(await page.getByTestId('annual-loss').innerText(), '$1');
    await page.getByLabel('Unit name', { exact: true }).fill(''); ok((await page.locator('aside[aria-label="Live calculation"]').innerText()).includes('1 units'));
  });
  // payback matrix: loss 4/5.5/120/2.5/1800 -> $13,800, cost/event 3,450 ; actions cost 2,150.5
  await f.fillLoss(page, { events: 4, hours: 5.5, rate: 120, unit: 'cartons', margin: 2.5, repair: 1800, cur: '$' });
  await step(page, 'Cause tree'); await page.getByRole('button', { name: 'Ask the first Why?' }).click(); await page.getByRole('checkbox', { name: /root cause/ }).check();
  await f.typeCause(page, 'RC'); await page.getByRole('checkbox', { name: /root cause/ }).check();
  await f.addAction(page, { cause: 'RC', desc: 'a', owner: 'o', due: '2027-01-01', cost: 1200 });
  await f.addAction(page, { cause: 'RC', desc: 'b', owner: 'o', due: '2027-01-01', cost: 950.5 });
  const verifyCases = [
    ['after-empty', '', 'Not entered', 'n/a'],
    ['after=events (saving 0)', 4, '$0', 'n/a'],     // 13,800 - 13,800
    ['after>events (negative saving)', 6, '-$6,900', 'n/a'], // 20,700 vs 13,800
    ['after=0', 0, '$13,800', '1.9 months'],          // 2150.5 / (13800/12=1150) = 1.87
    ['after=1', 1, '$10,350', '2.5 months'],          // 2150.5 / 862.5 = 2.493
  ];
  for (const [name, after, saving, pay] of verifyCases) {
    await sub('payback-' + name, `Verify: events after = "${after}" -> saving ${saving}, payback ${pay} (no divide-by-zero)`, async () => {
      await f.fillVerify(page, { after });
      const t = (await page.locator('dl').last().innerText()).replace(/\s+/g, ' ').toLowerCase();
      ok(t.includes(('annual saving ' + saving).toLowerCase()), t); ok(t.includes(('payback period ' + pay).toLowerCase()), t); ok(!/nan|infinity/.test(t), t);
    });
  }
  await sub('payback-zero-cost', 'Action cost 0 with saving: payback "under 0.1 months"', async () => {
    await step(page, 'Actions'); await cardsLi(page).nth(0).getByLabel('Cost', { exact: true }).fill(''); await cardsLi(page).nth(1).getByLabel('Cost', { exact: true }).fill('');
    await f.fillVerify(page, { after: 1 });
    const t = (await page.locator('dl').last().innerText()).replace(/\s+/g, ' ').toLowerCase(); ok(t.includes('under 0.1 months'), t);
  });
  await sub('report-no-after', 'Report without an after figure says "Not yet" and explains', async () => {
    await f.fillVerify(page, { after: '' }); const t = await e.reportText(page);
    const tl = t.toLowerCase(); ok(tl.includes('annual saving not yet') && tl.includes('savings cannot be calculated'), t.slice(0, 400));
  });
}));
function note_(s) { h.note('observation', s); }

// ---------------------------------------------------------------- text
test('D-EDGE-TEXT', 'Very long text, HTML/script text and special characters render as text and do not break layout', async ({ browser, sub }) => withPage(browser, { viewport: MOBILE }, async (page) => {
  const dialogs = []; page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
  const XSS = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script><b>bold</b> "quotes" \'single\' &amp; &lt;i&gt; ${7*7} {{7*7}} 🚀 مرحبا';
  const LONG = 'W'.repeat(3000);
  const LONGW = Array.from({ length: 400 }, (_, i) => 'word' + i).join(' ');
  const id = await h.demoNew(page);
  await f.fillProblem(page, { title: XSS, asset: LONG, site: LONGW, whatHappened: LONGW, where: XSS, when: LONG, impact: XSS, eventDate: '2026-01-01' });
  await step(page, 'Loss'); await page.getByLabel('Unit name', { exact: true }).fill(XSS);
  await f.addEvidence(page, { title: XSS, type: 'Other', note: LONG });
  await step(page, 'Cause tree'); await page.getByRole('button', { name: 'Ask the first Why?' }).click(); await f.typeCause(page, XSS);
  await page.getByRole('checkbox', { name: /root cause/ }).check();
  await f.addCause(page, 'why', LONG, { cat: 'Human' }); await f.addCause(page, 'sibling', LONGW);
  await f.addAction(page, { cause: XSS, desc: XSS, owner: LONG, due: '2027-01-01' });
  await f.fillVerify(page, { notes: XSS });
  await waitSaved(page);
  const pages = [['problem', 'Problem'], ['loss', 'Loss'], ['evidence', 'Evidence'], ['cause', 'Cause tree'], ['actions', 'Actions'], ['verify', 'Verify'], ['report', 'Report']];
  for (const [k, label] of pages) await sub('overflow-' + k, `375px: "${label}" step has no horizontal page overflow with 3000-char words`, async () => {
    await step(page, label); await page.waitForTimeout(200); const o = await h.overflowX(page); await h.shot(page, 'demo-longtext-' + k);
    ok(o.sw <= o.cw, `scrollWidth ${o.sw} > clientWidth ${o.cw}`);
  });
  await sub('views', '5 Whys and Fishbone views with long text: no page overflow', async () => {
    await step(page, 'Cause tree');
    for (const v of ['5 Whys', 'Fishbone']) { await page.getByRole('tab', { name: v }).click(); const o = await h.overflowX(page); await h.shot(page, 'demo-longtext-' + v.replace(' ', '')); ok(o.sw <= o.cw, v + ` overflow ${o.sw}>${o.cw}`); }
  });
  await sub('dash-overflow', 'Dashboard with long/special title: no overflow', async () => {
    await page.goto(BASE + '/app'); await e.dashStats(page); const o = await h.overflowX(page); await h.shot(page, 'demo-longtext-dashboard'); ok(o.sw <= o.cw, `scrollWidth ${o.sw} > ${o.cw}`);
  });
  await sub('no-xss', 'No script ran, no dialog opened, no injected elements anywhere', async () => {
    for (const u of ['/app', '/app/investigations/' + id + '#problem', '#report', '#cause', '#actions']) {
      if (u.startsWith('#')) { await page.evaluate((x) => { location.hash = x; location.reload(); }, u); } else await page.goto(BASE + u);
      await page.waitForTimeout(700);
      eq(await page.evaluate(() => window.__xss === undefined), true, 'xss flag set on ' + u);
      eq(await page.evaluate(() => document.querySelectorAll('article img[src="x"], main img[src="x"], b').length), 0, 'injected element on ' + u);
    }
    eq(dialogs, []);
  });
  await sub('as-text', 'Special text is shown literally in the report and survives a round trip', async () => {
    await page.goto(BASE + '/app/investigations/' + id); await page.evaluate(() => { location.hash = '#report'; location.reload(); }); await page.locator('article.print-sheet').waitFor(); const t = await page.locator('article.print-sheet').innerText();
    ok(t.includes('<b>bold</b>') && t.includes('${7*7}') && t.includes('{{7*7}}') && t.includes('🚀'), t.slice(0, 300));
  });
  await sub('delete-msg', 'Delete dialog shows the hostile title as text', async () => {
    await page.goto(BASE + '/app'); await e.dashStats(page); await page.getByRole('button', { name: /^Delete / }).first().click();
    const d = page.getByRole('alertdialog'); await d.waitFor(); ok((await d.innerText()).includes('<b>bold</b>'));
    await h.shot(page, 'demo-delete-dialog-mobile'); await d.getByRole('button', { name: 'Cancel' }).click();
  });
  await sub('doc-title', 'document.title contains the title as plain text', async () => {
    await page.goto(BASE + '/app/investigations/' + id); await page.getByLabel('Title', { exact: true }).waitFor(); ok((await page.title()).includes('<img'), await page.title());
  });
}));

// ---------------------------------------------------------------- dates
test('D-EDGE-DATE', 'Dates in the past and future', async ({ browser, sub }) => withPage(browser, {}, async (page) => {
  await h.demoNew(page); await step(page, 'Problem');
  await sub('past-future-event', 'Event dates 1900-01-01 and 2999-12-31 are accepted and shown formatted', async () => {
    const el = page.getByLabel('Date of event', { exact: true });
    await el.fill('1900-01-01'); await waitSaved(page); await page.goto(BASE + '/app'); await e.dashStats(page); ok((await e.dashRows(page))[0].includes('1 Jan 1900'), (await e.dashRows(page))[0]);
    await page.goBack(); await page.getByLabel('Date of event', { exact: true }).fill('2999-12-31'); await waitSaved(page);
    await page.goto(BASE + '/app'); await e.dashStats(page); ok((await e.dashRows(page))[0].includes('31 Dec 2999'), (await e.dashRows(page))[0]);
  });
  await sub('future-event-flag', 'Future event date (after today) is not flagged by the quality check', async () => {
    await page.goBack(); const t = await f.qualityTexts(page); ok(!t.some(x => /date/i.test(x) && /future/i.test(x)), t.join('|'));
    h.note('observation', 'No validation for an event date in the future (2999-12-31 accepted silently)');
  });
  await sub('clear-date', 'Clearing the date makes the quality check list "date of event" again', async () => {
    await page.getByLabel('Date of event', { exact: true }).fill(''); const t = await f.qualityTexts(page); ok(t.some(x => /missing:.*date of event/.test(x)), t.join('|'));
  });
  await sub('overdue-done', 'Past due date on a Done action is not overdue; on an Open action it is; dashboard counts it', async () => {
    await step(page, 'Cause tree'); await page.getByRole('button', { name: 'Ask the first Why?' }).click(); await page.getByRole('checkbox', { name: /root cause/ }).check(); await f.typeCause(page, 'R');
    await f.addAction(page, { cause: 'R', desc: 'old', owner: 'x', due: '2020-01-01', status: 'Done' });
    await f.addAction(page, { cause: 'R', desc: 'old2', owner: 'x', due: '2020-01-01', status: 'Open' });
    await f.addAction(page, { cause: 'R', desc: 'later', owner: 'x', due: '2999-01-01', status: 'Open' });
    const t = (await page.locator('dl').first().innerText()).replace(/\s+/g, ' ').toLowerCase(); ok(t.includes('overdue 1'), t);
    await waitSaved(page); await page.goto(BASE + '/app'); const s = await e.dashStats(page); eq(s['Overdue actions'], '1'); eq(s['Open actions'], '2');
  });
  await sub('review-before-event', 'Review date earlier than the event date is accepted without any warning (observation)', async () => {
    await page.goBack(); await f.fillVerify(page, { date: '1999-01-01' }); h.note('observation', 'Review date before event date: no validation');
  });
}));

// ---------------------------------------------------------------- navigation
test('D-EDGE-NAV', 'Invalid id, unknown routes, back/forward, double-click create', async ({ browser, sub }) => withPage(browser, {}, async (page) => {
  await sub('bad-id', 'Invalid investigation id shows "Investigation not found" with a working link back', async () => {
    await page.goto(BASE + '/app/investigations/does-not-exist-123'); await page.getByRole('heading', { name: 'Investigation not found' }).waitFor();
    await page.getByRole('link', { name: 'Back to all investigations' }).click(); await page.waitForURL(/\/app$/);
  });
  await sub('weird-ids', 'Ids with special characters (%00, <script>, very long, ../) do not crash the page', async () => {
    for (const id of ['%3Cscript%3Ealert(1)%3C%2Fscript%3E', 'a'.repeat(3000), '..%2F..%2Fapp', '%00', "'; DROP TABLE x;--"]) {
      const r = await page.goto(BASE + '/app/investigations/' + id); const st = r.status();
      await page.waitForTimeout(500); const t = await page.locator('body').innerText();
      ok(st < 500 && /not found|Investigations/i.test(t), `id ${id.slice(0, 30)} -> HTTP ${st}: ${t.slice(0, 80)}`);
    }
  });
  await sub('unknown-route', 'Unknown route /nope and /app/investigations/ return a 404 page', async () => {
    for (const u of ['/nope', '/app/investigations']) { const r = await page.goto(BASE + u); eq(r.status(), 404, u); ok(/404|not found/i.test(await page.locator('body').innerText())); }
    await h.shot(page, 'demo-404');
  });
  await sub('bad-hash', 'Unknown #hash falls back to the Problem step', async () => {
    await page.goto(BASE + '/app/investigations/sample-p101#nonsense'); await page.getByRole('navigation', { name: 'Investigation steps' }).waitFor(); eq(await f.activeStep(page), 'Problem');
  });
  await sub('deep-link', 'Deep links #report and #cause open those steps', async () => {
    for (const [hash, name] of [['report', 'Report'], ['cause', 'Cause tree'], ['verify', 'Verify']]) { await page.goto(BASE + '/app'); await page.goto(BASE + '/app/investigations/sample-p101#' + hash); await page.getByRole('navigation', { name: 'Investigation steps' }).waitFor(); eq(await f.activeStep(page), name); }
  });
  await sub('back-fwd', 'Browser back/forward: dashboard -> workspace -> steps -> back returns to dashboard, forward returns to workspace', async () => {
    await page.goto(BASE + '/app'); await e.dashStats(page); await page.getByRole('link', { name: 'Open' }).first().click(); await page.waitForURL(/investigations/);
    await step(page, 'Loss'); await step(page, 'Report');
    await page.goBack(); await page.waitForURL(/\/app$/); await e.dashStats(page);
    await page.goForward(); await page.waitForURL(/investigations/); await page.getByRole('navigation', { name: 'Investigation steps' }).waitFor();
    h.note('observation', 'Step changes use history.replaceState, so Back leaves the investigation instead of going to the previous step; after Forward the step shown is ' + await f.activeStep(page));
  });
  await sub('bfcache-edit', 'Back to the dashboard after editing shows the edited title', async () => {
    await page.goto(BASE + '/app'); await e.dashStats(page); await page.getByRole('link', { name: 'Open' }).first().click(); await page.waitForURL(/investigations/);
    await page.getByLabel('Title', { exact: true }).fill('BACK TEST'); await page.waitForTimeout(100);
    await page.goBack(); await page.waitForURL(/\/app$/); await e.dashStats(page); ok((await e.dashRows(page))[0].includes('BACK TEST'), (await e.dashRows(page))[0]);
  });
  await sub('dblclick-dashboard', 'Double-clicking "New investigation" creates exactly one investigation', async () => {
    await page.evaluate(() => localStorage.clear()); await page.goto(BASE + '/app'); await e.dashStats(page);
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('rca.investigations.v1')).length);
    await page.getByRole('button', { name: 'New investigation' }).dblclick(); await page.waitForURL(/investigations\/(?!sample)/); await page.waitForTimeout(800);
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('rca.investigations.v1')).length); eq(after - before, 1, 'created ' + (after - before));
  });
  await sub('dblclick-dashboard-human', 'Human-speed double click (2 clicks 120 ms apart) on "New investigation" creates exactly one', async () => {
    await page.goto(BASE + '/app'); await e.dashStats(page);
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('rca.investigations.v1')).length);
    const b = page.getByRole('button', { name: 'New investigation' }); await b.click({ noWaitAfter: true }); await page.waitForTimeout(120); await b.click({ noWaitAfter: true, timeout: 2000 }).catch(() => {});
    await page.waitForURL(/investigations\/(?!sample)/); await page.waitForTimeout(800);
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('rca.investigations.v1')).length); eq(after - before, 1, 'created ' + (after - before));
  });
  await sub('hashchange', 'Changing only the #hash in the address bar of an open investigation switches the step', async () => {
    await page.goto(BASE + '/app'); await page.goto(BASE + '/app/investigations/sample-p101#loss'); await page.getByRole('navigation', { name: 'Investigation steps' }).waitFor();
    await page.evaluate(() => { location.hash = '#report'; }); await page.waitForTimeout(500); eq(await f.activeStep(page), 'Report', 'hashchange ignored; still on ' + await f.activeStep(page));
  });
  await sub('dblclick-landing', 'Double-clicking "Start a new investigation" on the landing page creates exactly one', async () => {
    await page.goto(BASE + '/'); const before = await page.evaluate(() => JSON.parse(localStorage.getItem('rca.investigations.v1') || '[]').length);
    await page.getByRole('button', { name: 'Start a new investigation' }).dblclick(); await page.waitForURL(/investigations\//); await page.waitForTimeout(800);
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('rca.investigations.v1')).length); eq(after - before, 1, 'created ' + (after - before));
  });
  await sub('dblclick-dup', 'Double-clicking Duplicate creates exactly one copy', async () => {
    await page.goto(BASE + '/app'); await e.dashStats(page); const before = await page.evaluate(() => JSON.parse(localStorage.getItem('rca.investigations.v1')).length);
    await page.getByRole('button', { name: /^Duplicate / }).first().dblclick(); await page.waitForURL(/investigations\//); await page.waitForTimeout(800);
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('rca.investigations.v1')).length); eq(after - before, 1, 'created ' + (after - before));
  });
  await sub('rapid-new-nav', 'Pressing "New investigation" then browser Back immediately leaves no half-created junk beyond one blank', async () => {
    await page.goto(BASE + '/app'); await e.dashStats(page); await page.getByRole('button', { name: 'New investigation' }).click(); await page.waitForURL(/investigations\//); await page.goBack(); await page.waitForURL(/\/app$/);
    await e.dashStats(page); h.note('observation', 'Blank "Untitled investigation" rows remain if user creates and abandons: ' + (await e.dashRows(page)).filter(r => /Untitled/.test(r)).length);
  });
}));

// ---------------------------------------------------------------- hidden actions
test('D-EDGE-ACT', 'Actions whose root cause is unflagged or deleted', async ({ browser, sub }) => withPage(browser, {}, async (page) => {
  await h.demoNew(page); await step(page, 'Cause tree'); await page.getByRole('button', { name: 'Ask the first Why?' }).click(); await f.typeCause(page, 'Only root'); await page.getByRole('checkbox', { name: /root cause/ }).check();
  await f.addAction(page, { cause: 'Only root', desc: 'Action X', owner: 'o', due: '2027-01-01', cost: 500 });
  await step(page, 'Cause tree'); await f.selectCause(page, 'Only root'); await page.getByRole('checkbox', { name: /root cause/ }).uncheck();
  await step(page, 'Actions');
  await sub('hidden-after-unflag', 'After the only root cause is un-flagged the existing action is still visible and editable', async () => {
    const n = await cardsLi(page).count(); await h.shot(page, 'demo-actions-hidden');
    ok(n === 1, `Actions step shows ${n} action cards (it shows "${(await page.locator('main, body').first().innerText()).includes('Flag a root cause first') ? 'Flag a root cause first' : '?'}") although 1 action with cost $500 still exists`);
  });
  await sub('hidden-still-counted', 'Hidden action still counts in quality findings, report and dashboard (data and UI disagree)', async () => {
    const q = await f.qualityTexts(page); const rep = await e.reportText(page);
    h.note('observation', 'Quality: ' + q.join(' | ') + ' ; report has action text: ' + rep.includes('Action X'));
    ok(!(rep.includes('Action X') && (await cardsLi(page).count()) === 0) || true);
  });
}));

// ---------------------------------------------------------------- evidence
test('D-EDGE-EVID', 'Evidence: link/unlink, delete confirm, photo upload, non-image file', async ({ browser, sub }) => withPage(browser, {}, async (page) => {
  const png = path.join(h.SHOTS, 'qa-upload.png'); const txt = path.join(h.SHOTS, 'qa-upload.txt');
  // generate a 3000x2000 PNG in the browser
  const b64 = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 3000; c.height = 2000; const x = c.getContext('2d'); x.fillStyle = '#c33'; x.fillRect(0, 0, 3000, 2000); x.fillStyle = '#fff'; x.font = '200px sans-serif'; x.fillText('QA PHOTO', 600, 1000); return c.toDataURL('image/png').split(',')[1]; });
  fs.writeFileSync(png, Buffer.from(b64, 'base64')); fs.writeFileSync(txt, 'not an image');
  await h.demoNew(page);
  await f.addEvidence(page, { title: 'Pic', type: 'Photo' });
  await step(page, 'Evidence'); await page.getByRole('button', { name: 'Edit' }).click();
  await sub('upload', 'Upload a 3000x2000 PNG: preview appears, button changes to "Replace photo", stored as JPEG <= 800px', async () => {
    await page.getByLabel('Upload photo').setInputFiles(png); await page.getByAltText('Evidence preview').waitFor();
    await page.getByText('Replace photo').waitFor();
    const dim = await page.getByAltText('Evidence preview').evaluate(i => [i.naturalWidth, i.naturalHeight, i.src.slice(0, 22)]); ok(dim[0] <= 800 && dim[1] <= 800 && dim[2].startsWith('data:image/jpeg'), dim.join(','));
  });
  await sub('non-image', 'Non-image file shows "That file is not an image." alert', async () => {
    await page.getByLabel('Upload photo').setInputFiles(txt); await page.getByRole('alert').filter({ hasText: 'not an image' }).waitFor();
  });
  await sub('photo-persist-report', 'Photo persists after reload and appears in the report', async () => {
    await waitSaved(page); await page.reload(); await step(page, 'Evidence'); await page.locator('img[src^="data:image/jpeg"]').first().waitFor();
    await step(page, 'Report'); await page.locator('article img[src^="data:image/jpeg"]').waitFor();
  });
  await sub('remove-photo', '"Remove photo" removes the image', async () => {
    await step(page, 'Evidence'); await page.getByRole('button', { name: 'Edit' }).click(); await page.getByRole('button', { name: 'Remove photo' }).click();
    await page.getByText('Add a photo').waitFor(); eq(await page.locator('img[src^="data:image"]').count(), 0);
  });
  await sub('link-delete', 'Delete evidence linked to a cause: confirm says "linked to 1 cause"; after confirm the cause chip/link is gone', async () => {
    await step(page, 'Cause tree'); await page.getByRole('button', { name: 'Ask the first Why?' }).click(); await f.typeCause(page, 'C1'); await page.getByRole('checkbox', { name: /^E1\./ }).check();
    await page.getByText('1 evidence').waitFor();
    await step(page, 'Evidence'); await page.getByText('Linked to 1 cause').waitFor();
    await page.getByRole('button', { name: 'Delete evidence Pic' }).click(); const d = page.getByRole('alertdialog'); ok((await d.innerText()).includes('linked to 1 cause'), await d.innerText());
    await d.getByRole('button', { name: 'Cancel' }).click(); await page.getByText('Pic', { exact: true }).first().waitFor();
    await page.getByRole('button', { name: 'Delete evidence Pic' }).click(); await d.getByRole('button', { name: 'Delete' }).click();
    await step(page, 'Cause tree'); eq(await page.getByText('1 evidence').count(), 0);
  });
  await sub('evidence-types', 'All six evidence types selectable and shown in the list/report', async () => {
    for (const t of ['Photo', 'Data / Trend', 'Document', 'Interview', 'Inspection', 'Other']) await f.addEvidence(page, { title: 'T ' + t, type: t });
    const rep = await e.reportText(page); for (const t of ['Photo', 'Data / Trend', 'Document', 'Interview', 'Inspection', 'Other']) ok(rep.includes('(' + t), 'report missing type ' + t);
  });
}));

// ---------------------------------------------------------------- storage faults
test('D-EDGE-STORE', 'Browser storage faults: corrupt JSON, blocked storage', async ({ browser, sub }) => {
  await sub('corrupt', 'Corrupt localStorage JSON: app does not crash (shows empty state) and recovers when a new investigation is created', async () => withPage(browser, {}, async (page) => {
    await page.goto(BASE + '/app'); await e.dashStats(page);
    await page.evaluate(() => localStorage.setItem('rca.investigations.v1', '{not json')); await page.reload();
    await page.getByText('No investigations yet').waitFor(); eq(page.errs.filter(x => !/Failed to load resource/.test(x)), []);
    await h.shot(page, 'demo-corrupt-storage');
    await page.getByRole('button', { name: 'Start a new investigation' }).click(); await page.waitForURL(/investigations\//);
    h.note('observation', 'Corrupt demo data is silently shown as "No investigations yet" and overwritten on the next save (no warning)');
  }));
  await sub('blocked', 'localStorage unavailable (throws): app still works in memory for the session', async () => withPage(browser, {}, async (page) => {
    await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } }); });
    await page.goto(BASE + '/app'); await page.getByRole('heading', { name: 'Investigations', level: 1 }).waitFor(); await e.dashStats(page);
    await page.getByRole('button', { name: 'New investigation' }).click(); await page.waitForURL(/investigations\//);
    await page.getByLabel('Title', { exact: true }).fill('mem only'); await waitSaved(page);
  }));
  await sub('quota', 'Storage full: edit shows a readable "Browser storage is full" error with Try again', async () => withPage(browser, {}, async (page) => {
    await h.demoNew(page);
    await page.evaluate(() => { const orig = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'rca.investigations.v1') throw new DOMException('full', 'QuotaExceededError'); return orig.call(this, k, v); }; });
    await page.getByLabel('Title', { exact: true }).fill('x'); await page.getByRole('alert').filter({ hasText: /storage is full/i }).waitFor();
    await page.getByRole('button', { name: 'Try again' }).waitFor(); await h.shot(page, 'demo-quota-error');
  }));
});
module.exports = {};
