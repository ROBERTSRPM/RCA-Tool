// Round 2: the "What happened to the production you lost?" Loss feature (shares, recovery cost, buffer holding,
// other cost lines, cash vs opportunity split) carried through Verify, dashboard and Report. Demo mode, 1440px and 375px.
// All expected numbers are hand-calculated below; no app code is imported.
const h = require('./harness');
const f = require('./flows');
const e = require('./e2e');
const { test, eq, ok, step, waitSaved, withPage, BASE, DESKTOP, MOBILE } = h;

// Base case: 6 events/yr, 10 h, 50 pcs/h => 500 pcs per event; margin $4; repair $1,000.
const BASE_LOSS = { events: 6, hours: 10, rate: 50, unit: 'pcs', margin: 4, repair: 1000, cur: '$' };
const REC = 800, HOLD = 1500, OTHERS = [['Repair parts', 'valves', 250], ['Contractors and hire', 'crane', 150.25]]; // other per event = 400.25
const OTHER_PER_EVENT = 400.25;
// Share mixes reachable through the UI (each is one step from the previous: others keep their ratio).
const MIXES = [
  // name, how to reach (key, value), expected shares, expected {cashEv, oppEv, cashYr, oppYr, total}
  { name: 'S2 60/40/0', via: ['lost', 60], sh: [60, 40, 0] },
  { name: 'S3 48/32/20', via: ['buffer', 20], sh: [48, 32, 20] },
  { name: 'S4 35/50/15', via: ['madeUp', 50], sh: [35, 50, 15] },
  { name: 'S5 0/100/0', via: ['madeUp', 100], sh: [0, 100, 0] },
  { name: 'S6 0/0/100', via: ['buffer', 100], sh: [0, 0, 100] },
  { name: 'S7 25/0/75', via: ['lost', 25], sh: [25, 0, 75] },
];
const EV = 6, UNITS = 500, MARGIN = 4, REPAIR = 1000;
function expected(sh) { // hand calc, written out
  const [l, m, b] = sh;
  const lostUnits = UNITS * l / 100;
  const opp = lostUnits * MARGIN;
  const rec = m > 0 ? REC : 0;
  const cashEv = REPAIR + rec + OTHER_PER_EVENT;
  const hold = b > 0 ? HOLD : 0;
  const cashYr = cashEv * EV + hold, oppYr = opp * EV;
  return { lostUnits, opp, cashEv, cashYr, oppYr, total: cashYr + oppYr, costEv: cashEv + opp, hold };
}
const $ = (x) => '$' + Math.round(x).toLocaleString('en-US');
const KEY = { lost: 'Lost for good', madeUp: 'Made up later', buffer: 'Covered by buffer stock' };

async function shares(page) {
  const v = async (k) => Number(await page.getByLabel(KEY[k] + ' percent', { exact: true }).inputValue());
  return [await v('lost'), await v('madeUp'), await v('buffer')];
}
async function setShareUI(page, key, val, how = 'type') {
  if (how === 'slider') await page.getByLabel(KEY[key] + ' slider', { exact: true }).fill(String(val));
  else { const el = page.getByLabel(KEY[key] + ' percent', { exact: true }); await el.fill(String(val)); await el.blur(); }
}
async function cards(page) { await e.dashStats(page); return page.evaluate(() => Object.fromEntries([...document.querySelectorAll('section[aria-label="Totals"] > div')].map(d => [d.querySelector('p').textContent.trim(), d.innerText.replace(/\s+/g, ' ')]))); }
async function calcRows(page) { // [[label, value]] in display order of the live-calculation panel
  return page.evaluate(() => [...document.querySelectorAll('aside[aria-label="Live calculation"] dl > div')].map(d => [d.querySelector('dt').textContent.trim(), d.querySelector('dd').textContent.trim()]));
}
async function fillRecoveryEtc(page) {
  await f.typeNum(page, 'Recovery cost per event', REC);
}
async function addOthers(page) {
  for (const [cat, desc, amt] of OTHERS) {
    await page.getByRole('button', { name: 'Add a cost' }).click();
    const li = page.getByTestId('other-cost-line').last();
    await li.getByLabel('Category').selectOption({ label: cat }); await li.getByLabel('Description').fill(desc); await f.typeNumIn(li, 'Amount per event', amt);
  }
}
async function newWithLoss(page) {
  const id = await h.demoNew(page); await f.fillLoss(page, BASE_LOSS); return id;
}

// build the S3 investigation fully: used for verify/dashboard/report checks
async function buildS3(page) {
  const id = await newWithLoss(page);
  await f.fillProblem(page, { title: 'LOSS-S3 Press line stop', asset: 'Press 4', site: 'Hall 2', eventDate: '2026-09-01', whatHappened: 'Stopped', where: 'Ram', when: 'Day', impact: 'Down' });
  await f.fillLoss(page, BASE_LOSS);
  await setShareUI(page, 'lost', 60); await setShareUI(page, 'buffer', 20);
  await f.typeNum(page, 'Recovery cost per event', REC); await page.getByLabel('Recovery note (optional)').fill('two Saturdays');
  await f.typeNum(page, 'Yearly cost of holding the buffer stock (optional)', HOLD); await addOthers(page);
  await step(page, 'Cause tree'); await page.getByRole('button', { name: 'Ask the first Why?' }).click(); await f.typeCause(page, 'Press seal worn'); await page.getByRole('checkbox', { name: /root cause/ }).check();
  await f.addAction(page, { cause: 'Press seal worn', desc: 'Replace seal', owner: 'Lee', due: '2027-02-01', status: 'Open', cost: 5000 });
  await f.fillVerify(page, { after: 2 });
  await waitSaved(page); return id;
}

function suite(tag, viewport) {
  const T = (id, title, fn) => test(`${id}-${tag}`, `${title} [${tag}]`, async ctx => withPage(ctx.browser, { viewport }, (page) => fn(page, ctx.sub)));

  T('LOSS-1', 'Shares: always total 100, rebalance proportionally, typing/slider/edge input', async (page, sub) => {
    await newWithLoss(page);
    await sub('default', 'New investigation starts at 100 / 0 / 0, total 100%, no recovery/buffer fields', async () => {
      eq(await shares(page), [100, 0, 0]); ok((await page.getByTestId('share-total').innerText()).includes('100%'));
      eq(await page.getByLabel('Recovery cost per event').count(), 0); eq(await page.getByLabel(/Yearly cost of holding/).count(), 0);
    });
    for (const m of MIXES) await sub('mix-' + m.name.split(' ')[0], `Setting ${m.via[0]}=${m.via[1]}% gives ${m.sh.join('/')} and total 100`, async () => {
      await setShareUI(page, m.via[0], m.via[1]); eq(await shares(page), m.sh); ok((await page.getByTestId('share-total').innerText()).includes('100%'));
    });
    await sub('slider', 'Slider changes a share and the others rebalance to 100', async () => {
      await newWithLoss(page); await setShareUI(page, 'lost', 60, 'slider'); eq(await shares(page), [60, 40, 0]);
      await page.getByLabel('Lost for good slider').focus(); await page.keyboard.press('ArrowLeft'); eq(await shares(page), [59, 41, 0], 'ArrowLeft = -1');
    });
    await sub('clamp', 'Typing 150 clamps to 100 (others 0); empty counts as 0; letters rejected; 4 digits rejected', async () => {
      await setShareUI(page, 'madeUp', 150); eq(await shares(page), [0, 100, 0]);
      const el = page.getByLabel('Made up later percent', { exact: true }); await el.fill(''); eq(await shares(page).then(s => s[0] + s[1] + s[2]), 100, 'empty field must still total 100');
      await el.fill('abc'); ok(!/[a-z]/i.test(await el.inputValue())); await el.fill('1234'); ok((await el.inputValue()).length <= 3);
    });
    await sub('always-100', '60 random operations (typing and slider on any share) never leave a total other than 100', async () => {
      await newWithLoss(page); let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; const keys = ['lost', 'madeUp', 'buffer']; const bad = [];
      for (let i = 0; i < 60; i++) { const k = keys[Math.floor(rnd() * 3)]; const v = Math.floor(rnd() * 101); await setShareUI(page, k, v, rnd() > 0.5 ? 'slider' : 'type'); const s = await shares(page); if (s[0] + s[1] + s[2] !== 100) bad.push(`${k}=${v} -> ${s}`); }
      eq(bad, []);
    });
    await sub('bar', 'Share bar segment widths match the shares', async () => {
      await newWithLoss(page); await setShareUI(page, 'lost', 60); await setShareUI(page, 'buffer', 20);
      const w = await page.evaluate(() => ['lost', 'madeUp', 'buffer'].map(k => { const el = document.querySelector(`[data-testid=share-bar-${k}]`); return Math.round(el.getBoundingClientRect().width / el.parentElement.getBoundingClientRect().width * 100); }));
      eq(w, [48, 32, 20]);
    });
    await sub('persist', 'Shares, recovery note, holding cost and other lines survive reload', async () => {
      await newWithLoss(page); await setShareUI(page, 'lost', 60); await setShareUI(page, 'buffer', 20); await f.typeNum(page, 'Recovery cost per event', REC); await page.getByLabel('Recovery note (optional)').fill('note!'); await f.typeNum(page, 'Yearly cost of holding the buffer stock (optional)', HOLD); await addOthers(page); await waitSaved(page);
      await page.reload(); await step(page, 'Loss'); eq(await shares(page), [48, 32, 20]); eq(await page.getByLabel('Recovery note (optional)').inputValue(), 'note!'); eq(await page.getByLabel('Recovery cost per event').inputValue(), '800');
      eq(await page.getByTestId('other-cost-line').count(), 2); eq(await page.getByTestId('other-cost-line').last().getByLabel('Amount per event').inputValue(), '150.25'); eq(await page.getByTestId('other-cost-line').first().getByLabel('Category').inputValue(), 'parts');
    });
  });

  T('LOSS-2', 'Hand-calculated costs for six share mixes (cash vs opportunity, per event and per year)', async (page, sub) => {
    await newWithLoss(page);
    await sub('mix-S1', 'S1 100/0/0: cash $1,000/event, opportunity $2,000/event, annual $6,000 + $12,000 = $18,000', async () => {
      const r = await calcRows(page); const d = Object.fromEntries(r.map((x, i) => [i, x[1]]));
      eq(await page.getByTestId('annual-loss').innerText(), '$18,000'); eq(r[2][1], '$1,000'); eq(r[3][1], '$2,000'); eq(r[4][1], '$3,000'); eq(r[5][1], '$6,000'); eq(r[6][1], '$12,000'); eq(r[7][1], '60 h'); eq(r[8][1], '3,000 pcs');
    });
    await setShareUI(page, 'lost', 60); await f.typeNum(page, 'Recovery cost per event', REC); // S2 needs recovery
    await sub('recovery-S2', 'S2 60/40/0 with recovery $800: opportunity $1,200/event; cash $1,800/event; annual $10,800 + $7,200 = $18,000', async () => {
      // hand calc (no other lines yet): lost for good 300 pcs x $4 = $1,200; cash = 1,000 + 800 = 1,800; cost/event 3,000; annual cash 10,800 + opportunity 7,200 = 18,000
      const r = await calcRows(page); eq(r[2][1], '$1,800'); eq(r[3][1], '$1,200'); eq(r[4][1], '$3,000'); eq(r[5][1], '$10,800'); eq(r[6][1], '$7,200'); eq(await page.getByTestId('annual-loss').innerText(), '$18,000');
    });
    await addOthers(page);
    await sub('others-S2', 'Two other-cost lines (250 + 150.25) add $400.25 to cash per event; annual loss rises by 400.25 x 6 = 2,401.5', async () => {
      const x = expected([60, 40, 0]); const r = await calcRows(page); eq(r[2][1], $(x.cashEv)); eq(r[5][1], $(x.cashYr)); eq(await page.getByTestId('annual-loss').innerText(), $(x.total)); eq(Math.round(x.total), 20402);
    });
    await setShareUI(page, 'buffer', 20); await f.typeNum(page, 'Yearly cost of holding the buffer stock (optional)', HOLD);
    for (const m of MIXES.slice(1)) {
      if (m.name.startsWith('S3')) { /* already at S3 after buffer=20 */ } else await setShareUI(page, m.via[0], m.via[1]);
      await sub('calc-' + m.name.split(' ')[0], `${m.name}: live panel equals hand calc`, async () => {
        eq(await shares(page), m.sh); const x = expected(m.sh); const r = await calcRows(page);
        eq(r[2][1], $(x.cashEv), 'cash/event'); eq(r[3][1], $(x.opp), 'opportunity/event'); eq(r[4][1], $(x.costEv), 'cost/event'); eq(r[5][1], $(x.cashYr), 'annual cash'); eq(r[6][1], $(x.oppYr), 'annual opportunity');
        eq(r[1][1], `${(x.lostUnits).toLocaleString('en-US')} pcs`, 'units lost for good'); eq(r[8][1], '3,000 pcs');
        eq(await page.getByTestId('annual-loss').innerText(), $(x.total), 'annual loss');
      });
    }
    await sub('buffer-hidden-fields', 'When the buffer share is 0 the holding cost is not counted; when made-up share is 0 the recovery cost is not counted (even though the numbers are still stored)', async () => {
      await setShareUI(page, 'lost', 100); const x = expected([100, 0, 0]); eq(await page.getByTestId('annual-loss').innerText(), $(x.total)); eq(await page.getByLabel('Recovery cost per event').count(), 0);
      eq($(6 * (1000 + 400.25) + 12000), '$20,402');
    });
    await sub('recovery-reappears', 'Raising the made-up share again restores the stored recovery cost ($800)', async () => {
      await setShareUI(page, 'madeUp', 40); eq(await page.getByLabel('Recovery cost per event').inputValue(), '800');
    });
    await sub('zero-margin', 'With 0% lost for good, a blank margin is not reported as missing and the loss is quantified', async () => {
      await setShareUI(page, 'madeUp', 100); await f.typeNum(page, 'Margin per unit', ''); const q = await f.qualityTexts(page);
      ok(!q.some(t => /margin per unit/.test(t)), q.join('|')); ok(!q.some(t => /loss is not quantified/.test(t)), q.join('|'));
      await setShareUI(page, 'lost', 50); const q2 = await f.qualityTexts(page); ok(q2.some(t => /Still needed: margin per unit/.test(t)), 'margin required again once some production is lost for good: ' + q2.join('|'));
    });
    await sub('hours-rate-needed', 'Zero downtime hours: annual loss 0 only if no cash costs; repair + other still count? (cash per event x events)', async () => {
      await f.typeNum(page, 'Downtime per event', 0); const a = await page.getByTestId('annual-loss').innerText(); h.note('observation', 'Downtime 0 with repair/other costs entered: annual loss shows ' + a);
      const q = await f.qualityTexts(page); ok(q.some(t => /downtime hours per event/.test(t)), q.join('|'));
    });
  });

  T('LOSS-3', 'Other cost lines: add, categories, description, amount, remove, bad input', async (page, sub) => {
    await newWithLoss(page);
    await sub('empty', 'No lines: explanatory text, repair counted as cash', async () => { await page.getByText('No other costs added.').waitFor(); });
    await sub('categories', 'Category select offers the 8 categories', async () => {
      await page.getByRole('button', { name: 'Add a cost' }).click(); const opts = await page.getByTestId('other-cost-line').first().getByLabel('Category').locator('option').allInnerTexts();
      eq(opts, ['Repair parts', 'Repair labour and call-out', 'Contractors and hire', 'Scrap and restart waste', 'Customer penalties', 'Secondary damage', 'Safety and environment', 'Other']);
    });
    await sub('blank-amount', 'A blank amount counts as 0; setting 500 raises cash/event by 500 and annual by 3,000', async () => {
      let r = await calcRows(page); eq(r[2][1], '$1,000'); await f.typeNumIn(page.getByTestId('other-cost-line').first(), 'Amount per event', 500); r = await calcRows(page); eq(r[2][1], '$1,500'); eq(r[5][1], '$9,000'); eq(await page.getByTestId('annual-loss').innerText(), '$21,000');
    });
    await sub('negative-text', 'Negative and non-numeric amounts cannot be typed', async () => {
      const el = page.getByTestId('other-cost-line').first().getByLabel('Amount per event'); await el.fill(''); await el.pressSequentially('-20x'); eq(await el.inputValue(), '20'); await el.fill('500');
    });
    await sub('long-desc', 'A 3000-char description does not overflow the layout', async () => {
      await page.getByTestId('other-cost-line').first().getByLabel('Description').fill('W'.repeat(3000)); const o = await h.overflowX(page); await h.shot(page, `loss-other-longdesc-${tag}`); ok(o.sw <= o.cw, `overflow ${o.sw}>${o.cw}`);
      await page.getByTestId('other-cost-line').first().getByLabel('Description').fill('');
    });
    await sub('remove', 'Remove deletes only that line and updates totals', async () => {
      await page.getByRole('button', { name: 'Add a cost' }).click(); await f.typeNumIn(page.getByTestId('other-cost-line').last(), 'Amount per event', 100); let r = await calcRows(page); eq(r[2][1], '$1,600');
      await page.getByRole('button', { name: 'Remove other cost 1' }).click(); eq(await page.getByTestId('other-cost-line').count(), 1); r = await calcRows(page); eq(r[2][1], '$1,100');
      await page.getByRole('button', { name: 'Remove other cost 1' }).click(); await page.getByText('No other costs added.').waitFor(); r = await calcRows(page); eq(r[2][1], '$1,000');
    });
    await sub('currency', 'Other-cost amount prefix follows the currency symbol', async () => {
      await page.getByRole('button', { name: 'Add a cost' }).click(); await page.getByLabel('Currency symbol').fill('£'); await f.typeNumIn(page.getByTestId('other-cost-line').first(), 'Amount per event', 5);
      ok((await page.getByTestId('other-cost-line').first().innerText()).includes('£')); await page.getByLabel('Currency symbol').fill('$');
    });
  });

  T('LOSS-4', 'Figures carried into Verify, dashboard and Report for a mixed-share case (hand calc)', async (page, sub) => {
    const id = await buildS3(page); const x = expected([48, 32, 20]);
    // after fix: 2 events/yr; holding cost continues
    const afterCash = x.cashEv * 2 + HOLD, afterOpp = x.opp * 2, afterTot = afterCash + afterOpp, saving = x.total - afterTot; // 7820.5, saving 12641
    await sub('verify', 'Verify: before/after/expected saving with cash vs opportunity split, buffer holding assumed to continue, payback 4.7 months', async () => {
      await step(page, 'Verify'); const t = (await page.locator('dl').last().innerText()).replace(/\s+/g, ' ').toLowerCase(); const has = (s) => ok(t.includes(s.toLowerCase()), `expected "${s}" in: ${t}`);
      has('annual loss before ' + $(x.total)); has(`cash ${$(x.cashYr)} · opportunity ${$(x.oppYr)}`);
      has('annual loss after ' + $(afterTot)); has(`cash ${$(afterCash)} · opportunity ${$(afterOpp)}`); has('buffer holding (assumed to continue)');
      has('expected saving (not yet verified) ' + $(saving)); has(`cash ${$(x.cashYr - afterCash)} · opportunity ${$(x.oppYr - afterOpp)}`);
      has('total action cost $5,000'); has('payback period ' + (Math.round(5000 / (saving / 12) * 10) / 10) + ' months');
      eq($(saving), '$12,641'); eq(Math.round(5000 / (saving / 12) * 10) / 10, 4.7);
    });
    await sub('dash-open', 'Dashboard (open investigation): row $20,462 with cash/opportunity split; loss tile = same; verified tile unchanged at $238,440', async () => {
      await page.goto(BASE + '/app'); const s = await cards(page); const rows = await e.dashRows(page); const r = rows.find(z => z.includes('LOSS-S3'));
      ok(r.includes($(x.total)) && r.includes(`Cash ${$(x.cashYr)} · Opportunity ${$(x.oppYr)}`), r);
      ok(s['Annual loss under investigation'].includes($(x.total)), JSON.stringify(s)); ok(s['Annual loss under investigation'].includes(`Cash ${$(x.cashYr)} · Opportunity ${$(x.oppYr)}`), JSON.stringify(s));
      ok(s['Verified annual savings'].includes('$238,440'), JSON.stringify(s)); ok(s['Verified annual savings'].includes('Cash $57,000 · Opportunity $181,440'), JSON.stringify(s));
    });
    await sub('report-open', 'Report: loss table rows, split, totals and "expected saving ... not yet verified" wording equal hand calc', async () => {
      await page.goto(BASE + '/app/investigations/' + id); await page.getByLabel('Title', { exact: true }).waitFor(); const t = (await e.reportText(page)); const tl = t.toLowerCase(); const has = (s) => ok(tl.includes(s.toLowerCase()), `report missing "${s}"`);
      has('Each event stops production for 10 h at 50 pcs/h, so 500 pcs are not produced'); has('48% is lost for good, 32% is made up later and 20% is covered by buffer stock');
      has('Cash: repair $1,000 $6,000'); has('Cash: recovery of production made up later (two Saturdays) $800 $4,800'); has('Cash: Repair parts (valves) $250 $1,500'); has('Cash: Contractors and hire (crane) $150 $902');
      has('Cash: buffer stock holding (yearly) n/a $1,500'); has(`Cash costs ${$(x.cashEv)} ${$(x.cashYr)}`); has(`Opportunity loss (240 pcs lost for good × $4) ${$(x.opp)} ${$(x.oppYr)}`); has(`Total ${$(x.costEv)} ${$(x.total)}`);
      has('Per year: 60 hours lost and 3,000 pcs not produced (1,440 pcs lost for good)'); has(`${$(x.total)} per year in total`);
      has('Expected saving (not yet verified) $12,641'); has('an expected saving of $12,641 per year (cash $8,801, opportunity $3,840) for an action cost of $5,000, paid back in 4.7 months'); has('This saving is not yet verified');
      eq(await page.locator('article.print-sheet').getByText('Annual saving (verified)').count(), 0);
    });
    await sub('close', 'Closing (action Done + not recurred + review date): label becomes "Annual saving (verified)", status Closed', async () => {
      await step(page, 'Actions'); await f.setActionStatus(page, 0, 'Done');
      await f.fillVerify(page, { date: '2026-11-10', recurred: 'No, it has not recurred' }); await waitSaved(page);
      const t = (await page.locator('dl').last().innerText()).replace(/\s+/g, ' ').toLowerCase(); ok(t.includes('annual saving (verified) ' + $(saving).toLowerCase()), t);
      const rep = (await e.reportText(page)).toLowerCase(); ok(rep.includes('annual saving (verified) $12,641') && rep.includes('a saving of $12,641 per year') && !rep.includes('not yet verified'), rep.slice(0, 400)); ok(rep.includes('status: closed'));
    });
    await sub('dash-closed', 'Dashboard after closing: loss tile $0, verified tile $251,081 (238,440 + 12,641) with cash $65,801 + opportunity $185,280', async () => {
      await page.goto(BASE + '/app'); const s = await cards(page); ok(/\$0 /.test(s['Annual loss under investigation']), JSON.stringify(s));
      ok(s['Verified annual savings'].includes('$251,081'), JSON.stringify(s)); ok(s['Verified annual savings'].includes('Cash $65,801 · Opportunity $185,280'), JSON.stringify(s));
    });
    await sub('not-verified-states', 'Each missing condition keeps the saving "not yet verified" and out of the dashboard: action open / recurred yes / unreviewed / no review date', async () => {
      await page.goto(BASE + '/app/investigations/' + id); await page.getByRole('navigation', { name: 'Investigation steps' }).waitFor();
      const cases = [['actions open', async () => { await step(page, 'Actions'); await f.setActionStatus(page, 0, 'In progress'); }],
        ['recurred yes', async () => { await step(page, 'Actions'); await f.setActionStatus(page, 0, 'Done'); await f.fillVerify(page, { recurred: 'Yes, it happened again' }); }],
        ['unreviewed', async () => { await f.fillVerify(page, { recurred: 'Not yet reviewed' }); }],
        ['no review date', async () => { await f.fillVerify(page, { recurred: 'No, it has not recurred', date: '' }); }]];
      for (const [name, fn] of cases) {
        await fn(); await step(page, 'Verify'); const t = (await page.locator('dl').last().innerText()).replace(/\s+/g, ' ').toLowerCase(); ok(t.includes('expected saving (not yet verified)'), name + ': ' + t); await waitSaved(page);
        await page.goto(BASE + '/app'); const s = await cards(page); ok(s['Verified annual savings'].includes('$238,440') && !s['Verified annual savings'].includes('251,081'), name + ' counted: ' + JSON.stringify(s));
        await page.goto(BASE + '/app/investigations/' + id); await page.getByRole('navigation', { name: 'Investigation steps' }).waitFor();
      }
    });
  });

  T('LOSS-5', 'Old data without the new fields, and malformed stored shares', async (page, sub) => {
    const mk = (id, loss) => ({ id, schemaVersion: 1, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z', isSample: false,
      problem: { title: 'OLD ' + id, asset: 'a', site: 's', eventDate: '2026-01-01', whatHappened: 'w', where: 'w', when: 'w', impact: 'i' }, loss,
      evidence: [], tree: { id: 't' + id, text: 'top', category: 'physical', status: 'verified', evidenceIds: [], isRootCause: false, collapsed: false, children: [] }, actions: [],
      verification: { reviewDate: '', recurred: 'unreviewed', eventsPerYearAfter: 2, notes: '' } });
    const old = { eventsPerYear: 6, downtimeHours: 10, ratePerHour: 50, unitName: 'pcs', marginPerUnit: 4, repairCost: 1000, currency: '$' }; // no new fields at all
    const ID = 'old1', MAL = 'mal1', NEG = 'neg1';
    await f.seedDemo(page, [mk(ID, old), mk(MAL, { ...old, shareLost: 50, shareMadeUp: 50, shareBuffer: 50, recoveryCost: 600 }), mk(NEG, { ...old, shareLost: -10, shareMadeUp: 60, shareBuffer: 40, recoveryCost: -5, otherCosts: [{ id: 'x', category: 'parts', description: 'neg', amount: -100 }] })]);
    await page.goto(BASE + '/app'); await e.dashStats(page);
    await sub('dash', 'Old record (no share fields) keeps the old maths: $18,000 = $6,000 cash + $12,000 opportunity', async () => {
      const r = (await e.dashRows(page)).find(z => z.includes('OLD old1')); ok(r.includes('$18,000') && r.includes('Cash $6,000 · Opportunity $12,000'), r);
    });
    await sub('open-old', 'Opening the old record shows 100/0/0, empty other costs, no recovery fields, and the same annual loss', async () => {
      await page.goto(BASE + '/app/investigations/' + ID + '#loss'); await page.getByLabel('Lost for good percent', { exact: true }).waitFor(); eq(await shares(page), [100, 0, 0]); eq(await page.getByTestId('other-cost-line').count(), 0); eq(await page.getByTestId('annual-loss').innerText(), '$18,000'); eq(page.errs, []);
    });
    await sub('edit-old', 'Editing an old record (change shares, add cost) works and persists', async () => {
      await setShareUI(page, 'lost', 60); await f.typeNum(page, 'Recovery cost per event', 800); await waitSaved(page); await page.reload(); await step(page, 'Loss'); eq(await shares(page), [60, 40, 0]); eq(await page.getByTestId('annual-loss').innerText(), $(6 * (1000 + 800) + 6 * 500 * 0.6 * 4));
    });
    await sub('verify-old', 'Old record in Verify: events after 2 gives saving $12,000 (cash $4,000... hand: 6->2 events)', async () => {
      await page.goto(BASE + '/app'); await page.goto(BASE + '/app/investigations/' + MAL + '#verify'); await page.getByLabel('Review date').waitFor(); h.note('observation', 'malformed record verify text: ' + (await page.locator('dl').last().innerText()).replace(/\s+/g, ' ').slice(0, 300));
    });
    await sub('malformed-total', 'Stored shares 50/50/50 are shown as whole numbers totalling 100 (33/33/34)', async () => {
      await page.goto(BASE + '/app'); await page.goto(BASE + '/app/investigations/' + MAL + '#loss'); await page.getByLabel('Lost for good percent', { exact: true }).waitFor(); const s = await shares(page); eq(s[0] + s[1] + s[2], 100); eq(s, [33, 33, 34]);
    });
    await sub('malformed-money', 'Malformed 50/50/50 + recovery 600: money uses one third each (opp 500x1/3x$4x6 = $4,000; cash (1000+600)x6 = $9,600; total $13,600) and agrees with what the screen shows', async () => {
      const a = await page.getByTestId('annual-loss').innerText(); ok(a === '$13,600', `annual loss shows ${a}; screen shows shares ${await shares(page)} -> using the displayed 33/33/34 gives ${$(6 * (1000 + 600) + 6 * 500 * 0.33 * 4)}`);
    });
    await sub('negatives', 'Negative stored shares/recovery/other amounts are treated as 0 (no negative money, no NaN)', async () => {
      await page.goto(BASE + '/app'); await page.goto(BASE + '/app/investigations/' + NEG + '#loss'); await page.getByLabel('Lost for good percent', { exact: true }).waitFor(); const s = await shares(page); eq(s[0] + s[1] + s[2], 100); ok(s[0] === 0, 'lost ' + s[0]);
      const t = await page.locator('aside[aria-label="Live calculation"]').innerText(); ok(!/NaN|Infinity|-\$/.test(t), t);
      // hand: shares 0/60/40 -> opp 0; recovery -5 -> 0; other -100 -> 0; cash/event = 1000; annual 6000
      eq(await page.getByTestId('annual-loss').innerText(), '$6,000');
    });
  });

  T('LOSS-6', 'Layout of the new Loss step and Report loss table', async (page, sub) => {
    await buildS3(page); await step(page, 'Loss');
    await sub('layout', 'Loss step with every section open: no horizontal overflow or off-screen content', async () => {
      const o = await h.overflowX(page); await h.shot(page, `loss-step-${tag}`); const off = await page.evaluate(() => { const vw = document.documentElement.clientWidth; return [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); return r.width && (r.right > vw + 1) && !el.closest('.overflow-x-auto,.sr-only'); }).slice(0, 5).map(el => el.tagName + ':' + (el.textContent || '').slice(0, 30)); });
      ok(o.sw <= o.cw && off.length === 0, `sw=${o.sw} cw=${o.cw} off=${off.join(';')}`);
    });
    await sub('report-layout', 'Report with loss table: no overflow; print emulation keeps the table', async () => {
      await e.reportText(page); const o = await h.overflowX(page); await h.shot(page, `loss-report-${tag}`); ok(o.sw <= o.cw, 'report overflow ' + o.sw); await page.emulateMedia({ media: 'print' }); ok(await page.locator('article.print-sheet table').first().isVisible()); await h.shot(page, `loss-report-print-${tag}`); await page.emulateMedia({ media: 'screen' });
    });
    await sub('a11y', 'New controls have accessible names (percent, slider, recovery, holding, category, description, amount, remove)', async () => {
      await step(page, 'Loss'); const bad = await page.evaluate(() => [...document.querySelectorAll('input,select,textarea,button')].filter(el => el.getBoundingClientRect().width > 0 && !(el.getAttribute('aria-label') || el.labels?.length || el.textContent.trim())).map(el => el.outerHTML.slice(0, 80)));
      eq(bad, []);
    });
    await sub('huge', 'Huge loss numbers wrap inside the live-calculation panel (no page overflow at this width)', async () => {
      await f.typeNum(page, 'How many times a year does it happen?', '99999999999999999999'); const o = await h.overflowX(page); await h.shot(page, `loss-huge-${tag}`); ok(o.sw <= o.cw, `overflow ${o.sw}>${o.cw}`);
    });
  });
  T('LOSS-7', 'Duplicate keeps the new loss fields and is independent of the original; sign-in dashboard unaffected', async (page, sub) => {
    await buildS3(page); await page.goto(BASE + '/app'); await e.dashStats(page);
    await page.getByRole('button', { name: /^Duplicate LOSS-S3/ }).click(); await page.waitForURL(/investigations\/(?!sample)/); await step(page, 'Loss');
    await sub('copy-same', 'Copy has 48/32/20, the 2 other-cost lines, recovery note and the same annual loss $20,462', async () => {
      eq(await shares(page), [48, 32, 20]); eq(await page.getByTestId('other-cost-line').count(), 2); eq(await page.getByLabel('Recovery note (optional)').inputValue(), 'two Saturdays'); eq(await page.getByTestId('annual-loss').innerText(), '$20,462');
    });
    await sub('copy-independent', 'Editing the copy (shares, remove a cost line) does not change the original', async () => {
      await setShareUI(page, 'lost', 100); await page.getByRole('button', { name: 'Remove other cost 1' }).click(); await waitSaved(page);
      await page.goto(BASE + '/app'); await e.dashStats(page); const rows = await e.dashRows(page); const orig = rows.find(r => r.includes('LOSS-S3') && !r.includes('Copy of')); ok(orig.includes('$20,462'), orig);
      const copy = rows.find(r => r.includes('Copy of LOSS-S3')); ok(!copy.includes('$20,462'), 'copy row unchanged: ' + copy);
    });
  });
}
if (require.main === module) { suite('desk', DESKTOP); suite('mob', MOBILE); }
if (require.main === module) h.run('loss', { only: process.argv[2] }).then(f => process.exit(f ? 1 : 0));
module.exports = { buildS3, expected, MIXES };
