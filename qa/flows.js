// Reusable UI flows (demo and signed-in modes use the same workspace UI)
const h = require('./harness');
const { step, waitSaved } = h;

async function fillProblem(page, p) {
  await step(page, 'Problem');
  const set = async (label, v) => { if (v !== undefined) await page.getByLabel(label, { exact: true }).fill(v); };
  await set('Title', p.title); await set('Asset', p.asset); await set('Site / area', p.site);
  await set('Date of event', p.eventDate);
  await set('What happened?', p.whatHappened); await set('Where on the equipment?', p.where);
  await set('When did it happen?', p.when); await set('What was the impact?', p.impact);
}
async function typeNum(page, label, v) {
  const el = page.getByLabel(label, { exact: true });
  await el.fill(''); if (v !== '') await el.pressSequentially(String(v));
}
async function fillLoss(page, l) {
  await step(page, 'Loss');
  await typeNum(page, 'How many times a year does it happen?', l.events);
  await typeNum(page, 'Downtime per event', l.hours);
  await typeNum(page, 'Production rate', l.rate);
  await page.getByLabel('Unit name', { exact: true }).fill(l.unit);
  await typeNum(page, 'Margin per unit', l.margin);
  await typeNum(page, 'Repair cost per event', l.repair);
  await page.getByLabel('Currency symbol', { exact: true }).fill(l.cur);
}
async function addEvidence(page, e) {
  await step(page, 'Evidence');
  await page.getByRole('button', { name: 'Add evidence', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill(e.title);
  await page.getByLabel('Type', { exact: true }).selectOption({ label: e.type });
  if (e.date) await page.getByLabel('Date', { exact: true }).fill(e.date);
  if (e.note) await page.getByLabel('Note', { exact: true }).fill(e.note);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
}
const sel = (page, text) => page.getByRole('button', { name: 'Select cause: ' + text, exact: true });
async function selectCause(page, text) { await sel(page, text).click(); }
async function treeToolbar(page) { return page.getByRole('toolbar', { name: 'Cause actions' }); }
async function typeCause(page, text) {
  const ta = page.getByRole('textbox', { name: 'Cause text' });
  await ta.fill(text);
}
/** Adds a node under the currently selected node (kind 'why') or as its sibling, then sets properties. */
async function addCause(page, kind, text, o = {}) {
  const tb = await treeToolbar(page);
  await tb.getByRole('button', { name: kind === 'why' ? /Why\?/ : /Sibling/ }).click();
  await typeCause(page, text);
  if (o.cat) await page.getByRole('radio', { name: o.cat, exact: true }).click();
  if (o.status) await page.getByRole('radio', { name: o.status, exact: true }).click();
  if (o.root) await page.getByRole('checkbox', { name: /This is a root cause/ }).check();
  for (const ev of o.evidence || []) await page.getByRole('checkbox', { name: new RegExp('^E\\d+\\. ' + ev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).check();
}
async function addAction(page, a) {
  await step(page, 'Actions');
  await page.getByRole('button', { name: /Add action|Add the first action/ }).first().click();
  const card = page.locator('ul > li').filter({ hasText: /^Action \d+/ }).last();
  const n = await page.locator('li:has(label:has-text("What will be done?"))').count();
  const li = page.locator('li:has(label:has-text("What will be done?"))').nth(n - 1);
  if (a.cause) await li.getByLabel('Fixes this root cause').selectOption({ label: a.cause });
  await li.getByLabel('What will be done?').fill(a.desc);
  await li.getByLabel('Owner', { exact: true }).fill(a.owner || '');
  if (a.due !== undefined) await li.getByLabel('Due date').fill(a.due);
  if (a.status) await li.getByLabel('Status', { exact: true }).selectOption({ label: a.status });
  if (a.cost !== undefined) await typeNumIn(li, 'Cost', a.cost);
}
async function typeNumIn(scope, label, v) {
  const el = scope.getByLabel(label, { exact: true });
  await el.fill(''); if (v !== '') await el.pressSequentially(String(v));
}
async function fillVerify(page, v) {
  await step(page, 'Verify');
  if (v.date !== undefined) await page.getByLabel('Review date').fill(v.date);
  if (v.recurred) await page.getByLabel(/Has the failure recurred/).selectOption({ label: v.recurred });
  if (v.after !== undefined) await typeNum(page, 'Expected events per year after the fix', v.after);
  if (v.notes !== undefined) await page.getByLabel('What did you find?').fill(v.notes);
}
const findings = (page) => page.locator('section[aria-label="Quality check"] ul li');
async function openQuality(page) {
  const btn = page.locator('section[aria-label="Quality check"] > button');
  if ((await btn.getAttribute('aria-expanded')) !== 'true') await btn.click();
}
async function qualityTexts(page) {
  await openQuality(page);
  await page.waitForTimeout(100);
  return (await findings(page).allInnerTexts()).map(t => t.replace(/\s+/g, ' '));
}
async function activeStep(page) {
  return (await page.locator('nav[aria-label="Investigation steps"] [aria-current="step"]').innerText()).replace(/\(complete\)|\d/g, '').trim();
}
async function seedDemo(page, invs) { // write investigations straight into browser storage, before the app loads
  await page.addInitScript((arr) => {
    if (sessionStorage.getItem('__seeded')) return;
    sessionStorage.setItem('__seeded', '1');
    localStorage.setItem('rca.seeded.v1', '1');
    localStorage.setItem('rca.investigations.v1', JSON.stringify(arr));
  }, invs);
}
module.exports = { fillProblem, fillLoss, addEvidence, selectCause, addCause, addAction, fillVerify, findings, openQuality, qualityTexts, activeStep, typeNum, typeNumIn, seedDemo, sel, treeToolbar, typeCause };
