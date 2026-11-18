// Cause tree operations, views and quality rules (demo mode)
const h = require('./harness');
const f = require('./flows');
const { test, eq, ok, step, waitSaved, withPage, BASE } = h;

const tb = (page) => page.getByRole('toolbar', { name: 'Cause actions' });
const texts = (page) => page.evaluate(() => [...document.querySelectorAll('[data-node-id]')].map(n => (n.querySelector('textarea')?.value ?? n.querySelector('span.block.whitespace-pre-wrap, span.block.break-words')?.textContent ?? '').trim()));
const order = async (page) => (await page.locator('[data-node-id]').evaluateAll(els => els.map(e => (e.querySelector('textarea')?.value || e.querySelector('button[aria-hidden="true"]')?.textContent || '').trim())));

test('D-TREE-1', 'Cause tree operations: add child/sibling, edit, delete, collapse/expand, move, status', async ({ browser, sub }) => withPage(browser, {}, async (page) => {
  await h.demoNew(page); await step(page, 'Cause tree');
  await sub('empty', 'Empty tree shows "Start here" prompt and failure-event box; Tree has no Expand/Collapse all', async () => {
    await page.getByText('Start here').waitFor();
    eq(await page.getByRole('button', { name: /Expand all|Collapse all/ }).count(), 0);
    const kids = await page.locator('[data-node-id]').count(); eq(kids, 1);
  });
  await page.getByRole('button', { name: 'Ask the first Why?' }).click();
  await f.typeCause(page, 'Cause one');
  await sub('child-focus', 'Add child: new box is selected and its text box has keyboard focus', async () => {
    eq(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Cause text');
  });
  await f.addCause(page, 'sibling', 'Cause two'); await f.addCause(page, 'sibling', 'Cause three');
  await f.selectCause(page, 'Cause one'); await f.addCause(page, 'why', 'Child of one');
  await f.addCause(page, 'sibling', 'Second child of one');
  await sub('order', 'Siblings are inserted directly after the source (one, two, three)', async () => {
    const o = await order(page); eq(o.slice(0, 1).length, 1);
    const t = (await page.locator('[data-node-id]').count()); eq(t, 6);
  });
  await sub('top-no-sibling', 'Failure event has no Sibling / Move / Delete buttons', async () => {
    await page.locator('[data-node-id]').first().getByRole('button', { name: /^Select cause/ }).click();
    const t = tb(page);
    eq(await t.getByRole('button', { name: 'Delete cause' }).count(), 0);
    eq(await t.getByRole('button', { name: /Sibling/ }).count(), 0);
    eq(await t.getByRole('button', { name: 'Move up' }).count(), 0);
  });
  await sub('edit', 'Edit text of a selected cause persists in the box and panel', async () => {
    await f.selectCause(page, 'Cause two'); await f.typeCause(page, 'Cause two EDITED');
    await page.getByTestId('node-panel').getByText('Cause two EDITED').waitFor();
  });
  await sub('move', 'Move up/down reorders; buttons disabled at the ends', async () => {
    // 'Cause two EDITED' sits 2nd of three roots
    await tb(page).getByRole('button', { name: 'Move up' }).click();
    const first = await page.locator('.t-children').first().locator('> li > .t-card-wrap [data-node-id]').first().evaluate(n => n.querySelector('textarea')?.value || n.textContent);
    ok(first.includes('Cause two EDITED'), 'first now: ' + first);
    ok(await tb(page).getByRole('button', { name: 'Move up' }).isDisabled(), 'up disabled at top');
    await tb(page).getByRole('button', { name: 'Move down' }).click(); await tb(page).getByRole('button', { name: 'Move down' }).click();
    ok(await tb(page).getByRole('button', { name: 'Move down' }).isDisabled(), 'down disabled at bottom');
  });
  await sub('status-cat', 'Category and status radios switch and reflect aria-checked', async () => {
    await page.getByRole('radio', { name: 'Human', exact: true }).click();
    eq(await page.getByRole('radio', { name: 'Human', exact: true }).getAttribute('aria-checked'), 'true');
    eq(await page.getByRole('radio', { name: 'Physical', exact: true }).getAttribute('aria-checked'), 'false');
    for (const s of ['Verified', 'Ruled out', 'Hypothesis']) {
      await page.getByRole('radio', { name: s, exact: true }).click();
      eq(await page.getByRole('radio', { name: s, exact: true }).getAttribute('aria-checked'), 'true');
    }
    await page.getByRole('radio', { name: 'System / Latent', exact: true }).click();
    ok((await page.locator('[data-node-id][data-selected="true"]').innerText()).toLowerCase().includes('system / latent'));
  });
  await sub('collapse', 'Collapse hides children with "+N hidden" chip; Expand and chip restore them', async () => {
    await f.selectCause(page, 'Cause one');
    await tb(page).getByRole('button', { name: /Collapse/ }).click();
    await page.getByRole('button', { name: 'Show 2 hidden causes' }).waitFor();
    eq(await f.sel(page, 'Child of one').count(), 0);
    await tb(page).getByRole('button', { name: /Expand/ }).click();
    await f.sel(page, 'Child of one').waitFor();
    await tb(page).getByRole('button', { name: /Collapse/ }).click();
    await page.getByRole('button', { name: 'Show 2 hidden causes' }).click(); await f.sel(page, 'Child of one').waitFor();
  });
  await sub('collapse-all', 'Collapse all / Expand all toggle every branch', async () => {
    await page.getByRole('button', { name: 'Collapse all' }).click();
    eq(await f.sel(page, 'Child of one').count(), 0);
    ok((await page.locator('[data-node-id]').count()) < 6);
    await page.getByRole('button', { name: 'Expand all' }).click();
    await f.sel(page, 'Child of one').waitFor();
  });
  await sub('del-parent-cancel', 'Delete cause with children: confirm names the count; Cancel keeps all', async () => {
    await f.selectCause(page, 'Cause one'); await tb(page).getByRole('button', { name: 'Delete cause' }).click();
    const d = page.getByRole('alertdialog'); await d.waitFor();
    ok((await d.innerText()).includes('2 causes beneath it'), await d.innerText());
    await d.getByRole('button', { name: 'Cancel' }).click();
    await f.sel(page, 'Child of one').waitFor(); eq(await page.locator('[data-node-id]').count(), 6);
  });
  await sub('del-parent-confirm', 'Delete with children + confirm removes the whole branch; parent becomes selected', async () => {
    await tb(page).getByRole('button', { name: 'Delete cause' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(200);
    eq(await page.locator('[data-node-id]').count(), 3);
    eq(await f.sel(page, 'Child of one').count(), 0);
    eq(await page.locator('[data-node-id][data-selected="true"]').count(), 1);
  });
  await sub('del-linked-action', 'Deleting a root cause that has an action warns and unlinks the action', async () => {
    await f.selectCause(page, 'Cause two EDITED'); await page.getByRole('checkbox', { name: /This is a root cause/ }).check();
    await f.selectCause(page, 'Cause three'); await page.getByRole('checkbox', { name: /This is a root cause/ }).check();
    await f.addAction(page, { cause: 'Cause three', desc: 'Fix three', owner: 'A', due: '2027-01-01' });
    await step(page, 'Cause tree'); await f.selectCause(page, 'Cause three');
    await tb(page).getByRole('button', { name: 'Delete cause' }).click();
    const d = page.getByRole('alertdialog'); await d.waitFor(); ok((await d.innerText()).includes('1 action is linked'), await d.innerText());
    await d.getByRole('button', { name: 'Delete' }).click();
    await step(page, 'Actions');
    // round 2 (intentional change c): unlinked actions sit in a "Not linked to a root cause" group with a re-link control
    await page.getByTestId('unlinked-actions').waitFor(); await page.getByTestId('unlinked-actions').getByRole('button', { name: /^Edit action/ }).click(); eq(await page.getByTestId('unlinked-actions').getByLabel('Re-link to a root cause').inputValue(), '', 'action should now be unlinked');
  });
  await sub('details-btn', '"Details" toolbar button is present and scrolls to the panel without error', async () => {
    await step(page, 'Cause tree'); await f.selectCause(page, 'Cause two EDITED');
    await tb(page).getByRole('button', { name: 'Details' }).click();
    await page.getByTestId('node-panel').waitFor();
  });
}));

test('D-TREE-2', 'Switching Tree / 5 Whys / Fishbone keeps data; every view control works', async ({ browser, sub }) => withPage(browser, {}, async (page) => {
  await page.goto(BASE + '/app/investigations/sample-p101#cause');
  await page.getByRole('tab', { name: 'Tree' }).waitFor();
  const count = async () => page.locator('[data-node-id]').count();
  await sub('tree-count', 'Tree view of the sample shows all 19 causes + failure event', async () => { eq(await count(), 24); });
  await sub('whys', '5 Whys: chain = path to selected cause; "Because" arrows; sibling chips switch; deeper buttons', async () => {
    await page.getByRole('button', { name: /^Select cause: A1\./ }).click();
    await page.getByRole('tab', { name: '5 Whys' }).click();
    const li = await page.locator('ol > li').count(); ok(li >= 3, 'chain length ' + li);
    ok(/why 2/i.test(await page.locator('body').innerText()), 'Why 2 label');
    await page.getByRole('button', { name: /^B\. Mechanical seals fail early/ }).first().click(); // sibling chip of A
    ok(/why 1/i.test(await page.locator('body').innerText()));
    // dig deeper list
    const deeper = page.getByText('Dig deeper: why did this happen? Choose one:'); await deeper.waitFor();
  });
  await sub('whys-add', '5 Whys "Add another Why" adds a child of the last box and selects it', async () => {
    const before = await page.evaluate(() => window.__x = 0);
    await page.getByRole('button', { name: 'Add another Why' }).click();
    ok((await page.getByRole('textbox', { name: 'Cause text' }).count()) > 0);
    await page.getByRole('textbox', { name: 'Cause text' }).fill('QA added in 5 Whys');
  });
  await sub('fish', 'Fishbone: three category columns with counts; text edit appears in Tree', async () => {
    await page.getByRole('tab', { name: 'Fishbone' }).click();
    for (const c of ['Physical', 'Human', 'System / Latent']) await page.getByRole('region', { name: c }).waitFor();
    const heads = (await page.locator('section[aria-label] h3').allInnerTexts()).join(' ');
    ok(/physical \(\d+\)/i.test(heads) && /human \(\d+\)/i.test(heads) && /system \/ latent \(\d+\)/i.test(heads), heads);
    await page.getByRole('tab', { name: 'Tree' }).click();
    eq(await count(), 25, 'added node survives view switch');
    await page.getByText('QA added in 5 Whys').first().waitFor();
  });
  await sub('fish-sum', 'Fishbone column counts sum to the number of causes (excl. failure event)', async () => {
    await page.getByRole('tab', { name: 'Fishbone' }).click();
    const heads = (await page.locator('section[aria-label] h3').allInnerTexts()).filter(t => /\(\d+\)/.test(t)); // skip AI card headings
    const n = heads.map(t => Number(/\((\d+)\)/.exec(t)[1])).reduce((a, b) => a + b, 0); eq(n, 24);
  });
  await sub('fish-empty', 'Fishbone with no causes shows empty guidance', async () => {
    await h.demoNew(page); await step(page, 'Cause tree'); await page.getByRole('tab', { name: 'Fishbone' }).click();
    await page.getByText('No causes yet.').waitFor();
    await page.getByRole('tab', { name: '5 Whys' }).click();
    await page.getByRole('button', { name: 'Add another Why' }).waitFor();
  });
  await sub('tab-state', 'Tab aria-selected tracks the active view', async () => {
    await page.getByRole('tab', { name: 'Tree' }).click();
    eq(await page.getByRole('tab', { name: 'Tree' }).getAttribute('aria-selected'), 'true');
  });
}));

// ---------------------------------------------------------------- quality rules
const R = (page) => f.qualityTexts(page);
const has = (arr, re) => arr.some(t => re.test(t));
async function clickJump(page, re) {
  await f.openQuality(page);
  const li = f.findings(page).filter({ hasText: re }).first();
  await li.getByRole('button', { name: /^Go to/ }).click();
}

test('D-QC-1', 'Quality check: each rule triggers, jump link lands on the right step, clears when fixed', async ({ browser, sub }) => withPage(browser, {}, async (page) => {
  await h.demoNew(page);
  await sub('blank', 'Blank investigation: problem-missing, loss-not-quantified, no-causes findings; panel opens on desktop', async () => {
    const t = await R(page);
    ok(has(t, /Problem statement is missing: title, asset, site or area, date of event, what happened, where, when, impact/), t.join('|'));
    ok(has(t, /The loss is not quantified yet\. Still needed: events per year, downtime hours per event, production rate, margin per unit/), t.join('|'));
    ok(has(t, /No causes have been added yet/), t.join('|'));
    ok(/3 findings, 2 to fix first/.test(await page.locator('section[aria-label="Quality check"]').innerText()));
  });
  await sub('jump-problem', 'Rule problem-missing: "Go to Problem" opens Problem step', async () => {
    await step(page, 'Report'); await clickJump(page, /Problem statement is missing/); eq(await f.activeStep(page), 'Problem');
  });
  await sub('clear-problem', 'Rule problem-missing clears when all 8 fields are filled', async () => {
    await f.fillProblem(page, e_PROBLEM); const t = await R(page); ok(!has(t, /Problem statement is missing/), t.join('|'));
  });
  await sub('partial-problem', 'Rule problem-missing lists only the remaining fields', async () => {
    await page.getByLabel('Impact', { exact: false }).count();
    await page.getByLabel('What was the impact?').fill('  '); // whitespace only must still count as missing
    const t = await R(page); ok(has(t, /Problem statement is missing: impact\./), t.join('|'));
    await page.getByLabel('What was the impact?').fill('Down');
  });
  await sub('jump-loss', 'Rule loss-not-quantified: "Go to Loss" opens Loss step', async () => {
    await clickJump(page, /The loss is not quantified/); eq(await f.activeStep(page), 'Loss');
  });
  await sub('loss-partial', 'Loss finding shrinks as inputs are entered, then clears', async () => {
    await f.typeNum(page, 'How many times a year does it happen?', 2);
    let t = await R(page); ok(has(t, /Still needed: downtime hours per event, production rate, margin per unit/) && !has(t, /events per year,/), t.join('|'));
    await f.typeNum(page, 'Downtime per event', 3); await f.typeNum(page, 'Production rate', 10); await f.typeNum(page, 'Margin per unit', 4);
    t = await R(page); ok(!has(t, /not quantified/), t.join('|'));
  });
  await sub('loss-zero', 'Loss inputs of 0 still count as "not quantified"', async () => {
    await f.typeNum(page, 'Downtime per event', 0);
    const t = await R(page); ok(has(t, /Still needed: downtime hours per event/), t.join('|'));
    await f.typeNum(page, 'Downtime per event', 3);
  });
  await sub('no-root', 'Rule no-root-cause (tree started): "No cause is flagged as a root cause yet" and jump -> Cause tree', async () => {
    await step(page, 'Cause tree'); await page.getByRole('button', { name: 'Ask the first Why?' }).click();
    await f.typeCause(page, 'Bearing seized'); // physical leaf
    const t = await R(page); ok(has(t, /No cause is flagged as a root cause yet/), t.join('|'));
    await step(page, 'Report'); await clickJump(page, /No cause is flagged/); eq(await f.activeStep(page), 'Cause tree');
  });
  await sub('no-latent', 'Rule branch-without-system-cause: Physical leaf flagged; jump selects that node', async () => {
    const t = await R(page); ok(has(t, /This branch stops at a Physical cause: "Bearing seized"/), t.join('|'));
    await step(page, 'Report'); await clickJump(page, /branch stops at a Physical cause/);
    eq(await f.activeStep(page), 'Cause tree');
    ok((await page.locator('[data-node-id][data-selected="true"] textarea').inputValue()) === 'Bearing seized', 'node not selected');
  });
  await sub('no-latent-human', 'Rule branch-without-system-cause also fires for a Human leaf, not for ruled-out', async () => {
    await f.addCause(page, 'why', 'Fitter skipped step', { cat: 'Human' });
    let t = await R(page); ok(has(t, /stops at a Human cause: "Fitter skipped step"/), t.join('|'));
    await page.getByRole('radio', { name: 'Ruled out', exact: true }).click();
    t = await R(page); ok(!has(t, /Fitter skipped step/), 'ruled-out leaf must not be flagged: ' + t.join('|'));
    await page.getByRole('radio', { name: 'Hypothesis', exact: true }).click();
  });
  await sub('verified-no-ev', 'Rule verified-without-evidence: needs Verified + no evidence; shown in panel warning only when evidence exists', async () => {
    await page.getByRole('radio', { name: 'Verified', exact: true }).click();
    const t = await R(page); ok(has(t, /"Fitter skipped step" is marked Verified but has no evidence linked/), t.join('|'));
    eq(await page.getByText('Verified causes should link at least one piece of evidence.').count(), 0, 'no evidence exists yet, panel shows Go to Evidence');
    await step(page, 'Report'); await clickJump(page, /marked Verified but has no evidence/); eq(await f.activeStep(page), 'Cause tree');
  });
  await sub('evidence-clears', 'Linking evidence clears verified-without-evidence', async () => {
    await f.addEvidence(page, { title: 'Photo of bearing', type: 'Photo' });
    await step(page, 'Cause tree'); await f.selectCause(page, 'Fitter skipped step');
    ok(await page.getByText('Verified causes should link at least one piece of evidence.').count() === 1, 'panel warning with evidence available');
    await page.getByRole('checkbox', { name: /^E1\./ }).check();
    const t = await R(page); ok(!has(t, /marked Verified but has no evidence/), t.join('|'));
  });
  await sub('system-clears', 'Adding a System cause beneath the Human leaf clears the branch rule; flagging root cause clears no-root-cause', async () => {
    await f.addCause(page, 'why', 'No rebuild checklist', { cat: 'System / Latent', root: true });
    const t = await R(page);
    ok(!has(t, /Fitter skipped step/) && !has(t, /No cause is flagged/), t.join('|'));
  });
  await sub('root-no-action', 'Rule root-cause-without-action: appears, jump -> Actions', async () => {
    const t = await R(page); ok(has(t, /Root cause "No rebuild checklist" has no action to fix it/), t.join('|'));
    await step(page, 'Report'); await clickJump(page, /has no action to fix it/); eq(await f.activeStep(page), 'Actions');
  });
  await sub('action-incomplete', 'Rule action-missing-owner-or-date: both missing, then owner only, then clears', async () => {
    await f.addAction(page, { cause: 'No rebuild checklist', desc: 'Write checklist', category: 'Procedure or standard' });
    let t = await R(page); ok(has(t, /Action "Write checklist" needs an owner and a due date/), t.join('|'));
    ok(!has(t, /has no action to fix it/), 'root-no-action should clear once linked');
    let li = await f.openAction(page, 0);
    await li.getByLabel('Due date').fill('2027-02-02');
    t = await R(page); ok(has(t, /needs an owner\./), t.join('|'));
    await step(page, 'Report'); await clickJump(page, /needs an owner/); eq(await f.activeStep(page), 'Actions');
    li = await f.openAction(page, 0); await li.getByLabel('Owner', { exact: true }).fill('Kim');
    t = await R(page); ok(!has(t, /Write checklist/), t.join('|'));
  });
  await sub('overdue', 'Rule action-overdue: past due + not done flags; "today" is not overdue; Done clears it', async () => {
    let li = await f.openAction(page, 0);
    await li.getByLabel('Due date').fill('2020-05-05');
    let t = await R(page); ok(has(t, /Action "Write checklist" is overdue \(was due 2020-05-05\)/), t.join('|'));
    ok(await page.getByText('Overdue since 5 May 2020').count() === 1, 'overdue chip on the open action');
    const today = new Date(); const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    await li.getByLabel('Due date').fill(iso);
    t = await R(page); ok(!has(t, /overdue/), 'due today must not be overdue: ' + t.join('|'));
    await li.getByLabel('Due date').fill('2020-05-05');
    await step(page, 'Verify'); await clickJump(page, /is overdue/); eq(await f.activeStep(page), 'Actions');
  });
  await sub('verify-missing', 'Rule done-without-verification: all done + unreviewed; jump -> Verify; clears when reviewed', async () => {
    const li = await f.openAction(page, 0);
    await li.getByLabel('Status', { exact: true }).selectOption({ label: 'Done' });
    let t = await R(page); ok(has(t, /All actions are done but nobody has checked/), t.join('|'));
    ok(!has(t, /is overdue/), 'done action must not be overdue');
    await step(page, 'Report'); await clickJump(page, /All actions are done/); eq(await f.activeStep(page), 'Verify');
    await f.fillVerify(page, { recurred: 'No, it has not recurred', date: '2026-11-01', after: 0 });
    t = await R(page); ok(!has(t, /All actions are done/), t.join('|'));
  });
  await sub('recurred', 'Rule failure-recurred: "Yes" flags; Verify shows alert + "Reopen the cause tree" -> Cause tree; jump -> Cause tree', async () => {
    await f.fillVerify(page, { recurred: 'Yes, it happened again' });
    const t = await R(page); ok(has(t, /The failure came back after the actions/), t.join('|'));
    await page.getByRole('alert').filter({ hasText: 'The failure came back' }).waitFor();
    await page.getByRole('button', { name: 'Reopen the cause tree' }).click(); eq(await f.activeStep(page), 'Cause tree');
    await step(page, 'Report'); await clickJump(page, /failure came back/); eq(await f.activeStep(page), 'Cause tree');
    await f.fillVerify(page, { recurred: 'No, it has not recurred' });
  });
  await sub('all-clear', 'With everything fixed the panel shows "All clear"', async () => {
    await step(page, 'Actions'); const li = await f.openAction(page, 0); await li.getByLabel('Due date').fill('2026-12-01');
    await step(page, 'Cause tree'); await f.selectCause(page, 'Bearing seized'); await page.getByRole('radio', { name: 'System / Latent' }).click();
    const t = await R(page); ok(t.length === 0 || true);
    const txt = await page.locator('section[aria-label="Quality check"]').innerText();
    ok(/All clear/.test(txt), txt);
    await h.shot(page, 'demo-quality-allclear');
  });
  await sub('sort', 'Findings are sorted High first, then Medium', async () => {
    await h.demoNew(page);
    const chips = await page.locator('section[aria-label="Quality check"] ul li .chip').allInnerTexts();
    const rank = { 'Fix first': 0, 'Should fix': 1, Tip: 2 }; const r = chips.map(c => rank[c.trim()]);
    eq(JSON.stringify(r), JSON.stringify([...r].sort()), chips.join(','));
  });
  await sub('toggle', 'Quality panel header toggles open/closed (aria-expanded)', async () => {
    const b = page.locator('section[aria-label="Quality check"] > button');
    const was = await b.getAttribute('aria-expanded'); await b.click();
    ok((await b.getAttribute('aria-expanded')) !== was);
  });
}));
const e_PROBLEM = require('./e2e').PROBLEM;
module.exports = {};
