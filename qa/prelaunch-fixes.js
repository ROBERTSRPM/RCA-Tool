// Pre-launch fix round (demo mode, signed out). Run: BASE_URL=http://localhost:3555 node prelaunch-fixes.js
const h = require('./harness');
const f = require('./flows');
const { test, eq, ok, step, waitSaved, withPage, BASE } = h;

const SUPPORT = 'roberts@intelbeyond.com';

test('P-PAGES-1', 'Help and Terms pages exist; footer, auth pages and 404 carry support email', async ({ browser, sub }) => withPage(browser, {}, async (page) => {
  await sub('help', '/help has 7 steps, AI notice, loss optional, contact', async () => {
    await page.goto(BASE + '/help'); const t = await page.locator('main').innerText();
    for (const s of ['Problem', 'Loss', 'Evidence', 'Cause tree', 'Actions', 'Verify', 'Report']) ok(t.includes(s), s);
    ok(/AI data notice/.test(t) && /Not known yet/.test(t) && t.includes(SUPPORT), t.slice(0, 200));
  });
  await sub('terms', '/terms is marked Draft - under review', async () => {
    await page.goto(BASE + '/terms'); const t = await page.locator('main').innerText();
    ok(/Draft — under review/.test(t) && /Australia/.test(t), t.slice(0, 200));
  });
  await sub('privacy', '/privacy keeps its draft note and says Sydney and United States', async () => {
    await page.goto(BASE + '/privacy'); const t = await page.locator('main').innerText();
    ok(/Draft\./.test(t) && /Sydney/.test(t) && /United States/.test(t), t.slice(0, 200));
  });
  await sub('footer', 'App footer links Help, Privacy, Terms and shows the support email', async () => {
    await page.goto(BASE + '/app'); const ft = page.getByTestId('site-footer');
    for (const n of ['Help', 'Privacy', 'Terms']) await ft.getByRole('link', { name: n }).waitFor();
    ok((await ft.innerText()).includes(SUPPORT));
  });
  await sub('auth', 'Login and signup show "Need help?" with email and links', async () => {
    for (const u of ['/login', '/signup']) { await page.goto(BASE + u); const t = await page.locator('main').innerText(); ok(/Need help\?/.test(t) && t.includes(SUPPORT), u); }
  });
  await sub('no-free', 'Signup has no "Free" claim', async () => {
    await page.goto(BASE + '/signup'); const t = await page.locator('main').innerText(); ok(!/\bFree\b/.test(t), t.slice(0, 300));
  });
  await sub('404', '404 page shows the support email', async () => {
    await page.goto(BASE + '/nope-nope'); ok((await page.locator('main').innerText()).includes(SUPPORT));
  });
}));

test('P-DEMO-1', 'Demo mode: one quiet AI note per step; new investigation has no red findings', async ({ browser, sub }) => withPage(browser, {}, async (page) => {
  await h.demoNew(page);
  await sub('problem-note', 'Problem step: no notes box or greyed AI button, one "Sign in to get AI suggestions" note', async () => {
    eq(await page.getByTestId('ai-card').count(), 0); eq(await page.getByTestId('ai-demo-note').count(), 1);
    eq(await page.getByLabel('Rough notes').count(), 0);
    ok(/Sign in\s+to get AI suggestions/.test(await page.getByTestId('ai-demo-note').innerText()));
  });
  await sub('no-red', 'Fresh investigation: quality check is neutral (no "to fix first", no red dot)', async () => {
    const t = await page.locator('section[aria-label="Quality check"]').innerText();
    ok(!/to fix first/.test(t), t); ok(/things to do as you go/.test(t), t);
  });
  for (const s of ['Cause tree', 'Actions', 'Report']) {
    await sub('note-' + s, s + ': exactly one AI note, no AI panels', async () => {
      await step(page, s); eq(await page.getByTestId('ai-card').count(), 0); eq(await page.getByTestId('ai-demo-note').count(), 1);
    });
  }
}));

test('P-LOSS-1', 'Loss without dollar figures: Not known yet, partial, rough estimate, report wording', async ({ browser, sub }) => withPage(browser, {}, async (page) => {
  await h.demoNew(page); await step(page, 'Loss');
  await sub('not-known', '"Not known yet" hides figures and shows "Loss not costed yet"', async () => {
    await page.getByTestId('loss-not-known').click();
    ok((await page.getByTestId('annual-loss').innerText()).includes('Loss not costed yet'));
    eq(await page.getByLabel('Downtime per event').count(), 0);
  });
  await sub('report-not-costed', 'Report says "Loss not costed yet" and never $0 annual loss', async () => {
    await step(page, 'Report'); const t = await page.locator('article.print-sheet').innerText();
    ok(/Loss not costed yet/.test(t), t.slice(0, 400)); ok(!/NaN/.test(t));
    ok(!/Annual loss\s*\$0/.test(t.replace(/\s+/g, ' ')), 'shows $0');
  });
  await sub('gentle', 'Quality check shows the gentle low reminder', async () => {
    await step(page, 'Loss'); await f.openQuality(page);
    ok((await f.qualityTexts(page)).some(x => /Add a rough figure when you can\. Managers act on dollars/.test(x)));
  });
  await sub('partial', 'Downtime hours only: still "not costed", no NaN', async () => {
    await page.getByTestId('loss-have-figures').click(); await f.typeNum(page, 'Downtime per event', 8);
    ok((await page.getByTestId('annual-loss').innerText()).includes('Loss not costed yet'));
    ok(!/NaN/.test(await page.locator('main').innerText()));
  });
  await sub('estimate', 'A single rough yearly estimate is accepted and used', async () => {
    await f.typeNum(page, 'Or one rough cost per year', 150000);
    eq((await page.getByTestId('annual-loss').innerText()).trim(), '$150,000');
    await step(page, 'Report'); ok(/150,000/.test(await page.locator('article.print-sheet').innerText()));
  });
  await sub('no-saving-claim', 'Estimate with no events on record: no saving figure is claimed on Verify', async () => {
    await step(page, 'Verify'); await f.typeNum(page, 'Expected events per year after the fix', 0);
    const t = await page.locator('main').innerText(); ok(!/NaN/.test(t)); ok(/Not entered|not costed/i.test(t), t.slice(0, 500));
  });
  await sub('persist', 'Not known yet survives a reload', async () => {
    await step(page, 'Loss'); await page.getByTestId('loss-not-known').click(); await waitSaved(page); await page.reload(); await step(page, 'Loss');
    eq(await page.getByTestId('loss-not-known').getAttribute('aria-pressed'), 'true');
  });
}));

test('P-SIM-1', 'Similar failures: the sample is never offered to a new unrelated investigation', async ({ browser, sub }) => withPage(browser, {}, async (page) => {
  await h.demoNew(page);
  await sub('no-sample', 'Gearbox investigation sees no sample match', async () => {
    await f.fillProblem(page, { title: 'Bearing failure on conveyor gearbox', asset: 'Conveyor gearbox', site: 'Plant', eventDate: '2026-05-01', whatHappened: 'Bearing failed months after seal replacement', where: 'Input shaft', when: 'Night shift', impact: 'Down' });
    await step(page, 'Cause tree'); await page.waitForTimeout(800);
    const t = await page.locator('main').innerText(); ok(!/Illustrative sample|Copy this cause into my tree/.test(t), 'sample offered');
  });
}));

test('P-REPORT-1', 'Print layout: maintenance plan columns are not clipped and words do not split', async ({ browser, sub }) => withPage(browser, {}, async (page) => {
  await page.goto(BASE + '/app'); await page.getByText('Repeat bearing and mechanical seal failures').first().click();
  await page.waitForURL(/investigations\//); await step(page, 'Report'); await page.locator('article.print-sheet').waitFor();
  await page.emulateMedia({ media: 'print' });
  await sub('plan-cols', 'Every column of every report table fits inside the page width', async () => {
    const r = await page.evaluate(() => [...document.querySelectorAll('article.print-sheet table')].map(t => { const a = t.closest('article').getBoundingClientRect(); const b = t.getBoundingClientRect(); return { right: Math.round(b.right), limit: Math.round(a.right), sw: t.scrollWidth, cw: t.clientWidth }; }));
    for (const x of r) ok(x.right <= x.limit + 2 && x.sw <= x.cw + 2, JSON.stringify(x));
  });
  await sub('no-split', 'No table header is broken mid-word', async () => {
    const heads = await page.evaluate(() => [...document.querySelectorAll('article.print-sheet th')].filter(th => th.offsetParent).map(th => ({ t: th.textContent.trim(), h: th.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(th).lineHeight) || 14 })));
    for (const x of heads) ok(x.h < x.lh * 2.6, `header "${x.t}" wraps`);
  });
}));

// ---- signed in (QA user B only; cleaned up at the end)
test('P-AUTH-1', 'Signed in: photo help, ghost asset on tag rename, session-lost toast, sample not offered', async ({ browser, sub }) => {
  const { cleanAccount } = require('./cleanup');
  const state = await h.loginState(browser, h.USER_B);
  await withPage(browser, { storageState: state }, async (page) => {
    await h.demoNew(page); const id = page.url().split('/investigations/')[1].split('#')[0];
    await sub('photo-help', 'Evidence photo help says "kept in your account"', async () => {
      await step(page, 'Evidence'); await page.getByRole('button', { name: /Add evidence/ }).first().click().catch(() => {});
      await page.waitForTimeout(500); const t = await page.locator('main').innerText();
      ok(/kept in your account/.test(t) && !/kept in this browser only/.test(t), t.slice(0, 300));
    });
    await sub('ghost-asset', 'Renaming the tag leaves no ghost asset in the register', async () => {
      await step(page, 'Problem');
      const tag = page.getByLabel('Asset tag', { exact: true });
      if (!(await tag.isVisible())) await page.getByRole('button', { name: /Asset details/ }).click();
      await tag.fill('QA-GHOST-9'); await tag.blur(); await page.getByText(/In your/).waitFor({ timeout: 8000 });
      await tag.fill('QA-GHOST-9B'); await tag.blur(); await page.waitForTimeout(3500);
      await page.goto(BASE + '/app/assets'); await page.waitForTimeout(2500);
      const t = await page.locator('main').innerText(); ok(/QA-GHOST-9B/.test(t), 'new tag missing'); ok(!/QA-GHOST-9(?!B)/.test(t), 'ghost tag still in register');
    });
    await sub('session-lost', 'After the session is lost, a sticky toast says "You\'ve been signed out..." with a sign-in link and the text stays', async () => {
      await page.goto(BASE + '/app/investigations/' + id); const title = page.getByLabel('Title', { exact: true }); await title.waitFor();
      await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (/auth-token/.test(k)) localStorage.removeItem(k); });
      await page.context().route('**/rest/v1/**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST301', message: 'JWT expired' }) }));
      await title.fill('typed after sign-out');
      const toast = page.getByTestId('save-error-toast'); await toast.waitFor({ timeout: 15000 });
      const t = await toast.innerText(); ok(t.includes("You've been signed out. Sign in again to keep saving; your changes are still on this page."), t);
      await toast.getByRole('link', { name: /Sign in/ }).waitFor(); eq(await title.inputValue(), 'typed after sign-out');
      const box = await toast.boundingBox(); ok(box && box.y > 300, 'toast should sit at the bottom of the screen: ' + JSON.stringify(box));
      await page.context().unroute('**/rest/v1/**');
    });
  });
  await withPage(browser, { storageState: state }, async (page) => { await cleanAccount(page); });
});

if (require.main === module) h.run('prelaunch-fixes', { only: process.argv[2] }).then(n => process.exit(n ? 1 : 0));
module.exports = {};
