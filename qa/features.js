// Round 3 features: asset details + register, corrective/preventive actions, maintenance plan, spares, new quality rules,
// deterioration, similar past failures, rollout, sample upgrade, security headers/CSP, account page.
// Demo mode and signed in; desktop and 375px. Hand-calculated expectations are written out in the tests.
const fs = require('fs');
const path = require('path');
const h = require('./harness');
const f = require('./flows');
const e = require('./e2e');
const { cleanAccount } = require('./cleanup');
const { test, eq, ok, step, waitSaved, withPage, BASE, DESKTOP, MOBILE, USER_A, USER_B } = h;

let SA, SB;
const ensure = async (browser) => { if (!SA) SA = await h.loginState(browser, USER_A); if (!SB) SB = await h.loginState(browser, USER_B); };
const MODES = {
  'demo-desk': { vp: DESKTOP }, 'demo-mob': { vp: MOBILE }, 'acct-desk': { vp: DESKTOP, who: 'A' }, 'acct-mob': { vp: MOBILE, who: 'A' },
};
/** Registers one test per mode. fn(page, sub, mode) */
function FT(id, title, modes, fn) {
  for (const m of modes) test(`${id}-${m}`, `${title} [${m}]`, async ({ browser, sub }) => {
    const cfg = MODES[m]; if (cfg.who) await ensure(browser);
    return withPage(browser, { viewport: cfg.vp, storageState: cfg.who ? SA : undefined }, async (page) => { await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE }).catch(() => {}); return fn(page, sub, m); });
  });
}
const rowsOf = (page) => page.locator('section[aria-label="Investigations list"] ul > li');

async function assetDetails(page, d) {
  await step(page, 'Problem');
  if (d.tag !== undefined) await page.getByLabel('Asset tag', { exact: true }).fill(d.tag);
  if (d.type !== undefined) { const el = page.getByLabel('Asset type', { exact: true }); await el.fill(d.type); await el.blur(); }
  if (d.make !== undefined) await page.getByLabel('Make and model', { exact: true }).fill(d.make);
  if (d.duty !== undefined) await page.getByLabel('Duty or service', { exact: true }).fill(d.duty);
  if (d.crit) await page.getByRole('radio', { name: new RegExp('^' + d.crit + ':') }).click();
  if (d.mode !== undefined) { const el = page.getByLabel('Failure mode', { exact: true }); await el.fill(d.mode); await el.blur(); }
}
async function newInv(page, p, a = {}) {
  await h.demoNew(page);
  await f.fillProblem(page, { title: p.title, asset: p.asset ?? 'Asset', site: p.site ?? 'Area', eventDate: p.eventDate ?? '2026-06-01', whatHappened: p.what ?? 'It stopped', where: 'x', when: 'y', impact: 'z' });
  await assetDetails(page, a); await waitSaved(page);
  return page.url().split('/investigations/')[1].split('#')[0];
}
async function causeRoot(page, text, o = {}) { // creates a first cause, optionally root/system etc.
  await step(page, 'Cause tree'); await page.getByRole('button', { name: 'Ask the first Why?' }).click(); await f.typeCause(page, text);
  if (o.cat) await page.getByRole('radio', { name: o.cat, exact: true }).click(); if (o.status) await page.getByRole('radio', { name: o.status, exact: true }).click();
  if (o.root !== false) await page.getByRole('checkbox', { name: /This is a root cause/ }).check();
}
const quality = f.qualityTexts;
const has = (arr, re) => arr.some(t => re.test(t));

// ============================================================ asset details + register
FT('F-ASSET-1', 'Problem step: asset details fields, criticality, combo lists, auto-add to the register', ['demo-desk', 'demo-mob', 'acct-desk'], async (page, sub, mode) => {
  await newInv(page, { title: 'F-ASSET gearbox noise' });
  await sub('fields', 'Asset details section has tag, type, make/model, duty, criticality A/B/C, failure mode', async () => {
    await step(page, 'Problem'); await page.getByRole('heading', { name: 'Asset details' }).waitFor();
    for (const l of ['Asset tag', 'Asset type', 'Make and model', 'Duty or service', 'Failure mode']) await page.getByLabel(l, { exact: true }).waitFor();
    eq(await page.getByRole('radio', { name: /^[ABC]:/ }).count(), 3);
  });
  await sub('combo-list', 'Asset type and Failure mode lists open on focus, filter while typing, and accept your own text', async () => {
    const t = page.getByLabel('Asset type', { exact: true }); await t.focus(); const all = await page.getByRole('option').count(); ok(all >= 20, 'type list has ' + all + ' options');
    await t.fill('slu'); const f1 = await page.getByRole('option').allInnerTexts(); ok(f1.length >= 1 && f1.every(x => /slu/i.test(x)), f1.join(',')); await t.fill('Hydraulic ram'); await t.blur(); eq(await t.inputValue(), 'Hydraulic ram');
    await t.fill('Gearbox'); await t.blur();
    const fm = page.getByLabel('Failure mode', { exact: true }); await fm.focus(); ok((await page.getByRole('option').count()) >= 10); await fm.press('ArrowDown'); await fm.press('Enter'); ok((await fm.inputValue()).length > 0, 'keyboard selection gave nothing');
    await fm.fill('Bearing failure'); await fm.blur();
  });
  await sub('criticality', 'Criticality: choose A, tap again clears, B replaces A', async () => {
    const a = page.getByRole('radio', { name: /^A:/ }), b = page.getByRole('radio', { name: /^B:/ });
    await a.click(); eq(await a.getAttribute('aria-checked'), 'true'); await a.click(); eq(await a.getAttribute('aria-checked'), 'false'); await a.click(); await b.click(); eq(await a.getAttribute('aria-checked'), 'false'); eq(await b.getAttribute('aria-checked'), 'true');
  });
  await sub('register-status', 'A new tag says "It will be added to your asset register", then "In your asset register" once saved; matching ignores case and spaces', async () => {
    await page.getByLabel('Asset tag', { exact: true }).fill('ZZ-501'); await page.getByLabel('Make and model', { exact: true }).fill('Acme 9'); await page.getByLabel('Duty or service', { exact: true }).fill('qa duty'); await waitSaved(page);
    await page.waitForTimeout(1200); const t1 = await page.getByTestId('register-status').innerText(); ok(/In your asset register/.test(t1), 'after save: ' + t1);
    await page.getByLabel('Asset tag', { exact: true }).fill('  zz-501 '); await page.waitForTimeout(500); ok(/In your asset register/.test(await page.getByTestId('register-status').innerText()), 'case/space insensitive');
    await page.getByLabel('Asset tag', { exact: true }).fill('ZZ-501');
  });
  await sub('persist', 'All asset detail fields survive reload', async () => {
    await waitSaved(page); await page.reload(); await step(page, 'Problem');
    eq([await page.getByLabel('Asset tag', { exact: true }).inputValue(), await page.getByLabel('Asset type', { exact: true }).inputValue(), await page.getByLabel('Make and model', { exact: true }).inputValue(), await page.getByLabel('Duty or service', { exact: true }).inputValue(), await page.getByLabel('Failure mode', { exact: true }).inputValue()], ['ZZ-501', 'Gearbox', 'Acme 9', 'qa duty', 'Bearing failure']);
    eq(await page.getByRole('radio', { name: /^B:/ }).getAttribute('aria-checked'), 'true');
  });
  await sub('register-entry', 'The register now has ZZ-501 with the type, make, duty and criticality from the investigation, plus 1 investigation', async () => {
    await page.goto(BASE + '/app/assets'); await page.getByRole('heading', { name: 'Assets', level: 1 }).waitFor(); await page.waitForTimeout(1500);
    const row = page.getByTestId('asset-row').filter({ hasText: 'ZZ-501' }); await row.waitFor(); const t = (await row.innerText()).replace(/\s+/g, ' ');
    ok(/Gearbox/.test(t) && /Acme 9/.test(t) && /qa duty/.test(t) && /B: Important|B:/.test(t) && /Investigations 1/i.test(t), t);
  });
  await sub('long-text', 'A 3000-character make/duty does not overflow the Problem step at this width', async () => {
    await page.goBack().catch(() => {}); await page.goto(BASE + '/app'); await e.dashStats(page); await page.getByRole('link', { name: /F-ASSET gearbox noise/ }).first().click(); await page.getByLabel('Asset tag', { exact: true }).waitFor();
    await page.getByLabel('Make and model', { exact: true }).fill('W'.repeat(3000)); await page.getByLabel('Duty or service', { exact: true }).fill('word '.repeat(600)); const o = await h.overflowX(page); await h.shot(page, 'asset-details-long-' + mode); ok(o.sw <= o.cw, `overflow ${o.sw}>${o.cw}`);
    await page.getByLabel('Make and model', { exact: true }).fill('Acme 9'); await page.getByLabel('Duty or service', { exact: true }).fill('qa duty'); await waitSaved(page);
  });
});

FT('F-REG-1', 'Asset register page: sample assets, add/edit/delete, search, paste a list, validation, stats', ['demo-desk', 'demo-mob'], async (page, sub, mode) => {
  await page.goto(BASE + '/app/assets'); await page.getByRole('heading', { name: 'Assets', level: 1 }).waitFor(); await page.getByTestId('asset-row').first().waitFor();
  await sub('sample', 'Fresh register shows the 5 sample assets in tag order P-101, P-102, P-103, P-210, P-215, each marked Illustrative sample', async () => {
    const tags = await page.getByTestId('asset-row').evaluateAll(els => els.map(e => e.querySelector('h2').childNodes[0].textContent.trim())); eq(tags, ['P-101', 'P-102', 'P-103', 'P-210', 'P-215']);
    eq(await page.getByText('Illustrative sample').count(), 5); await h.shot(page, 'assets-sample-' + mode);
  });
  await sub('stats', 'P-101 stats equal hand calc from the sample: 1 investigation, 6 failures a year, annual loss $238,440', async () => {
    const t = (await page.getByTestId('asset-row').first().innerText()).replace(/\s+/g, ' '); ok(/Investigations 1 Failures a year 6 Annual loss \$238,440/i.test(t), t);
    const none = (await page.getByTestId('asset-row').nth(1).innerText()).replace(/\s+/g, ' '); ok(/Investigations 0 Failures a year 0 Annual loss \$0/i.test(none), none);
  });
  await sub('add-validation', 'Add asset: empty tag and duplicate tag (any case) are refused with a clear message', async () => {
    await page.getByRole('button', { name: 'Add asset', exact: true }).click(); const form = page.getByRole('form', { name: 'Add an asset' }); await form.waitFor();
    await form.getByRole('button', { name: 'Add asset' }).click(); await form.getByText('Enter the asset tag.').waitFor();
    await form.getByLabel('Asset tag', { exact: true }).fill(' p-101 '); await form.getByRole('button', { name: 'Add asset' }).click(); await form.getByText('There is already an asset with the tag P-101.').waitFor();
  });
  await sub('add', 'Add asset with all fields shows it in the list; cancel closes the form without adding', async () => {
    const form = page.getByRole('form', { name: 'Add an asset' });
    await form.getByLabel('Asset tag', { exact: true }).fill('QA-1'); const ty = form.getByLabel('Asset type', { exact: true }); await ty.fill('Gearbox'); await ty.blur(); await form.getByLabel('Make and model', { exact: true }).fill('Flender X'); await form.getByLabel('Duty or service', { exact: true }).fill('ore feed drive');
    await form.getByLabel('Site / area', { exact: true }).fill('Hall 3'); await form.getByLabel('Notes', { exact: true }).fill('spare on shelf'); await form.getByRole('radio', { name: /^C:/ }).click(); await form.getByRole('button', { name: 'Add asset' }).click();
    const row = page.getByTestId('asset-row').filter({ hasText: 'QA-1' }); await row.waitFor(); const t = (await row.innerText()).replace(/\s+/g, ' '); ok(/Gearbox/.test(t) && /Flender X/.test(t) && /ore feed drive/.test(t) && /Hall 3/.test(t) && /spare on shelf/.test(t), t);
    await page.getByRole('button', { name: 'Add asset', exact: true }).click(); await page.getByRole('form', { name: 'Add an asset' }).getByRole('button', { name: 'Cancel' }).click(); eq(await page.getByRole('form', { name: 'Add an asset' }).count(), 0);
    eq(await page.getByTestId('asset-row').count(), 6);
  });
  await sub('edit', 'Edit: change duty and save; tag clash refused; cancel discards', async () => {
    await page.getByRole('button', { name: 'Edit QA-1' }).click(); const form = page.getByRole('form', { name: 'Edit QA-1' }); await form.getByLabel('Duty or service', { exact: true }).fill('edited duty');
    await form.getByLabel('Asset tag', { exact: true }).fill('P-102'); await form.getByRole('button', { name: 'Save changes' }).click(); await form.getByText('There is already an asset with the tag P-102.').waitFor();
    await form.getByLabel('Asset tag', { exact: true }).fill('QA-1'); await form.getByRole('button', { name: 'Save changes' }).click(); await page.getByTestId('asset-row').filter({ hasText: 'edited duty' }).waitFor();
    await page.getByRole('button', { name: 'Edit QA-1' }).click(); await page.getByRole('form', { name: 'Edit QA-1' }).getByLabel('Duty or service', { exact: true }).fill('discard me'); await page.getByRole('form', { name: 'Edit QA-1' }).getByRole('button', { name: 'Cancel' }).click(); eq(await page.getByText('discard me').count(), 0);
  });
  await sub('search', 'Search matches tag, type, make, duty and area; no match message; clearing restores the list', async () => {
    const s = page.getByLabel('Search assets');
    for (const [q, n] of [['qa-1', 1], ['slurry pump', 4], ['warman', 4], ['tailings', 1], ['hall 3', 1], ['CENTRIFUGAL', 1]]) { await s.fill(q); eq(await page.getByTestId('asset-row').count(), n, `query "${q}"`); }
    await s.fill('zzzz-nothing'); await page.getByText('No asset matches “zzzz-nothing”.').waitFor(); await s.fill(''); eq(await page.getByTestId('asset-row').count(), 6);
  });
  await sub('paste', 'Paste a list: counts new / repeated / blank lines exactly, adds only the new ones', async () => {
    await page.getByRole('button', { name: 'Paste a list' }).click(); const box = page.getByLabel('One asset per line: tag, type, duty');
    await box.fill('T-1, Gearbox, Duty one\nT-2\tFan/blower\tx;y\n\nt-1, dup of first\n, Gearbox\nP-101, Slurry pump\nT-3 | belt conveyor | feed');
    // hand count: T-1 new, T-2 new, T-3 new; "t-1" repeated, "P-101" already in register; one line with no tag
    const sum = (await page.getByTestId('paste-summary').innerText()).replace(/\s+/g, ' '); ok(/^3 new assets, 2 already in the register or repeated \(skipped: t-1, P-101\), 1 line without a tag \(skipped\)\./.test(sum), sum);
    await page.getByRole('button', { name: 'Add 3 assets' }).click(); await page.getByText('Added 3 assets.').waitFor(); eq(await page.getByTestId('asset-row').count(), 9);
    const t2 = (await page.getByTestId('asset-row').filter({ hasText: 'T-2' }).innerText()).replace(/\s+/g, ' '); ok(/Fan\/blower/.test(t2) && /x, y/.test(t2), t2);
    const t3 = (await page.getByTestId('asset-row').filter({ hasText: 'T-3' }).innerText()).replace(/\s+/g, ' '); ok(/Belt conveyor/.test(t3), 'type canonicalised: ' + t3);
    await box.fill(Array.from({ length: 501 }, (_, i) => 'L-' + i).join('\n')); await page.getByText('That is 501 lines. Paste at most 500 at a time.').waitFor(); ok(await page.getByRole('button', { name: /^Add \d+ assets$/ }).isDisabled());
    await box.fill(''); await page.getByRole('button', { name: 'Close' }).click();
  });
  await sub('stats-linked', 'Stats follow investigations by tag: a 3-events/yr investigation with annual loss $9,000 on QA-1 shows 1 / 3 / $9,000', async () => {
    await h.demoNew(page); await f.fillProblem(page, { title: 'F-REG stats', asset: 'a', site: 's', eventDate: '2026-01-01', whatHappened: 'w', where: 'w', when: 'w', impact: 'i' });
    await f.fillLoss(page, { events: 3, hours: 5, rate: 10, unit: 'u', margin: 40, repair: 1000, cur: '$' }); // hand: 50 units x $40 = 2000 + 1000 = 3000 per event x 3 = 9000
    await assetDetails(page, { tag: ' qa-1 ' }); await waitSaved(page); await page.goto(BASE + '/app/assets'); await page.getByTestId('asset-row').first().waitFor(); await page.waitForTimeout(800);
    const t = (await page.getByTestId('asset-row').filter({ hasText: 'QA-1' }).innerText()).replace(/\s+/g, ' '); ok(/Investigations 1 Failures a year 3 Annual loss \$9,000/i.test(t) && /F-REG stats/.test(t), t);
  });
  await sub('delete', 'Delete asset: message mentions investigations that use the tag; Cancel keeps it; Delete removes it and keeps the investigation', async () => {
    await page.getByRole('button', { name: 'Delete QA-1' }).click(); const d = page.getByRole('alertdialog'); ok((await d.innerText()).includes('1 investigation uses this tag'), await d.innerText()); await d.getByRole('button', { name: 'Cancel' }).click(); await page.getByTestId('asset-row').filter({ hasText: 'QA-1' }).waitFor();
    await page.getByRole('button', { name: 'Delete QA-1' }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click(); await page.waitForTimeout(500); eq(await page.getByTestId('asset-row').filter({ hasText: 'QA-1' }).count(), 0);
    await page.reload(); await page.getByTestId('asset-row').first().waitFor(); eq(await page.getByTestId('asset-row').filter({ hasText: 'QA-1' }).count(), 0, 'persisted');
    await page.goto(BASE + '/app'); await e.dashStats(page); ok((await e.dashRows(page)).some(r => r.includes('F-REG stats')));
  });
  await sub('layout', 'Register page layout: no overflow at this width; long values wrap', async () => {
    await page.goto(BASE + '/app/assets'); await page.getByTestId('asset-row').first().waitFor(); await page.getByRole('button', { name: 'Add asset', exact: true }).click(); const form = page.getByRole('form', { name: 'Add an asset' });
    await form.getByLabel('Asset tag', { exact: true }).fill('LONG-' + 'X'.repeat(300)); await form.getByLabel('Duty or service', { exact: true }).fill('W'.repeat(2000)); await form.getByRole('button', { name: 'Add asset' }).click(); await page.waitForTimeout(600);
    const o = await h.overflowX(page); await h.shot(page, 'assets-long-' + mode); ok(o.sw <= o.cw, `overflow ${o.sw}>${o.cw}`);
  });
});

FT('F-REG-2', 'Asset register signed in: empty, persistence, A/B isolation, direct API access denied', ['acct-desk'], async (page, sub) => {
  const tag = 'ISO-' + Date.now().toString().slice(-6);
  await page.goto(BASE + '/app/assets'); await page.getByTestId('asset-row').first().waitFor();
  if (await page.getByTestId('register-unavailable').count()) { h.note('observation', 'register unavailable on this server'); return; }
  await sub('add-persist', 'Asset added signed in persists after reload and shows in A\'s list', async () => {
    await page.getByRole('button', { name: 'Add asset', exact: true }).click(); const form = page.getByRole('form', { name: 'Add an asset' }); await form.getByLabel('Asset tag', { exact: true }).fill(tag); await form.getByRole('button', { name: 'Add asset' }).click();
    await page.getByTestId('asset-row').filter({ hasText: tag }).waitFor(); await page.reload(); await page.getByTestId('asset-row').filter({ hasText: tag }).waitFor();
  });
  await sub('b-sees-own', 'User B\'s register has the 5 sample assets and does not show A\'s asset', async () => withPage(page.context().browser(), { storageState: SB }, async (pb) => {
    await pb.goto(BASE + '/app/assets'); await pb.getByTestId('asset-row').first().waitFor(); await pb.waitForTimeout(800); const tags = await pb.getByTestId('asset-row').evaluateAll(els => els.map(e => e.querySelector('h2').childNodes[0].textContent.trim()));
    ok(!tags.includes(tag), 'B can see A\'s asset: ' + tags.join(',')); ok(['P-101', 'P-102', 'P-103', 'P-210', 'P-215'].every(t => tags.includes(t)), 'B sample assets: ' + tags.join(','));
  }));
  await sub('b-api', 'User B cannot read, change or delete A\'s asset row through the API; anonymous gets nothing', async () => withPage(page.context().browser(), { storageState: SB }, async (pb) => {
    let apikey = null, base = null; pb.on('request', rq => { const m = /^(https:\/\/[^/]+)\/rest\/v1\/assets/.exec(rq.url()); if (m && rq.headers()['apikey']) { apikey = rq.headers()['apikey']; base = m[1]; } });
    await pb.goto(BASE + '/app/assets'); await pb.getByTestId('asset-row').first().waitFor(); ok(apikey, 'no REST traffic seen for assets');
    const out = await pb.evaluate(async ({ base, apikey, tag }) => {
      const k = Object.keys(localStorage).find(x => /auth-token/.test(x)); const tok = JSON.parse(localStorage.getItem(k)).access_token; const H = { apikey, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', Prefer: 'return=representation' };
      const all = await (await fetch(`${base}/rest/v1/assets?select=id,data`, { headers: H })).json(); const aRow = Array.isArray(all) ? all.find(r => JSON.stringify(r.data).includes(tag)) : null;
      const anon = await (await fetch(`${base}/rest/v1/assets?select=id`, { headers: { apikey } })).json();
      return { total: Array.isArray(all) ? all.length : all, seesA: !!aRow, anon };
    }, { base, apikey, tag });
    ok(out.seesA === false, 'B sees A row'); ok(!Array.isArray(out.anon) || out.anon.length === 0, 'anon: ' + JSON.stringify(out.anon).slice(0, 100));
  }));
  await sub('b-direct-write', 'B writing an asset with A\'s tag does not collide with or change A\'s asset', async () => withPage(page.context().browser(), { storageState: SB }, async (pb) => {
    await pb.goto(BASE + '/app/assets'); await pb.getByTestId('asset-row').first().waitFor(); await pb.getByRole('button', { name: 'Add asset', exact: true }).click(); const form = pb.getByRole('form', { name: 'Add an asset' }); await form.getByLabel('Asset tag', { exact: true }).fill(tag); await form.getByRole('button', { name: 'Add asset' }).click();
    await pb.getByTestId('asset-row').filter({ hasText: tag }).waitFor({ timeout: 10000 }); const rowB = pb.getByTestId('asset-row').filter({ hasText: tag }); await rowB.getByRole('button', { name: 'Delete ' + tag }).click(); await pb.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click(); await pb.waitForTimeout(600);
    await page.reload(); await page.getByTestId('asset-row').filter({ hasText: tag }).waitFor(); // A's still there
  }));
  await sub('delete', 'A deletes the asset: gone after reload', async () => {
    await page.getByRole('button', { name: 'Delete ' + tag }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click(); await page.waitForTimeout(600); await page.reload(); await page.getByTestId('asset-row').first().waitFor(); eq(await page.getByTestId('asset-row').filter({ hasText: tag }).count(), 0);
  });
});

// ============================================================ actions redesign + maintenance plan + spares + quality rules
FT('F-CAPA-1', 'Actions step: corrective section, preventive groups, one expanded row at a time, kind, category, task fields', ['demo-desk', 'demo-mob', 'acct-desk'], async (page, sub, mode) => {
  await newInv(page, { title: 'F-CAPA conveyor gearbox', asset: 'Conveyor gearbox' }, { tag: 'GB-7', type: 'Gearbox' });
  await causeRoot(page, 'No oil check on the route', { cat: 'System / Latent', status: 'Verified' }); await f.addCause(page, 'sibling', 'Seal worn out', { cat: 'Physical', root: true });
  await step(page, 'Actions');
  await sub('empty', 'Empty Actions step: corrective section with "No corrective action yet" prompt, one preventive group per root cause with "No action yet"', async () => {
    await page.getByTestId('no-corrective').waitFor(); eq(await page.getByTestId('root-group').count(), 2); eq(await page.getByText('No action yet for this root cause.').count(), 2); await h.shot(page, 'actions-empty-' + mode);
    ok(/Corrective actions/.test(await page.getByTestId('corrective-section').innerText())); ok(/Preventive actions/.test(await page.getByTestId('preventive-section').innerText()));
  });
  await sub('corrective', 'Add corrective action: lands in the Corrective section, is linked to "The failure event", editor opens at once', async () => {
    const li = await f.addAction(page, { kind: 'corrective', desc: 'Replace gearbox seal', owner: 'Kim', due: '2027-02-01', cost: 800 });
    eq(await li.getByLabel('Linked to').inputValue().then(v => v), await li.getByLabel('Linked to').inputValue()); ok((await li.getByLabel('Linked to').locator('option:checked').innerText()).includes('The failure event'));
    eq(await li.getByLabel('Corrective or preventive?').inputValue(), 'corrective'); await li.getByRole('button', { name: 'Close' }).click(); eq(await page.getByTestId('corrective-section').getByTestId('action-row').count(), 1); eq(await page.getByTestId('no-corrective').count(), 0);
  });
  await sub('preventive', 'Add preventive action under each root cause: appears in that group only; kind is Preventive', async () => {
    await f.addAction(page, { cause: 'No oil check on the route', desc: 'Add oil check to the daily route', category: 'Procedure or standard', owner: 'Sam', due: '2027-03-01', cost: 100 });
    const g = page.getByRole('region', { name: 'Actions for root cause: No oil check on the route', exact: true }); eq(await g.getByTestId('action-row').count(), 1); eq(await page.getByRole('region', { name: 'Actions for root cause: Seal worn out', exact: true }).getByTestId('action-row').count(), 0);
    eq(await f.editor(page).getByLabel('Corrective or preventive?').inputValue(), 'preventive');
  });
  await sub('one-open', 'Rows expand in place one at a time: opening another row closes the first; Close button collapses', async () => {
    await f.addAction(page, { cause: 'Seal worn out', desc: 'Fit a seal flush plan', owner: 'Ana', due: '2027-04-01', cost: 50 }); eq(await f.editor(page).count(), 1);
    await f.rows(page).nth(0).getByRole('button', { name: /^Edit action/ }).click(); eq(await f.editor(page).count(), 1); ok((await f.editor(page).getByLabel('What will be done?').inputValue()).includes('Replace gearbox seal'));
    await f.editor(page).getByRole('button', { name: 'Close' }).click(); eq(await f.editor(page).count(), 0);
    const collapsed = f.rows(page).nth(1); const txt = (await collapsed.innerText()).replace(/\s+/g, ' '); ok(/Add oil check/.test(txt) && /Procedure or standard/.test(txt) && /Sam/.test(txt) && /1 Mar 2027/.test(txt) && /Open/.test(txt) && /\$100/.test(txt), txt);
  });
  await sub('tiles', 'Tiles: total action cost 800 + 100 + 50 = $950; 0 of 3 done; root causes without action 0', async () => {
    const t = (await page.locator('dl').first().innerText()).replace(/\s+/g, ' ').toLowerCase(); ok(t.includes('total action cost $950') && t.includes('actions 0 of 3 done') && t.includes('root causes without action 0'), t);
  });
  await sub('task-fields', 'Task fields appear only for Maintenance task / Condition monitoring; changing category away hides them', async () => {
    const li = await f.openAction(page, 1); eq(await page.getByTestId('task-fields').count(), 0);
    await li.getByLabel('Category', { exact: true }).selectOption({ label: 'Maintenance task' }); await page.getByTestId('task-fields').waitFor();
    for (const l of ['Task description', 'Do this every', 'Interval unit', 'Craft or trade', 'New task or a change?']) await page.getByTestId('task-fields').getByLabel(l, { exact: true }).waitFor();
    await li.getByLabel('Category', { exact: true }).selectOption({ label: 'Condition monitoring' }); await page.getByTestId('task-fields').waitFor(); await li.getByLabel('Category', { exact: true }).selectOption({ label: 'Training' }); eq(await page.getByTestId('task-fields').count(), 0);
    await li.getByLabel('Category', { exact: true }).selectOption({ label: 'Maintenance task' }); await h.shot(page, 'actions-task-fields-' + mode);
  });
  await sub('categories', 'Category list offers the 8 categories + Not set', async () => {
    const opts = await f.editor(page).getByLabel('Category', { exact: true }).locator('option').allInnerTexts(); eq(opts, ['Not set', 'Repair or restore', 'Design or equipment change', 'Maintenance task', 'Condition monitoring', 'Spares holding', 'Procedure or standard', 'Training', 'Operating practice']);
  });
  await sub('kind-switch', 'Corrective -> Preventive moves a failure-event action onto the first root cause; Preventive -> Corrective keeps its root-cause link and the action moves to the Corrective section', async () => {
    const li = await f.openAction(page, 0); await li.getByLabel('Corrective or preventive?').selectOption({ label: 'Preventive' }); const linked = await li.getByLabel(/Fixes this root cause|Re-link to a root cause/).inputValue(); ok(linked !== '', 'preventive action left unlinked');
    eq(await page.getByTestId('corrective-section').getByTestId('action-row').count(), 0); await li.getByLabel('Corrective or preventive?').selectOption({ label: 'Corrective' }); eq(await page.getByTestId('corrective-section').getByTestId('action-row').count(), 1);
    await page.getByRole('button', { name: 'Close' }).click();
  });
  await sub('delete', 'Delete action: dialog, cancel keeps, confirm removes; tiles update', async () => {
    const n0 = await f.rows(page).count(); const li = await f.openAction(page, 2); await li.getByRole('button', { name: /^Delete action/ }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click(); eq(await f.rows(page).count(), n0);
    await li.getByRole('button', { name: /^Delete action/ }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click(); eq(await f.rows(page).count(), n0 - 1);
  });
  await sub('persist', 'Actions with kind, category, task survive reload', async () => {
    await waitSaved(page); await page.reload(); await step(page, 'Actions'); const li = await f.openAction(page, 0); const kinds = await li.getByLabel('Corrective or preventive?').inputValue(); ok(['corrective', 'preventive'].includes(kinds));
    await page.getByTestId('root-group').first().waitFor();
  });
  await sub('layout', 'Actions step layout at this width: no overflow, rows fit', async () => { await f.editor(page).getByRole('button', { name: 'Close' }).click(); const o = await h.overflowX(page); await h.shot(page, 'actions-layout-' + mode); ok(o.sw <= o.cw, `overflow ${o.sw}>${o.cw}`); });
});

FT('F-PLAN-1', 'Maintenance plan changes: lines, intervals, planner text copied to the clipboard, report section', ['demo-desk', 'demo-mob', 'acct-desk'], async (page, sub, mode) => {
  await newInv(page, { title: 'F-PLAN pump seal', asset: 'Seal water pump' }, { tag: 'SP-9', type: 'Centrifugal pump' });
  await causeRoot(page, 'Flush strainer never cleaned', { cat: 'System / Latent' });
  await step(page, 'Actions');
  await sub('empty', 'No tasks: the plan section explains how tasks appear and has no Copy button', async () => { await page.getByTestId('maintenance-plan').getByText('No maintenance tasks yet.').waitFor(); eq(await page.getByRole('button', { name: 'Copy for the planner' }).count(), 0); });
  const mk = async (desc, cat, task) => {
    const li = await f.addAction(page, { cause: 'Flush strainer never cleaned', desc, category: cat, owner: task.owner || '', due: task.due, cost: 0 });
    if (task.text !== undefined) await page.getByTestId('task-fields').getByLabel('Task description', { exact: true }).fill(task.text);
    if (task.every !== undefined) await f.typeNumIn(page.getByTestId('task-fields'), 'Do this every', task.every);
    if (task.unit) await page.getByTestId('task-fields').getByLabel('Interval unit', { exact: true }).selectOption({ label: task.unit });
    if (task.craft) await page.getByTestId('task-fields').getByLabel('Craft or trade', { exact: true }).fill(task.craft);
    if (task.change) await page.getByTestId('task-fields').getByLabel('New task or a change?', { exact: true }).selectOption({ label: task.change });
    await li.getByRole('button', { name: 'Close' }).click();
  };
  await mk('Clean the flush strainer', 'Maintenance task', { text: 'Clean flush strainer and check flow', every: 3, unit: 'months', craft: 'Mechanical fitter', owner: 'Sam Patel', due: '2027-03-01' });
  await mk('Vibration route reading', 'Condition monitoring', { text: 'Take bearing vibration reading', every: 500, unit: 'hours run', craft: 'Reliability tech', change: 'A change to an existing task', owner: 'Ana', due: '2027-04-15' });
  await mk('Weekly walk-down', 'Maintenance task', { every: 1, unit: 'weeks' });
  await mk('Half-weekly check', 'Maintenance task', { text: 'Check', every: 2.5, unit: 'weeks' });
  await sub('lines', 'Plan lists the 4 tasks with: New/Change, interval text ("every 3 months", "every 500 hours run", "every week", "every 2.5 weeks"), craft, root cause', async () => {
    const t = (await page.getByTestId('maintenance-plan').innerText()).replace(/\s+/g, ' ');
    for (const s of ['New task', 'Clean flush strainer and check flow', 'every 3 months', 'Mechanical fitter', 'Change to existing task', 'Take bearing vibration reading', 'every 500 hours run', 'Reliability tech', 'every week', 'every 2.5 weeks', 'Flush strainer never cleaned', 'Sam Patel', '1 Mar 2027']) ok(t.includes(s), `plan missing "${s}" in ${t.slice(0, 500)}`);
    await h.shot(page, 'plan-' + mode);
  });
  await sub('fallbacks', 'A task with no description uses the action text; no craft shows "Not set"', async () => { const t = (await page.getByTestId('maintenance-plan').innerText()).replace(/\s+/g, ' '); ok(t.includes('Weekly walk-down'), t.slice(0, 300)); ok(/Not set/.test(t)); });
  await sub('copy', '"Copy for the planner" puts tab-separated text with header, 10 columns and one row per task on the clipboard (hand-built expected text)', async () => {
    await page.getByRole('button', { name: 'Copy for the planner' }).click(); await page.getByText('Copied. Paste it into a spreadsheet or an email.').waitFor();
    const clip = await page.evaluate(() => navigator.clipboard.readText()); const lines = clip.split('\n');
    eq(lines[0], 'Maintenance plan changes: SP-9 Seal water pump'); eq(lines[1], 'Source: root cause analysis "F-PLAN pump seal"'); eq(lines[2], '');
    eq(lines[3], ['Asset tag', 'New or changed', 'Type', 'Task', 'Interval', 'Craft', 'Prevents', 'Owner', 'Due', 'Status'].join('\t'));
    eq(lines[4], ['SP-9', 'New task', 'Maintenance task', 'Clean flush strainer and check flow', 'every 3 months', 'Mechanical fitter', 'Flush strainer never cleaned', 'Sam Patel', '1 Mar 2027', 'Open'].join('\t'));
    eq(lines[5], ['SP-9', 'Change to existing task', 'Condition monitoring', 'Take bearing vibration reading', 'every 500 hours run', 'Reliability tech', 'Flush strainer never cleaned', 'Ana', '15 Apr 2027', 'Open'].join('\t'));
    eq(lines[6].split('\t')[4], 'every week'); eq(lines[6].split('\t')[5], 'Craft not set'); eq(lines.length, 8);
  });
  await sub('quality-task', 'Quality: tasks missing description/interval are flagged ("a task description and an interval")', async () => {
    await mk('No detail at all', 'Maintenance task', {}); const q = await quality(page); ok(has(q, /Maintenance plan item "No detail at all" needs a task description and an interval before a planner can load it/), q.join('|'));
    ok(!has(q, /Maintenance plan item "Weekly walk-down"/), 'weekly walk-down has an interval and falls back to the action text: ' + q.join('|'));
  });
  await sub('report', 'Report has a "Maintenance plan changes" section with the same tasks', async () => {
    const t = (await e.reportText(page)).toLowerCase(); ok(t.includes('maintenance plan changes') && t.includes('every 3 months') && t.includes('clean flush strainer and check flow'), t.slice(0, 200));
  });
  await sub('persist', 'Tasks (interval, craft, change) survive reload', async () => {
    await waitSaved(page); await page.reload(); await step(page, 'Actions'); const t = (await page.getByTestId('maintenance-plan').innerText()).replace(/\s+/g, ' '); ok(t.includes('every 500 hours run') && t.includes('Reliability tech') && t.includes('Change to existing task'), t.slice(0, 300));
  });
});

FT('F-SPARES-1', 'Spares check: flag at exactly 14 days, not at 13 or when in stock; one-tap spares action; quality rule; report', ['demo-desk', 'demo-mob', 'acct-desk'], async (page, sub, mode) => {
  await newInv(page, { title: 'F-SPARES motor', asset: 'Drive motor' }, { tag: 'M-77', type: 'Electric motor' }); await causeRoot(page, 'Spare motor not stocked', { cat: 'System / Latent' }); await step(page, 'Actions');
  const sp = page.getByRole('region', { name: 'Spares check' }); const yes = async (grp, v) => sp.getByRole('radiogroup', { name: grp }).getByRole('radio', { name: v, exact: true }).click();
  await sub('fields', 'Spares check shows only "Was a spare part needed?" until Yes is chosen; then stock, lead time, coverage appear', async () => {
    await sp.getByRole('radiogroup', { name: 'Was a spare part needed?' }).waitFor(); eq(await sp.getByRole('radiogroup', { name: 'Was it in stock?' }).count(), 0); await yes('Was a spare part needed?', 'Yes'); await sp.getByRole('radiogroup', { name: 'Was it in stock?' }).waitFor(); await sp.getByLabel('Supplier lead time').waitFor(); await sp.getByLabel('How was the gap covered?').waitFor();
  });
  await yes('Was it in stock?', 'No');
  for (const [days, flag] of [[13, false], [14, true], [60, true], [0, false]]) await sub('lead-' + days, `Not in stock, lead time ${days} days: flag ${flag ? 'shown' : 'not shown'} (threshold is 14)`, async () => {
    await f.typeNumIn(sp, 'Supplier lead time', days); eq(await page.getByTestId('spares-flag').count(), flag ? 1 : 0); const q = await quality(page); eq(has(q, /Critical spare with long lead time and no stock: the supplier lead time is \d+ days/), flag, q.join('|'));
  });
  await sub('in-stock', 'In stock = Yes removes the flag even with 60 days lead time', async () => { await f.typeNumIn(sp, 'Supplier lead time', 60); await yes('Was it in stock?', 'Yes'); eq(await page.getByTestId('spares-flag').count(), 0); await yes('Was it in stock?', 'No'); eq(await page.getByTestId('spares-flag').count(), 1); });
  await sub('one-tap', '"Add a spares holding action": adds a preventive Spares holding action for the first root cause with the asset and lead time in the text; flag text says it is on the list; quality rule clears', async () => {
    await f.typeNumIn(sp, 'Supplier lead time', 21); await page.getByRole('button', { name: 'Add a spares holding action' }).click(); await page.getByText('A spares holding action is on the list.').waitFor(); eq(await page.getByRole('button', { name: 'Add a spares holding action' }).count(), 0);
    const row = f.rows(page).filter({ hasText: 'Hold a spare in stores' }); await row.waitFor(); const t = await row.innerText(); ok(/Hold a spare in stores for M-77 \(supplier lead time 21 days\)/.test(t) && /Spares holding/.test(t), t);
    const q = await quality(page); ok(!has(q, /Critical spare/), q.join('|')); await h.shot(page, 'spares-' + mode);
  });
  await sub('report', 'Report shows the Spares check section with the flag line', async () => { const t = (await e.reportText(page)).toLowerCase(); ok(t.includes('spares check') && t.includes('21 days') && t.includes('flag: critical spare with long lead time and no stock'), t.slice(0, 200)); });
  await sub('persist', 'Spares answers survive reload', async () => { await waitSaved(page); await page.reload(); await step(page, 'Actions'); eq(await page.getByLabel('Supplier lead time').inputValue(), '21'); });
});

FT('F-QUAL-1', 'New quality rules: each triggers, its jump link lands on the right step, and it clears when fixed', ['demo-desk', 'acct-desk'], async (page, sub, mode) => {
  await newInv(page, { title: 'F-QUAL rules' }, { tag: 'Q-1', type: 'Gearbox' });
  await causeRoot(page, 'Gear teeth worn', { cat: 'Physical', status: 'Verified' });
  await sub('natural', 'natural-deterioration-unmanaged: verified + natural wear with no maintenance task or condition monitoring action is flagged; jump -> Actions; a Condition monitoring action on its branch clears it', async () => {
    await page.getByRole('radio', { name: 'Natural deterioration' }).click(); eq(await page.getByRole('radio', { name: 'Natural deterioration' }).getAttribute('aria-checked'), 'true');
    let q = await quality(page); ok(has(q, /"Gear teeth worn" is verified as natural deterioration, but there is no maintenance task or condition monitoring action to manage it/), q.join('|'));
    await step(page, 'Report'); await f.openQuality(page); await f.findings(page).filter({ hasText: 'natural deterioration' }).getByRole('button', { name: /^Go to/ }).click(); eq(await f.activeStep(page), 'Actions');
    await f.addAction(page, { cause: 'Gear teeth worn', desc: 'Oil analysis every quarter', category: 'Condition monitoring', owner: 'Sam', due: '2027-05-01', cost: 0 });
    await page.getByTestId('task-fields').getByLabel('Task description', { exact: true }).fill('Take oil sample'); await f.typeNumIn(page.getByTestId('task-fields'), 'Do this every', 3);
    q = await quality(page); ok(!has(q, /natural deterioration/), q.join('|'));
  });
  await sub('forced-no-flag', 'The same cause marked Forced (not natural) is not flagged by that rule; toggling the type of wear off clears it', async () => {
    await step(page, 'Cause tree'); await f.selectCause(page, 'Gear teeth worn'); const f1 = page.getByRole('radio', { name: 'Forced deterioration' }); await f1.click(); eq(await f1.getAttribute('aria-checked'), 'true'); await f1.click(); eq(await f1.getAttribute('aria-checked'), 'false');
    const q = await quality(page); ok(!has(q, /natural deterioration/));
  });
  await sub('task-incomplete', 'task-missing-detail: a maintenance task with no interval is flagged; entering the interval clears it', async () => {
    await step(page, 'Actions'); const li = await f.openAction(page, 0); await f.typeNumIn(page.getByTestId('task-fields'), 'Do this every', ''); let q = await quality(page); ok(has(q, /Maintenance plan item "Oil analysis every quarter" needs an interval before a planner can load it/), q.join('|'));
    await li.getByRole('button', { name: 'Close' }).catch(() => {}); await f.openAction(page, 0); await f.typeNumIn(page.getByTestId('task-fields'), 'Do this every', 3); q = await quality(page); ok(!has(q, /Maintenance plan item/), q.join('|'));
  });
  await sub('system-systemic', 'system-root-without-systemic-action: a System/Latent root cause whose only (categorised) action is a Repair is flagged; a Procedure action clears it; uncategorised actions are not judged', async () => {
    await step(page, 'Cause tree'); await f.selectCause(page, 'Gear teeth worn'); await f.addCause(page, 'why', 'No lubrication standard', { cat: 'System / Latent', root: true, status: 'Hypothesis' });
    await f.addAction(page, { cause: 'No lubrication standard', desc: 'Regrease once', category: 'Repair or restore', owner: 'Ana', due: '2027-06-01', cost: 10 }); let q = await quality(page);
    ok(has(q, /System \/ Latent root cause "No lubrication standard" has no procedure, training, maintenance-task or design action/), q.join('|'));
    await step(page, 'Report'); await f.openQuality(page); await f.findings(page).filter({ hasText: 'has no procedure, training' }).getByRole('button', { name: /^Go to/ }).click(); eq(await f.activeStep(page), 'Actions');
    const li = await f.openAction(page, 1); const cats = await li.getByLabel('Category', { exact: true }).inputValue(); for (const c of ['Training', 'Design or equipment change', 'Maintenance task', 'Procedure or standard']) { await li.getByLabel('Category', { exact: true }).selectOption({ label: c }); q = await quality(page); ok(!has(q, /has no procedure, training/), c + ' should count as systemic: ' + q.join('|')); }
    await li.getByLabel('Category', { exact: true }).selectOption({ label: 'Operating practice' }); q = await quality(page); ok(has(q, /has no procedure, training/), 'Operating practice is not a systemic category: ' + q.join('|'));
    await li.getByLabel('Category', { exact: true }).selectOption({ label: 'Not set' }); q = await quality(page); ok(!has(q, /has no procedure, training/), 'uncategorised action must not be judged: ' + q.join('|'));
    await li.getByLabel('Category', { exact: true }).selectOption({ label: 'Procedure or standard' });
  });
  await sub('corrective-only', 'corrective-without-preventive: a root cause that has only a corrective action is flagged (high); adding a preventive one clears it; jump -> Actions', async () => {
    await step(page, 'Cause tree'); await f.selectCause(page, 'No lubrication standard'); await f.addCause(page, 'sibling', 'Operator skipped the greasing round', { cat: 'Human', root: true });
    await f.addAction(page, { kind: 'corrective', desc: 'Re-grease the gearbox', owner: 'Kim', due: '2027-06-01', cost: 5 }); const li = f.editor(page); await li.getByLabel('Linked to').selectOption({ label: 'Operator skipped the greasing round' });
    let q = await quality(page); ok(has(q, /Root cause "Operator skipped the greasing round" has corrective actions but no preventive action/), q.join('|'));
    ok(await f.findings(page).filter({ hasText: 'has corrective actions but no preventive action' }).locator('.chip').first().innerText().then(t => /Fix first/.test(t)), 'should be High');
    await step(page, 'Report'); await f.openQuality(page); await f.findings(page).filter({ hasText: 'has corrective actions but no preventive' }).getByRole('button', { name: /^Go to/ }).click(); eq(await f.activeStep(page), 'Actions');
    await f.addAction(page, { cause: 'Operator skipped the greasing round', desc: 'Add greasing to the shift checklist', category: 'Procedure or standard', owner: 'Lee', due: '2027-06-10', cost: 0 }); q = await quality(page); ok(!has(q, /has corrective actions but no preventive/), q.join('|'));
  });
  await sub('unlinked', 'action-not-linked: un-flagging the root cause of an action flags it; the action appears under "Not linked to a root cause"; re-linking clears it', async () => {
    await step(page, 'Cause tree'); await f.selectCause(page, 'Operator skipped the greasing round'); await page.getByRole('checkbox', { name: /This is a root cause/ }).uncheck();
    let q = await quality(page); ok(has(q, /Action "Add greasing to the shift checklist" is not linked to a root cause/), q.join('|'));
    await step(page, 'Actions'); await page.getByTestId('unlinked-actions').waitFor(); const li = await f.openAction(page, (await f.rows(page).count()) - 1); await li.getByLabel('Re-link to a root cause').selectOption({ label: 'No lubrication standard' }); q = await quality(page); ok(!has(q, /Add greasing to the shift checklist" is not linked/), q.join('|'));
  });
  await sub('severity-links', 'Every new finding has a "Go to ..." button and the panel count matches the number of findings', async () => {
    const t = await page.locator('section[aria-label="Quality check"] > button').innerText(); const n = await f.findings(page).count(); const m = /(\d+) finding/.exec(t); ok(!m || Number(m[1]) === n, t + ' vs ' + n);
    const links = await f.findings(page).getByRole('button', { name: /^Go to/ }).count(); eq(links, n);
  });
});

FT('F-DET-1', 'Cause node deterioration: Natural / Forced toggles, persistence, shown in report', ['demo-desk', 'demo-mob'], async (page, sub, mode) => {
  await newInv(page, { title: 'F-DET wear' }); await causeRoot(page, 'Liner worn', { cat: 'Physical', status: 'Verified' }); const nat = page.getByRole('radio', { name: 'Natural deterioration' }), frc = page.getByRole('radio', { name: 'Forced deterioration' });
  await sub('toggle', 'Natural, Forced, and tap-again-to-clear behave as radios; default is not decided; help text changes', async () => {
    eq(await nat.getAttribute('aria-checked'), 'false'); await nat.click(); eq(await nat.getAttribute('aria-checked'), 'true'); eq(await frc.getAttribute('aria-checked'), 'false'); await frc.click(); eq(await nat.getAttribute('aria-checked'), 'false'); eq(await frc.getAttribute('aria-checked'), 'true'); await frc.click(); eq(await frc.getAttribute('aria-checked'), 'false');
    await page.getByText('Is this wear normal for the service, or did we cause it?').waitFor();
  });
  await sub('persist', 'Deterioration survives reload', async () => { await nat.click(); await waitSaved(page); await page.reload(); await step(page, 'Cause tree'); await f.selectCause(page, 'Liner worn'); eq(await page.getByRole('radio', { name: 'Natural deterioration' }).getAttribute('aria-checked'), 'true'); });
  await sub('panel-top', 'The failure event itself has no deterioration control', async () => { await page.locator('[data-node-id]').first().getByRole('button', { name: /^Select cause/ }).click(); eq(await page.getByRole('radio', { name: /deterioration/ }).count(), 0); });
});

// ============================================================ similar failures
FT('F-SIM-1', 'Similar past failures: ranking by tag > type > failure mode > words, minimum score, reasons, copy cause arrives as Hypothesis', ['demo-desk', 'demo-mob', 'acct-desk'], async (page, sub, mode) => {
  // Other investigations. Hand scores against the current one (tag X-1, type Gearbox, mode Bearing failure,
  // words: gearbox, bearing, overheating, conveyor, drive): O1 tag+type+mode(+words) >= 85; O2 type+mode >= 35; O3 words only (2 shared = 6);
  // O4 one shared word (3 < 6, hidden); O5 nothing in common (hidden).
  const o = [
    ['F-SIM O1 same tag', { title: 'Gearbox bearing overheating on conveyor drive', what: 'Bearing ran hot' }, { tag: 'X-1', type: 'Gearbox', mode: 'Bearing failure' }, 'O1 cause: lube starvation'],
    ['F-SIM O2 type and mode', { title: 'Gearbox bearing failure on mill', what: 'Noise' }, { tag: 'Y-2', type: 'Gearbox', mode: 'Bearing failure' }, 'O2 cause: bad alignment'],
    ['F-SIM O3 words only', { title: 'Pump bearing overheating alarm', what: 'Alarm' }, { tag: 'Z-3', type: 'Centrifugal pump', mode: 'Overheating' }, 'O3 cause'],
    ['F-SIM O4 one word', { title: 'Conveyor idler jam', what: 'Idler stuck' }, { tag: 'W-4', type: 'Screw conveyor', mode: 'Blockage' }, 'O4 cause'],
    ['F-SIM O5 unrelated', { title: 'Tank level sensor drift', what: 'Reading wrong' }, { tag: 'V-5', type: 'Tank/vessel', mode: 'Instrumentation or control fault' }, 'O5 cause'],
  ];
  for (const [title, p, a, cause] of o) { await newInv(page, { title, what: p.what }, a); await causeRoot(page, cause, { cat: 'System / Latent', status: 'Verified' }); await waitSaved(page); }
  // O1 also gets a completed action and a verified fix for the "what fixed it" column: skip detail, check text only
  await newInv(page, { title: 'F-SIM current gearbox bearing overheating', what: 'Conveyor drive bearing overheating' }, { tag: 'x-1', type: 'Gearbox', mode: 'Bearing failure' }); await waitSaved(page);
  await sub('rank', 'Panel on the Problem step lists O1, then O2, then O3; O4 (one shared word) and O5 are not listed', async () => {
    await step(page, 'Problem'); await page.getByRole('heading', { name: 'Similar past failures' }).waitFor(); await page.getByTestId('similar-list').waitFor({ timeout: 15000 });
    const titles = await page.getByTestId('similar-item').evaluateAll(els => els.map(e => e.querySelector('p').textContent.trim())); ok(titles[0].startsWith('F-SIM O1') && titles[1].startsWith('F-SIM O2') && titles[2].startsWith('F-SIM O3'), titles.join(' | ')); ok(!titles.some(t => /O4|O5/.test(t)), 'weak matches listed: ' + titles.join(' | '));
    ok(titles.filter(t => t.startsWith('F-SIM O')).length === 3, titles.join(' | ')); await h.shot(page, 'similar-' + mode);
  });
  await sub('reasons', 'Reasons shown: O1 "Same asset (X-1)", "Same asset type (Gearbox)", "Same failure mode (Bearing failure)"; O2 type+mode but no tag; O3 shared words only', async () => {
    const reasons = async (i) => (await page.getByTestId('similar-item').nth(i).getByRole('list', { name: 'Why it matches' }).innerText()).replace(/\s+/g, ' ');
    const r1 = await reasons(0), r2 = await reasons(1), r3 = await reasons(2);
    ok(/Same asset \(X-1\)/.test(r1) && /Same asset type \(Gearbox\)/.test(r1) && /Same failure mode \(Bearing failure\)/.test(r1) && /Shared words/.test(r1), r1);
    ok(!/Same asset \(/.test(r2) && /Same asset type \(Gearbox\)/.test(r2) && /Same failure mode/.test(r2), r2); ok(/Shared words:.*bearing/.test(r3) && /overheating/.test(r3) && !/Same asset/.test(r3) && !/Same failure mode/.test(r3.replace('Overheating', '')), r3);
  });
  await sub('cause-text', 'Each match shows its root causes and "What fixed it" text; Open link goes to that investigation', async () => {
    const item = page.getByTestId('similar-item').first(); ok((await item.innerText()).includes('O1 cause: lube starvation')); ok(/No completed actions yet/.test(await item.innerText())); await item.getByRole('link', { name: 'Open' }).click(); await page.waitForURL(/investigations\//); await page.getByLabel('Title', { exact: true }).waitFor(); ok((await page.getByLabel('Title', { exact: true }).inputValue()).startsWith('F-SIM O1'));
    await page.goBack(); await page.getByRole('heading', { name: 'Similar past failures' }).waitFor();
  });
  await sub('copy', '"Copy this cause into my tree" adds it under the failure event as a Hypothesis (not verified, not a root cause, no evidence); button turns to "Copied"; message with link to the tree', async () => {
    await page.getByTestId('similar-list').waitFor(); await page.getByTestId('similar-item').first().getByRole('button', { name: 'Copy this cause into my tree' }).click(); await page.getByTestId('copy-message').waitFor(); ok((await page.getByTestId('copy-message').innerText()).includes('as a hypothesis'));
    ok(await page.getByTestId('similar-item').first().getByRole('button', { name: 'Copied' }).isDisabled());
    await page.getByRole('button', { name: 'Open the cause tree' }).click(); eq(await f.activeStep(page), 'Cause tree'); await f.selectCause(page, 'O1 cause: lube starvation');
    eq(await page.getByRole('radio', { name: 'Hypothesis', exact: true }).getAttribute('aria-checked'), 'true'); eq(await page.getByRole('radio', { name: 'Verified', exact: true }).getAttribute('aria-checked'), 'false');
    eq(await page.getByRole('checkbox', { name: /This is a root cause/ }).isChecked(), false); eq(await page.getByRole('checkbox', { name: /^E\d+\./ }).count(), 0);
    ok(/Photo|Physical|Human|System/.test(await page.locator('[data-node-id][data-selected="true"]').innerText()));
  });
  await sub('cause-step-panel', 'The Cause tree step also shows the Similar past failures panel and a copy there adds under the selected cause', async () => {
    await step(page, 'Cause tree'); await page.getByRole('heading', { name: 'Similar past failures' }).waitFor(); await page.getByTestId('similar-list').waitFor();
    const before = await page.locator('[data-node-id]').count(); await page.getByTestId('similar-item').nth(1).getByRole('button', { name: 'Copy this cause into my tree' }).click(); await page.waitForTimeout(300); eq(await page.locator('[data-node-id]').count(), before + 1);
  });
  await sub('empty', 'An investigation with no similar ones shows "No similar failures yet" guidance', async () => {
    await newInv(page, { title: 'Totally different widget polishing', what: 'Polish worn off' }, { tag: 'UNIQ-9', type: 'Filler', mode: 'Corrosion' }); await step(page, 'Problem'); await page.getByTestId('similar-empty').waitFor();
  });
  await sub('self-excluded', 'An investigation is never listed as similar to itself and a copy of it (Duplicate) is listed as similar', async () => {
    await page.goto(BASE + '/app'); await e.dashStats(page); await page.getByRole('button', { name: /^Duplicate F-SIM current/ }).click(); await page.waitForURL(/investigations\/(?!sample)/); await step(page, 'Problem'); await page.getByTestId('similar-list').waitFor();
    const titles = await page.getByTestId('similar-item').evaluateAll(els => els.map(e => e.querySelector('p').textContent.trim())); ok(titles.some(t => t === 'F-SIM current gearbox bearing overheating'), titles.join(' | ')); ok(!titles.some(t => t.startsWith('Copy of')), 'listed itself: ' + titles.join(' | '));
  });
});

// ============================================================ rollout
FT('F-ROLL-1', 'Roll this fix out: candidate ranking (hand scores), reasons, checks, statuses, progress, dashboard count, report', ['demo-desk', 'demo-mob', 'acct-desk'], async (page, sub, mode) => {
  // Use the sample's register: subject P-101 slurry pump. Hand scores: P-102 = 10+15 (3 duty words)+15 (same make)+9 (A) = 49; P-215 = 10+5+15+6 = 36; P-103 = 10+0+6+6 = 22; P-210 (other type) never listed.
  await newInv(page, { title: 'F-ROLL slurry pump seal' }, { tag: 'RQ-1', type: 'Slurry pump', make: 'Warman 8/6 AH', duty: 'Slurry feed to the concentrator, single pump with no standby', crit: 'A', mode: 'Seal or gland leak' });
  await causeRoot(page, 'Seal flush not on any route', { cat: 'System / Latent', status: 'Verified' }); await f.addAction(page, { cause: 'Seal flush not on any route', desc: 'Add flush check to route', category: 'Procedure or standard', owner: 'Sam', due: '2027-01-10', cost: 100 });
  await step(page, 'Verify'); const panel = page.getByRole('region', { name: 'Roll this fix out' }).or(page.locator('section:has(h2:has-text("Roll this fix out"))'));
  await sub('encourage', 'Before verification the panel says "Best done once the fix is verified"', async () => { await page.getByTestId('rollout-encourage').waitFor(); ok(/Best done once the fix is verified/.test(await page.getByTestId('rollout-encourage').innerText())); });
  await sub('rank', 'Candidates: P-102, P-215, P-103 in that order; the centrifugal pump P-210 and the asset itself are not listed', async () => {
    await page.getByTestId('rollout-candidates').waitFor({ timeout: 15000 }); const tags = await page.getByTestId('rollout-candidates').locator('li').evaluateAll(els => els.map(e => e.querySelector('label span span').childNodes[0].textContent.trim())); eq(tags, ['P-102', 'P-215', 'P-103'], tags.join(','));
    await h.shot(page, 'rollout-candidates-' + mode);
  });
  await sub('reasons', 'Reasons: P-102 same make+model, similar duty (slurry, feed, concentrator), criticality A; P-103 similar make (warman) and criticality B', async () => {
    const li = page.getByTestId('rollout-candidates').locator('li'); const t0 = (await li.nth(0).innerText()).replace(/\s+/g, ' '), t2 = (await li.nth(2).innerText()).replace(/\s+/g, ' ');
    ok(/Same make and model \(Warman 8\/6 AH\)/.test(t0) && /Similar duty \(slurry, feed, concentrator\)/.test(t0) && /Criticality A/.test(t0) && /Same type \(Slurry pump\)/.test(t0), t0); ok(/Similar make or model \(Warman 6\/4 AH\)/.test(t2) && /Criticality B/.test(t2) && !/Similar duty/.test(t2), t2);
  });
  await sub('create', 'Tick P-102 and P-215, default text prefilled from root causes and preventive actions, create 2 checks; ticked ones show "Check created" and can no longer be picked', async () => {
    const txt = page.getByLabel('What to check on each asset'); const v = await txt.inputValue(); ok(v.includes('Seal flush not on any route') && v.includes('Add flush check to route') && v.includes('(Seal or gland leak)'), v);
    ok(await page.getByRole('button', { name: /^Create\s*rollout checks$/ }).isDisabled(), 'create must be disabled with nothing ticked');
    await page.getByTestId('rollout-candidates').locator('li').nth(0).getByRole('checkbox').check(); await page.getByTestId('rollout-candidates').locator('li').nth(1).getByRole('checkbox').check(); await page.getByRole('button', { name: 'Create 2 rollout checks' }).click();
    eq(await page.getByTestId('rollout-check').count(), 2); eq(await page.getByText('Check created').count(), 2); ok(await page.getByTestId('rollout-candidates').locator('li').nth(0).getByRole('checkbox').isDisabled());
    ok(/Rollout progress: 0 of 2 checked/.test(await page.getByTestId('rollout-progress').innerText()));
  });
  await sub('statuses', 'Result options: Open, Checked: no issue, Checked: same problem found, Fixed; progress counts finished ones; "same problem" shows the red notice', async () => {
    const r0 = page.getByTestId('rollout-check').nth(0).getByLabel('Result'); const opts = await r0.locator('option').allInnerTexts(); eq(opts, ['Open', 'Checked: no issue', 'Checked: same problem found', 'Fixed']);
    await r0.selectOption({ label: 'Checked: same problem found' }); let t = (await page.getByTestId('rollout-progress').innerText()).replace(/\s+/g, ' '); ok(/Rollout progress: 1 of 2 checked 1 has the same problem/.test(t), t); await page.getByText('The same problem was found. Fix it, then set the result to Fixed.').waitFor();
    eq(await page.getByRole('progressbar', { name: 'Rollout progress' }).getAttribute('aria-valuenow'), '50'); await r0.selectOption({ label: 'Fixed' }); await page.getByTestId('rollout-check').nth(1).getByLabel('Result').selectOption({ label: 'Checked: no issue' });
    t = (await page.getByTestId('rollout-progress').innerText()).replace(/\s+/g, ' '); ok(/2 of 2 checked/.test(t) && !/same problem/.test(t), t); eq(await page.getByRole('progressbar', { name: 'Rollout progress' }).getAttribute('aria-valuenow'), '100');
  });
  await sub('edit-check', 'Per-check owner, due date and "what to check" can be edited; delete asks for confirmation', async () => {
    const c = page.getByTestId('rollout-check').nth(1); await c.getByLabel('Who will check it').fill('Lee'); await c.getByLabel('Check due').fill('2027-02-02'); await c.getByLabel('What to check').fill('custom check text'); await waitSaved(page); await page.reload(); await step(page, 'Verify'); const c2 = page.getByTestId('rollout-check').nth(1);
    eq(await c2.getByLabel('Who will check it').inputValue(), 'Lee'); eq(await c2.getByLabel('Check due').inputValue(), '2027-02-02'); eq(await c2.getByLabel('What to check').inputValue(), 'custom check text');
    await page.getByRole('button', { name: /^Delete rollout check for P-215/ }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click(); eq(await page.getByTestId('rollout-check').count(), 2);
  });
  await sub('dashboard', 'Dashboard "Rollout checks" tile: open count and "of N created" (hand: 2 created, 0 open now)', async () => {
    await page.goto(BASE + '/app'); await e.dashStats(page); const tile = await page.evaluate(() => [...document.querySelectorAll('section[aria-label="Totals"] > div')].map(d => d.innerText.replace(/\s+/g, ' ')).find(t => /rollout/i.test(t))); ok(tile, 'no rollout tile'); ok(/0/.test(tile) && /2 created/.test(tile), tile);
  });
  await sub('dashboard-open', 'Setting one back to Open and one to same problem: tile shows 1 open and "1 found the same problem"', async () => {
    await page.getByRole('link', { name: /F-ROLL slurry pump seal/ }).first().click(); await page.getByLabel('Title', { exact: true }).waitFor(); await step(page, 'Verify'); await page.getByTestId('rollout-check').nth(0).getByLabel('Result').selectOption({ label: 'Open' }); await page.getByTestId('rollout-check').nth(1).getByLabel('Result').selectOption({ label: 'Checked: same problem found' }); await waitSaved(page);
    await page.goto(BASE + '/app'); await e.dashStats(page); const tile = await page.evaluate(() => [...document.querySelectorAll('section[aria-label="Totals"] > div')].map(d => d.innerText.replace(/\s+/g, ' ')).find(t => /rollout/i.test(t))); ok(/1/.test(tile) && /1 found the same problem/.test(tile), tile);
  });
  await sub('report', 'Report section "Rollout to similar assets" lists the checks with their results', async () => {
    await page.getByRole('link', { name: /F-ROLL slurry pump seal/ }).first().click(); await page.getByLabel('Title', { exact: true }).waitFor(); const t = (await e.reportText(page)).toLowerCase(); ok(t.includes('rollout to similar assets') && t.includes('p-102') && t.includes('p-215') && t.includes('same problem'), t.slice(t.indexOf('rollout') - 20, t.indexOf('rollout') + 400));
  });
  await sub('verified-message', 'When the fix is verified the panel says "The fix is verified. This is the moment to spread it"', async () => {
    await step(page, 'Actions'); await f.setActionStatus(page, 0, 'Done'); await f.fillVerify(page, { date: '2026-11-10', recurred: 'No, it has not recurred', after: 0 }); await page.getByText('The fix is verified.').waitFor();
  });
  await sub('needs-type', 'With no asset type set the panel asks for it and offers "Go to Asset details"', async () => {
    await newInv(page, { title: 'F-ROLL no type' }); await step(page, 'Verify'); await page.getByTestId('rollout-needs-type').waitFor(); await page.getByRole('button', { name: 'Go to Asset details' }).click(); eq(await f.activeStep(page), 'Problem');
  });
  await sub('no-candidates', 'A type with no other assets shows the empty guidance and the "add a similar asset" form', async () => {
    await newInv(page, { title: 'F-ROLL lonely' }, { tag: 'LONE-1', type: 'Boiler' }); await step(page, 'Verify'); await page.getByTestId('rollout-empty').waitFor(); await h.shot(page, 'rollout-empty-' + mode);
  });
});

// ============================================================ sample investigation + upgrade
const V1 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'web', 'lib', 'sample-v1.fixture.json'), 'utf8'));
test('F-SAMPLE-1', 'Sample investigation (round 3 numbers): action cost $32,000, 0 failures after, saving $238,440, payback about 1.6 months, 5 sample assets', async ({ browser, sub }) => withPage(browser, {}, async (page) => {
  await page.goto(BASE + '/app/investigations/sample-p101'); await page.getByLabel('Title', { exact: true }).waitFor();
  await sub('verify', 'Verify step of the sample: before $238,440, after $0, saving $238,440 (verified), action cost $32,000, payback 1.6 months (32,000 / (238,440 / 12) = 1.61)', async () => {
    await step(page, 'Verify'); const t = (await page.locator('dl').last().innerText()).replace(/\s+/g, ' ').toLowerCase();
    for (const s of ['annual loss before $238,440', 'annual loss after $0', 'annual saving (verified) $238,440', 'total action cost $32,000', 'payback period 1.6 months']) ok(t.includes(s), `expected "${s}" in ${t}`);
    eq(Math.round(32000 / (238440 / 12) * 10) / 10, 1.6);
  });
  await sub('actions', 'Sample actions tile: total cost $32,000, all done, none overdue', async () => { await step(page, 'Actions'); const t = (await page.locator('dl').first().innerText()).replace(/\s+/g, ' ').toLowerCase(); ok(t.includes('total action cost $32,000') && t.includes('overdue 0'), t); });
  await sub('report', 'Sample report headline: loss $238,440, verified saving $238,440, action cost $32,000, payback 1.6 months, plus maintenance plan and rollout sections', async () => {
    const t = (await e.reportText(page)).toLowerCase(); for (const s of ['annual loss $238,440', 'annual saving (verified) $238,440', 'action cost $32,000', 'payback 1.6 months', 'maintenance plan changes']) ok(t.includes(s), 'missing ' + s);
  });
  await sub('quality', 'Sample passes the quality check (All clear) including the new rules', async () => { await step(page, 'Problem'); const t = await page.locator('section[aria-label="Quality check"]').innerText(); ok(/All clear/.test(t), t); });
  await sub('assets', 'Register of a fresh demo browser has the 5 sample assets', async () => { await page.goto(BASE + '/app/assets'); await page.getByTestId('asset-row').first().waitFor(); eq(await page.getByTestId('asset-row').count(), 5); });
  await sub('dashboard', 'Dashboard totals for the sample: verified savings $238,440 with cash $57,000 + opportunity $181,440', async () => {
    await page.goto(BASE + '/app'); await e.dashStats(page); const t = await page.evaluate(() => [...document.querySelectorAll('section[aria-label="Totals"] > div')].map(d => d.innerText.replace(/\s+/g, ' '))); ok(t.some(x => /Verified annual savings \$238,440/i.test(x) && x.includes('Cash $57,000 · Opportunity $181,440')), t.join(' | '));
  });
}));

test('F-SAMPLE-2', 'Sample upgrade: an unedited old sample (v1) is silently upgraded; an edited one is left alone', async ({ browser, sub }) => {
  const seed = async (page, inv) => { await f.seedDemo(page, [inv]); };
  const old = () => JSON.parse(JSON.stringify(V1));
  await sub('fixture', 'The v1 fixture is an old sample (action 1 cost $28,000, no asset fields)', async () => { eq(old().actions[0].cost, 28000); ok(!old().problem.assetTag); ok(old().isSample); });
  await sub('unedited', 'Unedited v1 sample stored in the browser is replaced by the current sample (cost $32,000, saving $238,440, asset tag P-101, quality All clear), same id, nothing else lost', async () => withPage(browser, {}, async (page) => {
    const inv = old(); await seed(page, inv); await page.goto(BASE + '/app'); await e.dashStats(page); await page.waitForTimeout(800);
    await page.goto(BASE + '/app/investigations/' + inv.id); await page.getByLabel('Title', { exact: true }).waitFor(); eq(await page.getByLabel('Asset tag', { exact: true }).inputValue(), 'P-101');
    await step(page, 'Verify'); const t = (await page.locator('dl').last().innerText()).replace(/\s+/g, ' ').toLowerCase(); ok(t.includes('total action cost $32,000') && t.includes('annual saving (verified) $238,440'), t);
  }));
  await sub('edited-title', 'A v1 sample whose title was edited (even one character) is left alone: still old numbers', async () => withPage(browser, {}, async (page) => {
    const inv = old(); inv.problem.title = inv.problem.title + '!'; await seed(page, inv); await page.goto(BASE + '/app/investigations/' + inv.id); await page.getByLabel('Title', { exact: true }).waitFor(); eq(await page.getByLabel('Title', { exact: true }).inputValue(), inv.problem.title);
    await step(page, 'Actions'); await page.waitForTimeout(500); const t = (await page.locator('dl').first().innerText()).replace(/\s+/g, ' ').toLowerCase(); ok(t.includes('total action cost $60,000') || t.includes('$60,000'), 'edited sample was changed: ' + t);
  }));
  await sub('edited-action', 'A v1 sample with one action cost changed is left alone', async () => withPage(browser, {}, async (page) => {
    const inv = old(); inv.actions[0].cost = 29000; await seed(page, inv); await page.goto(BASE + '/app/investigations/' + inv.id); await page.getByLabel('Title', { exact: true }).waitFor(); await step(page, 'Actions'); const t = (await page.locator('dl').first().innerText()).replace(/\s+/g, ' ').toLowerCase(); ok(t.includes('$61,000'), 'expected 28000 -> 29000 total $61,000, saw ' + t);
  }));
  await sub('edited-note', 'A v1 sample with an evidence note changed is left alone', async () => withPage(browser, {}, async (page) => {
    const inv = old(); inv.evidence[0].note += ' edited'; await seed(page, inv); await page.goto(BASE + '/app/investigations/' + inv.id); await page.getByLabel('Title', { exact: true }).waitFor(); await step(page, 'Evidence'); await page.getByRole('button', { name: 'Edit' }).first().click(); ok((await page.getByLabel('Note', { exact: true }).inputValue()).endsWith(' edited'));
    await step(page, 'Actions'); ok(/\$60,000/.test(await page.locator('dl').first().innerText()), 'was upgraded');
  }));
  await sub('collapsed-only', 'A v1 sample where only a tree node was collapsed (UI state, not an edit) is still upgraded', async () => withPage(browser, {}, async (page) => {
    const inv = old(); inv.tree.children[0].collapsed = true; inv.updatedAt = '2026-10-01T00:00:00.000Z'; await seed(page, inv); await page.goto(BASE + '/app/investigations/' + inv.id); await page.getByLabel('Title', { exact: true }).waitFor(); await step(page, 'Actions'); ok(/\$32,000/.test(await page.locator('dl').first().innerText()), 'not upgraded: ' + await page.locator('dl').first().innerText());
  }));
  await sub('reset-restores', 'Reset sample data on an edited old sample restores the current sample (asks for confirmation)', async () => withPage(browser, {}, async (page) => {
    const inv = old(); inv.problem.title += '!'; await seed(page, inv); await page.goto(BASE + '/app'); await e.dashStats(page); await page.getByRole('button', { name: 'Reset sample data' }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Reset sample' }).click(); await page.waitForTimeout(800);
    await page.goto(BASE + '/app/investigations/sample-p101'); await page.getByLabel('Title', { exact: true }).waitFor(); await step(page, 'Actions'); ok(/\$32,000/.test(await page.locator('dl').first().innerText()));
  }));
});

test('F-SAMPLE-3', 'Sample upgrade signed in: unedited v1 sample row is upgraded, edited one is left alone (own account only; sample restored afterwards)', async ({ browser, sub }) => {
  await ensure(browser);
  await withPage(browser, { storageState: SB }, async (page) => {
    await page.goto(BASE + '/app'); await e.dashStats(page); await page.locator('section[aria-label="Investigations list"] ul > li').first().waitFor();
    let apikey = null, base = null, sid = null; page.on('request', rq => { const m = /^(https:\/\/[^/]+)\/rest\/v1\/investigations/.exec(rq.url()); if (m && rq.headers()['apikey']) { apikey = rq.headers()['apikey']; base = m[1]; } });
    await page.reload(); await e.dashStats(page); await page.waitForTimeout(1500); ok(apikey, 'no REST traffic');
    sid = (await page.locator('section[aria-label="Investigations list"] li').filter({ hasText: 'Illustrative sample' }).getByRole('link', { name: 'Open' }).getAttribute('href')).split('/').pop();
    const put = async (inv) => page.evaluate(async ({ base, apikey, sid, inv }) => { const k = Object.keys(localStorage).find(x => /auth-token/.test(x)); const tok = JSON.parse(localStorage.getItem(k)).access_token; const H = { apikey, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', Prefer: 'return=representation' };
      const r = await fetch(`${base}/rest/v1/investigations?id=eq.${sid}`, { method: 'PATCH', headers: H, body: JSON.stringify({ data: { ...inv, id: sid }, updated_at: new Date().toISOString() }) }); return r.status; }, { base, apikey, sid, inv });
    await sub('unedited', 'Writing the unedited v1 sample into the account row, then loading the dashboard: row is upgraded to the current sample', async () => {
      const inv = JSON.parse(JSON.stringify(V1)); const st = await put(inv); ok(st < 300, 'PATCH status ' + st); await page.goto(BASE + '/app'); await e.dashStats(page); await page.waitForTimeout(1500); await page.reload(); await e.dashStats(page);
      await page.goto(BASE + '/app/investigations/' + sid); await page.getByLabel('Title', { exact: true }).waitFor(); eq(await page.getByLabel('Asset tag', { exact: true }).inputValue(), 'P-101'); await step(page, 'Actions'); ok(/\$32,000/.test(await page.locator('dl').first().innerText()));
    });
    await sub('edited', 'An edited v1 sample row stays as the user left it (old $60,000 total, edited title kept)', async () => {
      const inv = JSON.parse(JSON.stringify(V1)); inv.problem.title += ' (mine)'; const st = await put(inv); ok(st < 300); await page.goto(BASE + '/app'); await e.dashStats(page); await page.waitForTimeout(1500); await page.reload(); await e.dashStats(page);
      await page.goto(BASE + '/app/investigations/' + sid); await page.getByLabel('Title', { exact: true }).waitFor(); ok((await page.getByLabel('Title', { exact: true }).inputValue()).endsWith('(mine)')); await step(page, 'Actions'); ok(/\$60,000/.test(await page.locator('dl').first().innerText()), 'edited sample was overwritten');
    });
    await cleanAccount(page);
  });
});

// ============================================================ security
test('F-SEC-1', 'Security headers and CSP on every route; no CSP violations while using every page', async ({ browser, sub }) => {
  const routes = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/app', '/app/assets', '/app/account', '/app/investigations/sample-p101', '/nope'];
  const need = { 'content-security-policy': /default-src 'self'/, 'x-frame-options': /DENY/i, 'x-content-type-options': /nosniff/i, 'referrer-policy': /strict-origin/i, 'permissions-policy': /camera=\(\)/ };
  const csp = {};
  for (const r of routes) await sub('hdr' + r.replace(/\W+/g, '_'), `Security headers present on ${r}`, async () => {
    const res = await fetch(BASE + r, { redirect: 'manual' }); const miss = []; for (const [k, re] of Object.entries(need)) { const v = res.headers.get(k); if (!v || !re.test(v)) miss.push(k + '=' + v); } eq(miss, []); csp[r] = res.headers.get('content-security-policy');
  });
  await sub('csp-content', 'CSP forbids framing, objects, off-site forms, base-uri tricks and allows only own origin + the Supabase host for connections', async () => {
    const c = csp['/'] || ''; for (const d of ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'"]) ok(c.includes(d), 'missing ' + d); ok(!/script-src[^;]*\*|default-src[^;]*\*/.test(c), 'wildcard source in ' + c); ok(!/script-src[^;]*unsafe-eval/.test(c), 'unsafe-eval allowed');
    h.note('observation', 'script-src allows \'unsafe-inline\' (needed by the framework bootstrap); style-src is \'self\' with style-src-attr \'unsafe-inline\'');
  });
  await sub('hsts', 'HSTS header is sent when served over HTTPS (not applicable on plain http://localhost)', async () => { h.note('observation', 'Strict-Transport-Security not checked on http://localhost; verify on the deployed HTTPS site'); });
  await sub('inline-script-blocked', 'An injected inline <script> is not blocked by CSP (script-src allows inline): record behaviour', async () => withPage(browser, {}, async (page) => {
    await page.goto(BASE + '/login'); const ran = await page.evaluate(() => { const s = document.createElement('script'); s.textContent = 'window.__cspProbe=1'; document.head.appendChild(s); return window.__cspProbe === 1; }); h.note('observation', 'dynamically injected inline script executes: ' + ran);
  }));
  await sub('external-blocked', 'A script or image from another origin is blocked by CSP', async () => withPage(browser, {}, async (page) => {
    await page.goto(BASE + '/login'); const res = await page.evaluate(() => new Promise((resolve) => { const i = new Image(); i.onload = () => resolve('loaded'); i.onerror = () => resolve('blocked'); i.src = 'https://example.org/x.png'; setTimeout(() => resolve('timeout'), 4000); })); ok(res === 'blocked', 'external image: ' + res);
    page.errs.length = 0; // the violation above is the expected one
  }));
  await sub('frame-blocked', 'The app cannot be framed (X-Frame-Options/frame-ancestors): an <iframe> of the page in a data: page stays empty', async () => withPage(browser, {}, async (page) => {
    await page.goto('about:blank'); await page.setContent(`<iframe id=f src="${BASE}/login" width=400 height=300></iframe>`); await page.waitForTimeout(2500); const fr = page.frames().find(x => x.url().startsWith(BASE)); const txt = fr ? await fr.evaluate(() => document.body?.innerText || '').catch(() => '') : ''; ok(!/Sign in/.test(txt), 'framed page rendered: ' + txt.slice(0, 80)); page.errs.length = 0;
  }));
  await sub('walk', 'Walking every page and step (demo) produces no CSP violations or console errors', async () => withPage(browser, {}, async (page) => {
    for (const r of ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/app', '/app/assets', '/app/account']) { await page.goto(BASE + r); await page.waitForTimeout(r === '/reset-password' ? 3000 : 900); }
    await page.goto(BASE + '/app/investigations/sample-p101'); for (const s of h.STEP_LABELS) { await step(page, s); await page.waitForTimeout(150); if (s === 'Cause tree') for (const v of ['5 Whys', 'Fishbone', 'Tree']) await page.getByRole('tab', { name: v }).click(); }
    eq({ errs: page.errs, fails: page.fails }, { errs: [], fails: [] });
  }));
});

test('F-SEC-2', 'Image upload allowlist, malformed rows, password rule', async ({ browser, sub }) => {
  await sub('image-types', 'Evidence photo: JPEG and PNG accepted; SVG, GIF, WebP, BMP and a renamed text file are refused with a message', async () => withPage(browser, {}, async (page) => {
    const mk = async (name, mime, buf) => ({ name, mimeType: mime, buffer: buf });
    const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 50; c.height = 40; const x = c.getContext('2d'); x.fillStyle = '#36c'; x.fillRect(0, 0, 50, 40); return c.toDataURL('image/png').split(',')[1]; });
    const jpg = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 50; c.height = 40; const x = c.getContext('2d'); x.fillStyle = '#c63'; x.fillRect(0, 0, 50, 40); return c.toDataURL('image/jpeg').split(',')[1]; });
    const gif = Buffer.from('R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64'); const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>window.__svg=1</script><rect width="10" height="10"/></svg>');
    await h.demoNew(page); await f.addEvidence(page, { title: 'Pic', type: 'Photo' }); await step(page, 'Evidence'); await page.getByRole('button', { name: 'Edit' }).click(); const up = page.getByLabel('Upload photo');
    const results = {};
    for (const [name, mime, buf] of [['a.png', 'image/png', Buffer.from(png, 'base64')], ['b.jpg', 'image/jpeg', Buffer.from(jpg, 'base64')], ['c.gif', 'image/gif', gif], ['d.svg', 'image/svg+xml', svg], ['e.webp', 'image/webp', Buffer.from('RIFF....WEBPVP8 ')], ['f.png', 'image/png', Buffer.from('this is not a png')], ['g.txt', 'text/plain', Buffer.from('hi')], ['h.bmp', 'image/bmp', Buffer.from('BM......')]]) {
      await up.setInputFiles(await mk(name, mime, buf)); await page.waitForTimeout(700); const alert = await page.getByRole('alert').filter({ hasText: /./ }).allInnerTexts().then(a => a.filter(x => x.trim()).join('|')); const has = await page.getByAltText('Evidence preview').count(); results[name] = { img: has > 0, alert };
      if (has) { await page.getByRole('button', { name: 'Remove photo' }).click(); }
    }
    h.note('observation', 'image upload results: ' + JSON.stringify(results));
    ok(results['a.png'].img && results['b.jpg'].img, 'png/jpeg must work: ' + JSON.stringify(results)); for (const k of ['d.svg', 'g.txt']) ok(!results[k].img && results[k].alert, `${k} must be refused with a message: ${JSON.stringify(results[k])}`);
    ok(!results['c.gif'].img || results['c.gif'].alert === '', 'gif handled'); eq(await page.evaluate(() => window.__svg), undefined);
    ok(!results['f.png'].img && results['f.png'].alert, 'corrupt png must be refused: ' + JSON.stringify(results['f.png']));
  }));
  await sub('malformed-row', 'A malformed stored row shows "This investigation could not be read" with a Delete control and does not break the rest of the dashboard', async () => withPage(browser, {}, async (page) => {
    await page.addInitScript(() => { if (sessionStorage.getItem('__m')) return; sessionStorage.setItem('__m', '1'); localStorage.setItem('rca.seeded.v1', '1'); localStorage.setItem('rca.investigations.v1', JSON.stringify([{ id: 'bad1', garbage: true }, { id: 'bad2', problem: 'x', loss: 5, tree: null }, 'junk', null])); });
    await page.goto(BASE + '/app'); await page.getByRole('heading', { name: 'Investigations', level: 1 }).waitFor(); await page.waitForTimeout(1200); const t = await page.locator('main').innerText(); ok(/could not be read/i.test(t), t.slice(0, 400)); await h.shot(page, 'malformed-row');
    const del = page.getByRole('button', { name: 'Delete the investigation that could not be read' }); const n = await del.count(); ok(n >= 1, 'no delete control'); await del.first().click(); const d = page.getByRole('alertdialog'); ok(/permanently deleted/.test(await d.innerText())); await d.getByRole('button', { name: 'Cancel' }).click(); eq(await del.count(), n);
    await del.first().click(); await d.getByRole('button', { name: 'Delete' }).click(); await page.waitForTimeout(600); ok((await del.count()) < n, 'unreadable row not removed');
    eq(page.errs.filter(x => !/Failed to load resource/.test(x)), []);
  }));
  await sub('malformed-open', 'Opening an unreadable investigation by URL shows "Investigation not found"/unreadable message instead of crashing', async () => withPage(browser, {}, async (page) => {
    await page.addInitScript(() => { if (sessionStorage.getItem('__m2')) return; sessionStorage.setItem('__m2', '1'); localStorage.setItem('rca.seeded.v1', '1'); localStorage.setItem('rca.investigations.v1', JSON.stringify([{ id: 'bad9', problem: 7 }])); });
    await page.goto(BASE + '/app/investigations/bad9'); await page.waitForTimeout(2500); const t = await page.locator('body').innerText(); ok(/not found|could not be read/i.test(t), t.slice(0, 200)); eq(page.errs.filter(x => !/Failed to load resource/.test(x)), []);
  }));
  await sub('partial-row', 'A row missing optional new fields or with wrong types in them still opens (tolerant parsing), without losing the readable parts', async () => withPage(browser, {}, async (page) => {
    const inv = JSON.parse(JSON.stringify(V1)); inv.id = 'tol1'; inv.isSample = false; inv.problem.title = 'TOLERANT ROW'; inv.loss.shareLost = 'abc'; inv.loss.otherCosts = 'nope'; inv.actions[0].task = 'bad'; inv.actions[0].kind = 'weird'; inv.rollouts = { not: 'an array' }; inv.spares = 42; delete inv.verification.notes;
    await f.seedDemo(page, [inv]); await page.goto(BASE + '/app'); await e.dashStats(page); ok((await e.dashRows(page)).some(r => r.includes('TOLERANT ROW')), 'row not listed: ' + (await e.dashRows(page)).join('|') + ' / ' + (await page.locator('main').innerText()).slice(0, 300));
    await page.goto(BASE + '/app/investigations/tol1'); await page.getByLabel('Title', { exact: true }).waitFor(); for (const s of ['Loss', 'Actions', 'Verify', 'Report']) await step(page, s); eq(page.errs.filter(x => !/Failed to load resource/.test(x)), []);
  }));
  await sub('password-rule-hint', 'Sign-up and Change password show the rule "At least 8 characters. Not a very common password, and not your email address."', async () => withPage(browser, {}, async (page) => {
    await page.goto(BASE + '/signup'); await page.getByText('At least 8 characters. Not a very common password, and not your email address.').waitFor();
  }));
  await sub('password-rule', 'Sign-up form refuses common passwords (password123, 12345678, Password1, rootloop1) and password = email, accepts a strong one client-side (nothing is submitted)', async () => withPage(browser, {}, async (page) => {
    const reqs = []; page.on('request', r => { if (/supabase/.test(r.url()) && r.method() === 'POST') reqs.push(r.url()); });
    await page.goto(BASE + '/signup'); const err = async () => (await page.locator('form').innerText()).replace(/\s+/g, ' ');
    for (const pw of ['password123', '12345678', 'Password1', 'rootloop1', 'QWERTYUI']) { await page.getByLabel('Email').fill('qa-validation-only@example.com'); await page.getByLabel('Password', { exact: true }).fill(pw); await page.getByLabel('Confirm password').fill(pw); await page.getByRole('button', { name: 'Create account' }).click(); const t = await err(); h.note('observation', `signup password "${pw}": ` + (/too common/.test(t) ? 'refused' : 'ACCEPTED client-side')); if (!/too common/.test(t)) throw new Error(`"${pw}" not refused: ` + t.slice(-160)); }
    await page.getByLabel('Email').fill('qa-validation-only@example.com'); await page.getByLabel('Password', { exact: true }).fill('qa-validation-only@example.com'); await page.getByLabel('Confirm password').fill('qa-validation-only@example.com'); await page.getByRole('button', { name: 'Create account' }).click(); ok(/must not be the same as your email/.test(await err()), await err());
    eq(reqs, [], 'nothing may be sent for invalid input');
  }));
  await sub('password-rule-reset', 'Reset-password and the weak-length rule: 7 characters refused', async () => withPage(browser, {}, async (page) => { await page.goto(BASE + '/signup'); await page.getByLabel('Email').fill('qa-validation-only@example.com'); await page.getByLabel('Password', { exact: true }).fill('Ab1!xyz'); await page.getByLabel('Confirm password').fill('Ab1!xyz'); await page.getByRole('button', { name: 'Create account' }).click(); await page.getByText('Use at least 8 characters.').waitFor(); }));
});

test('F-ACCT-1', 'Account page: demo mode (download, clear browser data) and signed in (download my data, change password validation, delete-account confirmation gate)', async ({ browser, sub }) => {
  await sub('demo-page', 'Demo mode /app/account explains demo mode, offers Download my data and Clear browser data, and has no password/delete controls', async () => withPage(browser, {}, async (page) => {
    await page.goto(BASE + '/app/account'); await page.getByRole('heading', { name: 'Account', level: 1 }).waitFor(); await page.getByRole('button', { name: 'Download my data' }).waitFor(); await page.getByRole('button', { name: 'Clear browser data' }).waitFor(); eq(await page.getByRole('form', { name: 'Change password' }).count(), 0); eq(await page.getByRole('button', { name: 'Delete my account' }).count(), 0);
    await h.shot(page, 'account-demo');
  }));
  await sub('demo-download', 'Demo "Download my data" produces a JSON file with the sample investigation and the register (valid JSON, no secrets)', async () => withPage(browser, {}, async (page) => {
    await page.goto(BASE + '/app/account'); const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download my data' }).click()]); const file = await dl.path(); const doc = JSON.parse(fs.readFileSync(file, 'utf8')); ok(/\.json$/.test(dl.suggestedFilename()), dl.suggestedFilename());
    const s = JSON.stringify(doc); ok(Array.isArray(doc.investigations) && doc.investigations.length >= 1, Object.keys(doc).join(',')); ok(Array.isArray(doc.assets) && doc.assets.length === 5, 'assets ' + (doc.assets && doc.assets.length)); ok(!/password|access_token|refresh_token/i.test(s), 'secret-looking content in the export'); await page.getByText(/Downloaded 1 investigation and 5 assets\./).waitFor();
  }));
  await sub('demo-clear', 'Clear browser data: cancel keeps data, confirm removes everything and a fresh sample comes back', async () => withPage(browser, {}, async (page) => {
    await h.demoNew(page); await page.getByLabel('Title', { exact: true }).fill('TO BE CLEARED'); await waitSaved(page); await page.goto(BASE + '/app/account'); await page.getByRole('button', { name: 'Clear browser data' }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
    await page.goto(BASE + '/app'); await e.dashStats(page); ok((await e.dashRows(page)).some(r => r.includes('TO BE CLEARED'))); await page.goto(BASE + '/app/account'); await page.getByRole('button', { name: 'Clear browser data' }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Clear browser data' }).click(); await page.getByText('Browser data cleared.').waitFor();
    await page.goto(BASE + '/app'); await e.dashStats(page); const rows = await e.dashRows(page); ok(!rows.some(r => r.includes('TO BE CLEARED')) && rows.some(r => r.includes('Illustrative sample')), rows.join('|'));
  }));
  await ensure(browser);
  await sub('acct-sections', 'Signed in: account page shows the email, Download my data, Change password and Delete my account sections', async () => withPage(browser, { storageState: SA }, async (page) => {
    await page.goto(BASE + '/app/account'); await page.getByTestId('account-page-email').waitFor(); eq(await page.getByTestId('account-page-email').innerText(), USER_A); await page.getByRole('form', { name: 'Change password' }).waitFor(); await page.getByRole('form', { name: 'Delete my account' }).waitFor(); await h.shot(page, 'account-signed-in');
  }));
  await sub('acct-menu-link', 'The account menu links to the account page', async () => withPage(browser, { storageState: SA }, async (page) => {
    await page.goto(BASE + '/app'); await e.dashStats(page); await page.getByTestId('account-menu-button').click(); const item = page.getByRole('menuitem', { name: /Account/ }); ok((await item.count()) >= 1, 'no Account menu item'); await item.first().click(); await page.waitForURL(/\/app\/account/);
  }));
  await sub('acct-download', 'Signed-in download: valid JSON with the account\'s investigations and assets, the account email, and no credentials', async () => withPage(browser, { storageState: SA }, async (page) => {
    await page.goto(BASE + '/app/account'); await page.getByTestId('account-page-email').waitFor(); const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download my data' }).click()]); const doc = JSON.parse(fs.readFileSync(await dl.path(), 'utf8')); const s = JSON.stringify(doc);
    ok(Array.isArray(doc.investigations) && doc.investigations.length >= 1, Object.keys(doc).join(',')); ok(s.includes(USER_A), 'email missing'); ok(!s.includes(USER_B), 'other user data present'); ok(!/access_token|refresh_token|"password"/i.test(s), 'credential-like content'); ok(Array.isArray(doc.assets) && doc.assets.length >= 5, 'assets ' + (doc.assets && doc.assets.length));
  }));
  await sub('pw-validation', 'Change password: empty, mismatch, too short, common password and "same as email" are refused; nothing is sent; the real password is NOT changed', async () => withPage(browser, { storageState: SA }, async (page) => {
    const reqs = []; page.on('request', r => { if (/\/auth\/v1\/user/.test(r.url()) && r.method() === 'PUT') reqs.push(r.url()); });
    await page.goto(BASE + '/app/account'); const form = page.getByRole('form', { name: 'Change password' }); const err = async () => (await form.innerText()).replace(/\s+/g, ' ');
    await form.getByRole('button', { name: 'Change password' }).click(); ok(/Choose a password\./.test(await err()), await err());
    await form.getByLabel('New password', { exact: true }).fill('Abcdefg1xyz'); await form.getByLabel('Confirm new password').fill('Different1xyz'); await form.getByRole('button', { name: 'Change password' }).click(); ok(/do not match/.test(await err()));
    for (const [pw, re] of [['short1', /at least 8/i], ['password123', /too common/], [USER_A, /same as your email/]]) { await form.getByLabel('New password', { exact: true }).fill(pw); await form.getByLabel('Confirm new password').fill(pw); await form.getByRole('button', { name: 'Change password' }).click(); ok(re.test(await err()), `${pw}: ${await err()}`); }
    await page.getByText('At least 8 characters. Not a very common password, and not your email address.').first().waitFor(); eq(reqs, [], 'a password change request was sent');
  }));
  await sub('delete-gate', 'Delete my account: button disabled until the exact phrase is typed; wrong phrases keep it disabled; NO deletion is performed', async () => withPage(browser, { storageState: SA }, async (page) => {
    const rpc = []; page.on('request', r => { if (/delete_own_account/.test(r.url())) rpc.push(r.url()); });
    await page.goto(BASE + '/app/account'); const form = page.getByRole('form', { name: 'Delete my account' }); const btn = form.getByRole('button', { name: 'Delete my account' }); ok(await btn.isDisabled(), 'enabled with empty box');
    const label = await form.locator('label').first().innerText(); const phrase = /Type (.+?) to confirm/.exec(label)[1]; h.note('observation', 'delete phrase: ' + phrase);
    const box = form.getByLabel(/Type .* to confirm/); for (const wrong of ['delete', phrase.toLowerCase().slice(0, -1), phrase + 'x', '']) { await box.fill(wrong); ok(await btn.isDisabled(), `enabled for "${wrong}"`); }
    await box.fill(phrase); ok(await btn.isEnabled(), 'not enabled for the exact phrase'); await box.fill(''); await page.waitForTimeout(300); eq(rpc, [], 'delete RPC must not be called'); ok(await btn.isDisabled());
  }));
  await sub('acct-signed-out', 'Signed out, Change password / Delete are not offered and /app/account does not expose account data', async () => withPage(browser, {}, async (page) => { await page.goto(BASE + '/app/account'); await page.getByRole('heading', { name: 'Account', level: 1 }).waitFor(); ok(!(await page.locator('body').innerText()).includes(USER_A)); }));
  await sub('global-signout', 'Sign out ends the session in ALL tabs/devices: after signing out in tab 1, tab 2 loses its session on next use', async () => {
    const ctx = await browser.newContext({ viewport: DESKTOP }); const p1 = await ctx.newPage(); await h.login(p1, USER_A); await p1.getByRole('heading', { name: 'Investigations', level: 1 }).waitFor();
    // a second, independent login (another "device") with its own session
    const p2 = await h.newPage(browser); await h.login(p2, USER_A); await p2.getByRole('heading', { name: 'Investigations', level: 1 }).waitFor(); await e.dashStats(p2);
    await p1.getByTestId('account-menu-button').click(); await p1.getByRole('menuitem', { name: 'Sign out' }).click(); await p1.waitForURL(/\/app$/); await p1.getByTestId('demo-banner').waitFor();
    await p2.waitForTimeout(1500); await p2.reload(); await p2.waitForTimeout(2500); const signedOut = (await p2.getByTestId('demo-banner').count()) > 0 || (await p2.getByTestId('account-menu-button').count()) === 0; h.note('observation', 'second device after global sign-out: signed out = ' + signedOut);
    await p2.context().close(); await ctx.close(); ok(signedOut, 'the second device is still signed in after a "global" sign-out');
  });
});

if (require.main === module) h.run('features', { only: process.argv[2] }).then(f => process.exit(f ? 1 : 0));
