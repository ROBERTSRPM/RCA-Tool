// Shared cleanup: leaves an account with only its seeded sample investigation (and the sample assets), no other assets, no unreadable rows.
const h = require('./harness');
const e = require('./e2e');
const { BASE, eq, ok } = h;

async function cleanAccount(page) {
  await page.goto(BASE + '/app'); await e.dashStats(page); await page.waitForTimeout(500);
  for (let guard = 0; guard < 60; guard++) {
    const rows = await page.locator('section[aria-label="Investigations list"] ul > li').all(); let target = null;
    for (const li of rows) { if (!(await li.innerText()).includes('Illustrative sample')) { target = li; break; } }
    if (!target) break;
    await target.getByRole('button', { name: /^Delete / }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click(); await page.waitForTimeout(600);
  }
  // restore the pristine sample (also upgrades it); no dialog when there is no sample, a confirm dialog when there is one
  await page.getByRole('button', { name: 'Reset sample data' }).click(); await page.waitForTimeout(300);
  const dlg = page.getByRole('alertdialog'); if (await dlg.count()) await dlg.getByRole('button', { name: 'Reset sample' }).click();
  await page.waitForTimeout(2500);
  await page.goto(BASE + '/app/assets'); await page.waitForTimeout(1500);
  if (await page.getByTestId('register-unavailable').count()) return { assetsAvailable: false };
  await page.getByRole('heading', { name: 'Assets', level: 1 }).waitFor();
  await page.waitForTimeout(1200);
  for (let guard = 0; guard < 80; guard++) {
    const rows = await page.getByTestId('asset-row').all(); let target = null;
    for (const r of rows) { if (!(await r.innerText()).includes('Illustrative sample')) { target = r; break; } }
    if (!target) break;
    await target.getByRole('button', { name: /^Delete / }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click(); await page.waitForTimeout(500);
  }
  return { assetsAvailable: true };
}
module.exports = { cleanAccount };
