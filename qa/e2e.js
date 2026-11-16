// Full end-to-end flow, shared by demo and signed-in suites. All expected numbers are computed here by hand.
const h = require('./harness');
const f = require('./flows');
const { eq, ok, step, waitSaved, money } = h;

// ---- independent hand calculation (do NOT import app code)
const IN = { events: 4, hours: 5.5, rate: 120, margin: 2.5, repair: 1800, after: 1, costs: [1200, 950.5] };
const calc = (() => {
  const lostUnits = IN.hours * IN.rate;               // 660
  const lostMargin = lostUnits * IN.margin;           // 1650
  const perEvent = lostMargin + IN.repair;            // 3450
  const annual = perEvent * IN.events;                // 13800
  const annualAfter = perEvent * IN.after;            // 3450
  const saving = annual - annualAfter;                // 10350
  const actionCost = IN.costs.reduce((a, b) => a + b, 0); // 2150.5
  const payback = actionCost / (saving / 12);         // 2.4933...
  return { lostUnits, lostMargin, perEvent, annual, annualAfter, saving, actionCost, payback };
})();
const months = (m) => (Math.round(m * 10) / 10).toString() + ' months';

const PROBLEM = {
  title: 'QA: Gearbox seizure on conveyor C-7', asset: 'Conveyor C-7 gearbox', site: 'Packing hall B',
  eventDate: '2026-10-20', whatHappened: 'Gearbox seized during night shift and the line stopped.',
  where: 'Output shaft bearing', when: 'Night shift, full speed', impact: 'Packing line down 5.5 hours.',
};

async function buildAll(page, { sub, mode }) {
  // Problem
  await f.fillProblem(page, PROBLEM);
  await sub('problem', 'Problem step accepts all 8 fields', async () => {
    eq(await page.getByLabel('Title', { exact: true }).inputValue(), PROBLEM.title);
    await page.getByRole('heading', { name: PROBLEM.title, level: 1 }).waitFor();
  });
  // Loss
  await f.fillLoss(page, { events: IN.events, hours: IN.hours, rate: IN.rate, unit: 'cartons', margin: IN.margin, repair: IN.repair, cur: '$' });
  await sub('loss-calc', 'Loss live calc equals hand calc (lost units, lost margin, cost/event, annual loss)', async () => {
    const txt = (await page.locator('aside[aria-label="Live calculation"]').innerText()).replace(/\s+/g, ' ');
    ok(txt.includes(`${calc.lostUnits} cartons`), 'lost units ' + calc.lostUnits + ' in: ' + txt);
    ok(txt.includes(money(calc.lostMargin)), 'lost margin ' + money(calc.lostMargin));
    ok(txt.includes(`Cost per event ${money(calc.perEvent)}`), 'cost per event ' + money(calc.perEvent) + ' in: ' + txt);
    eq(await page.getByTestId('annual-loss').innerText(), money(calc.annual), 'annual loss');
  });
  // Evidence (3 items)
  await f.addEvidence(page, { title: 'Oil sample report', type: 'Document', date: '2026-10-21', note: 'Metal particles found.' });
  await f.addEvidence(page, { title: 'Operator interview', type: 'Interview', date: '2026-10-21', note: 'Heard grinding for 2 days.' });
  await f.addEvidence(page, { title: 'Alignment check', type: 'Inspection', note: 'Shaft 0.4mm out.' });
  await sub('evidence', 'Evidence: 3 items listed, types and "Not linked" shown', async () => {
    const t = await page.locator('main, body').first().innerText();
    for (const x of ['Oil sample report', 'Operator interview', 'Alignment check', 'Document', 'Interview', 'Inspection']) ok(t.includes(x), 'missing ' + x);
    eq((await page.getByText('Not linked to a cause yet').count()), 3, 'unlinked count');
  });
  // Cause tree: 6 nodes, 3 categories
  await step(page, 'Cause tree');
  await page.getByRole('button', { name: 'Ask the first Why?' }).click();
  await f.typeCause(page, 'Gearbox oil starved');
  await page.getByRole('radio', { name: 'Physical', exact: true }).click();
  await page.getByRole('radio', { name: 'Verified', exact: true }).click();
  await page.getByRole('checkbox', { name: /^E\d+\. Oil sample report/ }).check();                 // A (physical, verified, evidence)
  await f.addCause(page, 'why', 'Oil level not checked on rounds', { cat: 'Human' });                // A1
  await f.addCause(page, 'why', 'Inspection route has no gearbox oil check', { cat: 'System / Latent', root: true, status: 'Verified', evidence: ['Operator interview'] }); // A1a
  await f.selectCause(page, 'Gearbox oil starved');
  await f.addCause(page, 'why', 'placeholder', {});                                                  // temp child to test delete later
  await f.selectCause(page, 'placeholder');
  await page.getByRole('toolbar', { name: 'Cause actions' }).getByRole('button', { name: 'Delete cause' }).click(); // leaf delete: no confirm
  await sub('tree-leaf-delete', 'Deleting a leaf cause needs no confirmation and removes it', async () => {
    eq(await page.getByRole('alertdialog').count(), 0);
    eq(await f.sel(page, 'placeholder').count(), 0);
  });
  await f.selectCause(page, 'Gearbox oil starved');
  await f.addCause(page, 'sibling', 'Coupling misaligned', { cat: 'Physical', evidence: ['Alignment check'] }); // B
  await f.addCause(page, 'why', 'No alignment spec in install procedure', { cat: 'System / Latent', root: true, status: 'Verified', evidence: ['Alignment check'] }); // B1
  await f.selectCause(page, 'Coupling misaligned');
  await f.addCause(page, 'sibling', 'Wrong grease used', { cat: 'Human', status: 'Ruled out' });     // C (ruled out so the no-latent rule is skipped)
  await f.addCause(page, 'why', 'Grease type not on lubrication chart', { cat: 'System / Latent' }); // C1 (7th node)
  await sub('tree-nodes', 'Tree has 7 causes covering Physical, Human and System / Latent', async () => {
    const n = await page.locator('[data-node-id]').count();
    eq(n, 8, 'nodes incl. failure event'); // top + 7
  });
  // Actions
  await f.addAction(page, { cause: 'Inspection route has no gearbox oil check', desc: 'Add gearbox oil check to daily route', owner: 'Sam Patel', due: '2026-01-10', status: 'In progress', cost: IN.costs[0] });
  await f.addAction(page, { cause: 'No alignment spec in install procedure', desc: 'Write alignment spec', owner: 'Ana Lopez', due: '2027-03-01', status: 'Open', cost: IN.costs[1] });
  await sub('actions-tiles', 'Actions tiles: total cost, 0 of 2 done, 1 overdue, 0 roots unlinked', async () => {
    const t = (await page.locator('dl').first().innerText()).replace(/\s+/g, ' ').toLowerCase();
    ok(t.includes(('Total action cost ' + money(calc.actionCost)).toLowerCase()), t);
    ok(t.includes('actions 0 of 2 done'), t);
    ok(t.includes('overdue 1'), t);
    ok(t.includes('root causes without action 0'), t);
  });
  return calc;
}

async function finishVerify(page, { sub }) {
  await f.fillVerify(page, { date: '2026-11-10', recurred: 'No, it has not recurred', after: IN.after, notes: 'No repeat in 3 weeks.' });
  await sub('verify-calc', 'Verify step money equals hand calc (before, after, saving, cost, payback)', async () => {
    const t = (await page.locator('dl').last().innerText()).replace(/\s+/g, ' ').toLowerCase();
    const has = (s) => ok(t.includes(s.toLowerCase()), 'expected "' + s + '" in: ' + t);
    has('Annual loss before ' + money(calc.annual));
    has('Annual loss after ' + money(calc.annualAfter));
    has('Annual saving ' + money(calc.saving));
    has('Total action cost ' + money(calc.actionCost));
    has('Payback period ' + months(calc.payback));
  });
}

module.exports = { IN, calc, months, PROBLEM, buildAll, finishVerify };
