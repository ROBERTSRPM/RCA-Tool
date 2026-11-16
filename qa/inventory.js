// Enumerates every interactive control per page / step / view. Output: results/inventory.json
// Usage: BASE_URL=... node inventory.js
const fs = require('fs');
const h = require('./harness');
const { chromium } = require('playwright');
const SEL = 'a[href], button, input, select, textarea, [role=tab], [role=radio], [role=menuitem], [tabindex="0"]';
async function list(page, scope) {
  return page.evaluate(([sel, scope]) => {
    const root = scope ? document.querySelector(scope) : document;
    if (!root) return [];
    return [...root.querySelectorAll(sel)].filter(e => e.offsetParent !== null || e.type === 'file' || e.className?.includes?.('sr-only')).map(e => {
      const lab = e.getAttribute('aria-label') || (e.id && document.querySelector(`label[for="${e.id}"]`)?.textContent) || e.closest('label')?.textContent || e.textContent || e.placeholder || '';
      return `${e.tagName.toLowerCase()}${e.type && e.tagName === 'INPUT' ? '[' + e.type + ']' : ''}${e.getAttribute('role') ? '{' + e.getAttribute('role') + '}' : ''}: ${lab.trim().replace(/\s+/g, ' ').slice(0, 70)}${e.disabled ? ' (disabled)' : ''}`;
    });
  }, [SEL, scope]);
}
(async () => {
  const b = await chromium.launch();
  const inv = {};
  const p = await h.newPage(b);
  for (const u of ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/app']) {
    await p.goto(h.BASE + u); await p.waitForTimeout(3000);
    inv['page ' + u] = await list(p);
  }
  // workspace on the sample, every step; and the cause tree with a child node selected in each view
  await p.goto(h.BASE + '/app/investigations/sample-p101'); await p.waitForTimeout(1500);
  for (const s of h.STEP_LABELS) {
    await h.step(p, s);
    inv['workspace step ' + s] = await list(p, 'main, #__next, body > div');
    if (s === 'Evidence') { await p.getByRole('button', { name: 'Edit' }).first().click(); inv['workspace step Evidence (item expanded)'] = await list(p); }
    if (s === 'Cause tree') {
      await p.getByRole('button', { name: /^Select cause: Pump runs/ }).first().click().catch(() => {});
      inv['cause tree view (a cause selected)'] = await list(p);
      for (const v of ['5 Whys', 'Fishbone']) { await p.getByRole('tab', { name: v }).click(); inv['cause view ' + v] = await list(p); }
    }
  }
  fs.writeFileSync(h.BASE.includes('x') ? 'results/inventory.json' : 'results/inventory.json', JSON.stringify(inv, null, 1));
  for (const [k, v] of Object.entries(inv)) console.log('\n## ' + k + ' (' + v.length + ')\n' + v.join('\n'));
  await b.close();
})();
