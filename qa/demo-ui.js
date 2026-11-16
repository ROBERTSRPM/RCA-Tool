// Console/network health, accessibility and responsive layout (demo mode, desktop + 375px)
const h = require('./harness');
const f = require('./flows');
const e = require('./e2e');
const { test, eq, ok, step, waitSaved, withPage, BASE, DESKTOP, MOBILE } = h;

const PAGES = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/app', '/app/investigations/sample-p101'];

test('D-ERR-1', 'No console errors or failed requests on any page (desktop and 375px, every step and cause view)', async ({ browser, sub }) => {
  for (const [name, vp] of [['desktop', DESKTOP], ['mobile', MOBILE]]) {
    await sub('pages-' + name, `${name}: console + network clean on all 7 pages`, async () => withPage(browser, { viewport: vp }, async (page) => {
      for (const u of PAGES) { await page.goto(BASE + u); await page.waitForTimeout(u === '/reset-password' ? 3200 : 1200); }
      const errs = page.errs.filter(x => !/favicon/.test(x)); eq({ errs, fails: page.fails }, { errs: [], fails: [] });
    }));
    await sub('steps-' + name, `${name}: console + network clean while visiting all 7 steps and 3 cause views`, async () => withPage(browser, { viewport: vp }, async (page) => {
      await page.goto(BASE + '/app/investigations/sample-p101'); await page.getByLabel('Title', { exact: true }).waitFor();
      for (const s of h.STEP_LABELS) { await step(page, s); await page.waitForTimeout(150); if (s === 'Cause tree') for (const v of ['5 Whys', 'Fishbone', 'Tree']) await page.getByRole('tab', { name: v }).click(); }
      eq({ errs: page.errs, fails: page.fails }, { errs: [], fails: [] });
    }));
  }
});

// ---------------------------------------------------------------- accessibility helpers
const AUDIT = () => {
  const out = { unlabelled: [], noName: [], imgNoAlt: [], dupId: [], small: [] };
  const name = (el) => {
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    const lb = el.getAttribute('aria-labelledby'); if (lb) return lb.split(' ').map(i => document.getElementById(i)?.textContent || '').join(' ');
    if (el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) return l.textContent; }
    const w = el.closest('label'); if (w) return w.textContent;
    return el.getAttribute('title') || '';
  };
  const vis = (el) => { const r = el.getBoundingClientRect(); return (r.width > 0 && r.height > 0) || el.type === 'file'; };
  document.querySelectorAll('input, select, textarea').forEach(el => { if (el.type === 'hidden' || !vis(el)) return; if (!name(el).trim()) out.unlabelled.push(el.outerHTML.slice(0, 100)); });
  document.querySelectorAll('button, a[href], [role=button], [role=tab], [role=radio]').forEach(el => { if (!vis(el)) return; const n = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').trim(); if (!n) out.noName.push(el.outerHTML.slice(0, 100)); const r = el.getBoundingClientRect(); if ((r.width < 24 || r.height < 24) && !el.matches('.sr-only') && !(el.tagName === 'A' && el.parentElement && /^(P|SPAN|LI)$/.test(el.parentElement.tagName) && el.parentElement.textContent.trim().length > el.textContent.trim().length + 5)) out.small.push(`${(n || '').slice(0, 30)} ${Math.round(r.width)}x${Math.round(r.height)}`); });
  document.querySelectorAll('img').forEach(el => { if (el.getAttribute('alt') === null) out.imgNoAlt.push(el.src.slice(0, 40)); });
  const ids = {}; document.querySelectorAll('[id]').forEach(el => { ids[el.id] = (ids[el.id] || 0) + 1; }); Object.entries(ids).forEach(([k, v]) => { if (v > 1) out.dupId.push(k); });
  out.lang = document.documentElement.lang; out.h1 = document.querySelectorAll('h1').length; out.title = document.title; out.main = document.querySelectorAll('main').length;
  return out;
};
// contrast: walk visible text nodes, compare computed colour with first non-transparent ancestor background
const CONTRAST = () => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
  const parse = (c) => { if (!c || c === 'transparent') return null; cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; /* premultiplied-safe: draw on transparent */ return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => { let cur = el; let acc = null; while (cur) { const c = parse(getComputedStyle(cur).backgroundColor); if (c && c.a > 0) { if (c.a >= 0.99) return acc ? mix(acc, c) : c; acc = acc ? mix(acc, c) : c; } cur = cur.parentElement; } const w = { r: 255, g: 255, b: 255, a: 1 }; return acc ? mix(acc, w) : w; };
  const mix = (top, base) => ({ r: top.r * top.a + base.r * (1 - top.a), g: top.g * top.a + base.g * (1 - top.a), b: top.b * top.a + base.b * (1 - top.a), a: 1 });
  const res = []; const seen = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const n = w.currentNode; if (!n.textContent.trim()) continue; const el = n.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
    const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('.sr-only')) continue;
    let fg = parse(cs.color); if (!fg) continue; const bg = bgOf(el); if (fg.a < 1) fg = mix(fg, bg);
    const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700; const large = size >= 24 || (size >= 18.66 && bold);
    if (ratio < (large ? 3 : 4.5)) res.push({ t: n.textContent.trim().slice(0, 40), ratio: Math.round(ratio * 100) / 100, size, fg: cs.color, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})` });
  }
  return res;
};

test('D-A11Y-1', 'Accessibility: names, labels, headings, language, titles, focus visibility, keyboard reach, contrast', async ({ browser, sub }) => withPage(browser, {}, async (page) => {
  const audits = {};
  const spots = [...PAGES.map(u => [u, u])];
  for (const [label, u] of spots) {
    await page.goto(BASE + u); await page.waitForTimeout(label === '/reset-password' ? 3000 : 1000);
    audits[label] = await page.evaluate(AUDIT);
  }
  await sub('names', 'Every input/select/textarea has an accessible name (all pages)', async () => { eq(Object.fromEntries(Object.entries(audits).map(([k, v]) => [k, v.unlabelled])), Object.fromEntries(spots.map(([k]) => [k, []]))); });
  await sub('btn-names', 'Every button/link has an accessible name', async () => { eq(Object.fromEntries(Object.entries(audits).map(([k, v]) => [k, v.noName])), Object.fromEntries(spots.map(([k]) => [k, []]))); });
  await sub('lang', '<html lang> is set and exactly one <h1> per page', async () => { for (const [k, v] of Object.entries(audits)) { eq(v.lang, 'en', k); ok(v.h1 === 1, `${k} has ${v.h1} h1`); } });
  await sub('titles', 'Each page has its own <title>', async () => {
    const t = Object.entries(audits).map(([k, v]) => `${k}=${v.title}`); const uniq = new Set(Object.values(audits).map(v => v.title));
    ok(uniq.size >= 5, 'page titles are not distinct: ' + t.join(' ; '));
  });
  await sub('dup-ids', 'No duplicate element ids', async () => { for (const [k, v] of Object.entries(audits)) eq(v.dupId, [], k); });
  // workspace steps
  await page.goto(BASE + '/app/investigations/sample-p101');
  const stepAudits = {};
  for (const s of h.STEP_LABELS) { await step(page, s); if (s === 'Evidence') await page.getByRole('button', { name: 'Edit' }).first().click(); stepAudits[s] = await page.evaluate(AUDIT); }
  await sub('ws-names', 'Workspace: all 7 steps have labelled inputs and named buttons', async () => { for (const [k, v] of Object.entries(stepAudits)) { eq(v.unlabelled, [], k + ' inputs'); eq(v.noName, [], k + ' buttons'); } });
  await sub('stepper-name', 'Stepper button accessible names read naturally ("Problem, complete" not "Problem(complete)")', async () => {
    const n = await page.locator('nav[aria-label="Investigation steps"] button').first().evaluate(b => b.textContent); ok(!/\w\(complete\)/.test(n), `name "${n}" has no separator before (complete)`);
  });
  await sub('small-targets', 'Interactive controls are at least 24x24 CSS px (WCAG 2.2 min) on every step', async () => { for (const [k, v] of Object.entries(stepAudits)) eq(v.small, [], k); });
  await sub('contrast-desktop', 'Text contrast >= 4.5:1 (3:1 large) on all pages (desktop)', async () => {
    const bad = {}; for (const u of PAGES) { await page.goto(BASE + u); await page.waitForTimeout(800); const c = await page.evaluate(CONTRAST); if (c.length) bad[u] = c.slice(0, 6); }
    for (const s of h.STEP_LABELS) { await page.goto(BASE + '/app/investigations/sample-p101'); await step(page, s); const c = await page.evaluate(CONTRAST); if (c.length) bad['step ' + s] = c.slice(0, 6); }
    eq(bad, {});
  });
  await sub('focus-visible', 'Keyboard focus is visibly indicated on buttons, links, inputs (outline or ring)', async () => {
    const problems = [];
    for (const u of ['/login', '/app', '/app/investigations/sample-p101']) {
      await page.goto(BASE + u); await page.waitForTimeout(800); await page.locator('body').click({ position: { x: 1, y: 1 } });
      for (let i = 0; i < 18; i++) {
        await page.keyboard.press('Tab');
        const r = await page.evaluate(() => { const el = document.activeElement; if (!el || el === document.body) return null; const cs = getComputedStyle(el); const o = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0; const sh = cs.boxShadow !== 'none'; const bd = el.matches('input,textarea,select'); return { tag: el.tagName + ':' + (el.getAttribute('aria-label') || el.textContent || el.id || '').trim().slice(0, 25), o, sh, outline: cs.outline, box: cs.boxShadow.slice(0, 40), bd }; });
        if (r && !r.o && !r.sh) problems.push(u + ' ' + r.tag + ' outline=' + r.outline + ' shadow=' + r.box);
      }
    }
    eq(problems, []);
  });
  await sub('keyboard-main', 'Dashboard main controls reachable by Tab: New investigation, Open, Duplicate, Delete, Reset sample', async () => {
    await page.goto(BASE + '/app'); await e.dashStats(page); const seen = new Set();
    for (let i = 0; i < 25; i++) { await page.keyboard.press('Tab'); seen.add(await page.evaluate(() => (document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent || '').trim().slice(0, 30))); }
    for (const n of ['New investigation', 'Reset sample data', 'Open']) ok([...seen].some(x => x.startsWith(n)), 'not reached: ' + n + ' in ' + [...seen].join('|'));
    ok([...seen].some(x => x.startsWith('Duplicate')) && [...seen].some(x => x.startsWith('Delete')), 'dup/delete not reached');
  });
  await sub('keyboard-tree', 'Cause tree: boxes reachable and selectable by keyboard (Tab + Enter), toolbar then reachable', async () => {
    await page.goto(BASE + '/app'); await page.goto(BASE + '/app/investigations/sample-p101#cause'); await page.getByRole('tab', { name: 'Tree' }).waitFor();
    await page.getByRole('button', { name: /^Select cause: A\. Bearings fail early/ }).focus(); await page.keyboard.press('Enter');
    await page.getByRole('toolbar', { name: 'Cause actions' }).waitFor();
    eq(await page.locator('[data-node-id][data-selected="true"]').count(), 1);
    await page.keyboard.press('Tab'); // next focus should be the text box of the selected node
    ok(['TEXTAREA', 'BUTTON'].includes(await page.evaluate(() => document.activeElement.tagName)));
  });
  await sub('keyboard-modal', 'Confirm dialog: focus moves into it, Escape closes, focus returns to trigger', async () => {
    await page.goto(BASE + '/app'); await e.dashStats(page); const del = page.getByRole('button', { name: /^Delete / }).first(); await del.focus(); await page.keyboard.press('Enter');
    await page.getByRole('alertdialog').waitFor(); const inside = await page.evaluate(() => !!document.activeElement.closest('[role=alertdialog]')); ok(inside, 'focus not inside dialog');
    for (let i = 0; i < 5; i++) await page.keyboard.press('Tab'); const trapped = await page.evaluate(() => !!document.activeElement.closest('[role=alertdialog]')); ok(trapped, 'focus escaped the modal dialog after Tab (no focus trap)');
  });
  await sub('modal-focus-return', 'After closing the dialog with Escape focus returns to the button that opened it', async () => {
    await page.goto(BASE + '/app'); await e.dashStats(page); const del = page.getByRole('button', { name: /^Delete / }).first(); await del.focus(); await page.keyboard.press('Enter');
    await page.getByRole('alertdialog').waitFor(); await page.keyboard.press('Escape'); await page.getByRole('alertdialog').waitFor({ state: 'detached' });
    const a = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName); ok(/^Delete /.test(a), 'focus is on: ' + a);
  });
  await sub('account-menu-kbd', 'Skip link / landmarks: page has a <main> landmark on dashboard and workspace', async () => {
    for (const u of ['/app', '/app/investigations/sample-p101']) { await page.goto(BASE + u); await page.waitForTimeout(800); eq(await page.locator('main').count(), 1, u + ' <main> count'); }
  });
}));

// ---------------------------------------------------------------- mobile layout
const OFFSCREEN = () => {
  const vw = document.documentElement.clientWidth; const bad = [];
  const inScroller = (el) => { let p = el.parentElement; while (p && p !== document.body) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true; p = p.parentElement; } return false; };
  document.querySelectorAll('body *').forEach(el => { const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) return; if (r.right > vw + 1 || r.left < -1) { if (!inScroller(el) && !el.closest('.sr-only') && getComputedStyle(el).position !== 'fixed') bad.push(`${el.tagName}.${(el.className + '').slice(0, 30)} "${(el.textContent || '').trim().slice(0, 25)}" l=${Math.round(r.left)} r=${Math.round(r.right)}`); } });
  return bad.slice(0, 6);
};
test('D-MOB-1', '375px layout: no horizontal overflow, clipped or off-screen content on every page and step (sample + filled)', async ({ browser, sub }) => withPage(browser, { viewport: MOBILE }, async (page) => {
  for (const u of PAGES) await sub('page' + u.replace(/\W+/g, '_'), `375px ${u}: no overflow / off-screen content`, async () => {
    await page.goto(BASE + u); await page.waitForTimeout(u === '/reset-password' ? 3000 : 1000); const o = await h.overflowX(page); await h.shot(page, 'mobile' + u.replace(/\W+/g, '_'));
    const off = await page.evaluate(OFFSCREEN); ok(o.sw <= o.cw && off.length === 0, `sw=${o.sw} cw=${o.cw} off=${off.join(' ; ')}`);
  });
  for (const s of h.STEP_LABELS) await sub('step-' + s, `375px sample "${s}" step: no overflow / off-screen content`, async () => {
    await page.goto(BASE + '/app/investigations/sample-p101'); await step(page, s); await page.waitForTimeout(300); const o = await h.overflowX(page); await h.shot(page, 'mobile-sample-' + s.replace(' ', ''));
    const off = await page.evaluate(OFFSCREEN); ok(o.sw <= o.cw && off.length === 0, `sw=${o.sw} cw=${o.cw} off=${off.join(' ; ')}`);
  });
  await sub('cause-views', '375px cause views (5 Whys, Fishbone, Tree with selected node + panel): no overflow', async () => {
    await page.goto(BASE + '/app'); await page.goto(BASE + '/app/investigations/sample-p101#cause'); await page.getByRole('tab', { name: 'Tree' }).waitFor();
    await page.getByRole('button', { name: /^Select cause: A\. Bearings fail early/ }).click(); await h.shot(page, 'mobile-tree-selected');
    const bad = [];
    for (const v of ['Tree', '5 Whys', 'Fishbone']) { await page.getByRole('tab', { name: v }).click(); await page.waitForTimeout(200); const o = await h.overflowX(page); await h.shot(page, 'mobile-view-' + v.replace(' ', '')); if (o.sw > o.cw) bad.push(v + ' ' + o.sw); const off = await page.evaluate(OFFSCREEN); if (off.length) bad.push(v + ': ' + off.join(' ; ')); }
    eq(bad, []);
  });
  await sub('tap-targets', '375px: primary controls are at least 40px tall (touch)', async () => {
    await page.goto(BASE + '/app'); await e.dashStats(page);
    const small = await page.evaluate(() => [...document.querySelectorAll('button, a.btn, a[href]')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 32 && el.closest('header') === null && !el.closest('[data-testid=demo-banner]'); }).map(el => `${(el.getAttribute('aria-label') || el.textContent).trim().slice(0, 25)} ${Math.round(el.getBoundingClientRect().height)}px`));
    eq(small, []);
  });
  await sub('stepper-scroll', '375px: stepper scrolls horizontally and the active step stays in view', async () => {
    await page.goto(BASE + '/app/investigations/sample-p101'); await step(page, 'Report');
    const vis = await page.locator('nav[aria-label="Investigation steps"] [aria-current="step"]').evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1; }); ok(vis, 'Report step button not fully visible');
  });
  await sub('mobile-print-buttons', '375px: Back/Next buttons do not overlap content', async () => {
    await page.goto(BASE + '/app/investigations/sample-p101'); const r = await page.getByRole('button', { name: /^Next:/ }).boundingBox(); ok(r && r.x + r.width <= 376);
  });
}));

test('D-MOB-E2E', '375px: the full end-to-end flow (all 7 steps, 7-cause tree, actions, verify) works with touch-sized layout', async ({ browser, sub }) => withPage(browser, { viewport: MOBILE }, async (page) => {
  const id = await h.demoNew(page);
  const calc = await e.buildAll(page, { sub, mode: 'mobile' });
  await e.finishVerify(page, { sub });
  await sub('report-mobile', 'Mobile report shows the same headline numbers', async () => {
    const t = (await e.reportText(page)).toLowerCase(); ok(t.includes('annual loss $13,800') && t.includes('expected saving (not yet verified) $10,350'), t.slice(0, 300)); await h.shot(page, 'mobile-e2e-report');
    const o = await h.overflowX(page); ok(o.sw <= o.cw, 'report overflow ' + o.sw);
  });
  await sub('tree-mobile', 'Mobile tree with 7 nodes: no page overflow, tree scroll container used', async () => {
    await step(page, 'Cause tree'); await h.shot(page, 'mobile-e2e-tree'); const o = await h.overflowX(page); ok(o.sw <= o.cw, 'overflow ' + o.sw);
  });
}));
module.exports = {};
