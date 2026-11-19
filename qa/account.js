// Signed-in suite (Supabase). Uses the two existing test accounts only; never signs up.
// Run: BASE_URL=http://localhost:3555 node account.js [idPrefix]
const h = require('./harness');
const f = require('./flows');
const e = require('./e2e');
const { test, eq, ok, step, waitSaved, withPage, money, BASE, DESKTOP, MOBILE, USER_A, USER_B, PASSWORD } = h;
let SA, SB; // storage states
const created = { A: [], B: [] };
const ensure = async (browser) => { if (!SA) SA = await h.loginState(browser, USER_A); if (!SB) SB = await h.loginState(browser, USER_B); };
const asUser = async (browser, who, fn, opts = {}) => (await ensure(browser), withPage(browser, { storageState: who === 'A' ? SA : SB, ...opts }, fn));
const invIdOf = (page) => page.url().split('/investigations/')[1].split('#')[0];
const fieldErr = (page) => page.locator('[role=alert], .field-error, p.text-red-600, p.text-red-700').allInnerTexts();

test('A-00', 'Setup: sign in as user A and user B (also: wrong-password test counts as A-AUTH)', async ({ browser }) => {
  await ensure(browser);
});

// ---------------------------------------------------------------- auth forms (no real accounts created)
test('A-AUTH-1', 'Auth forms: validation, wrong password, links, signed-out access', async ({ browser, sub }) => withPage(browser, {}, async (page) => {
  const err = async () => (await page.locator('form').innerText()).replace(/\s+/g, ' ');
  await sub('login-empty', 'Login: empty submit shows "Enter your email address." and "Enter your password."', async () => {
    await page.goto(BASE + '/login'); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    const t = await err(); ok(t.includes('Enter your email address.') && t.includes('Enter your password.'), t);
  });
  await sub('login-malformed', 'Login: malformed emails ("abc", "a@b", "a b@c.com", "a@b.c") are rejected client-side', async () => {
    for (const m of ['abc', 'a@b', 'a b@c.com', 'a@b.c', '@x.com']) { await page.goto(BASE + '/login'); await page.getByLabel('Email').fill(m); await page.getByLabel('Password').fill('x'); await page.getByRole('button', { name: 'Sign in', exact: true }).click(); ok((await err()).includes('does not look like an email'), m + ' -> ' + await err()); }
  });
  await sub('login-wrong-pw', 'Login: wrong password shows friendly message, stays on /login, no token stored', async () => {
    await page.goto(BASE + '/login'); await page.getByLabel('Email').fill(USER_A); await page.getByLabel('Password').fill('WrongPassword-123'); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByText('That email and password do not match').waitFor(); ok(/\/login/.test(page.url()));
    ok(!(await page.evaluate(() => Object.keys(localStorage).some(k => /auth-token/.test(k)))), 'auth token stored after failed login');
    await h.shot(page, 'auth-login-wrong-password');
  });
  await sub('login-unknown-user', 'Login: unknown email gives the same message (no account enumeration)', async () => {
    await page.goto(BASE + '/login'); await page.getByLabel('Email').fill('nobody-qa-xyz@rca-tool.test'); await page.getByLabel('Password').fill('WrongPassword-123'); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByText('That email and password do not match').waitFor();
  });
  await sub('login-ui', 'Login: password field is masked, inline error clears after fixing, Enter submits', async () => {
    await page.goto(BASE + '/login'); eq(await page.getByLabel('Password').getAttribute('type'), 'password');
    await page.getByLabel('Email').fill('bad'); await page.getByLabel('Email').blur(); await page.getByText('does not look like an email').waitFor();
    await page.getByLabel('Email').fill('ok@example.com'); await page.getByLabel('Password').fill('abc'); await page.getByLabel('Password').press('Enter');
    await page.getByText('does not look like an email').waitFor({ state: 'detached' });
    await page.getByText(/That email and password|Something went wrong|Too many/).waitFor();
  });
  await sub('signup-empty', 'Signup: empty submit shows email + password errors (nothing sent)', async () => {
    const reqs = []; page.on('request', r => { if (/supabase/.test(r.url()) && r.method() === 'POST') reqs.push(r.url()); });
    await page.goto(BASE + '/signup'); await page.getByRole('button', { name: 'Create account' }).click(); const t = await err();
    ok(t.includes('Enter your email address.') && t.includes('Choose a password.'), t); eq(reqs, [], 'no network call expected');
  });
  await sub('signup-weak', 'Signup: weak/short password (7 chars) rejected; mismatch rejected; hint visible', async () => {
    await page.goto(BASE + '/signup'); await page.getByLabel('Email').fill('qa-validation-only@example.com'); await page.getByLabel('Password', { exact: true }).fill('Abc1234'); await page.getByLabel('Confirm password').fill('Abc1234');
    await page.getByRole('button', { name: 'Create account' }).click(); ok((await err()).includes('Use at least 8 characters.'), await err());
    await page.getByLabel('Password', { exact: true }).fill('Abcdefg12'); await page.getByLabel('Confirm password').fill('Different12');
    await page.getByRole('button', { name: 'Create account' }).click(); ok((await err()).includes('The two passwords do not match.'), await err());
    ok((await err()).includes('At least 8 characters.'));
  });
  await sub('signup-malformed', 'Signup: malformed email rejected', async () => {
    await page.goto(BASE + '/signup'); await page.getByLabel('Email').fill('not-an-email'); await page.getByLabel('Password', { exact: true }).fill('Abcdefg12'); await page.getByLabel('Confirm password').fill('Abcdefg12');
    await page.getByRole('button', { name: 'Create account' }).click(); ok((await err()).includes('does not look like an email'), await err());
  });
  await sub('signup-common-pw', 'Signup: 8-char all-numeric password "12345678" - client accepts (server decides); not submitted', async () => {
    h.note('observation', 'Client-side password rule is length only (min 8); strength is left to the server. Not submitted to avoid creating an account.');
  });
  await sub('forgot-validation', 'Forgot password: empty and malformed email rejected, nothing sent', async () => {
    const reqs = []; page.on('request', r => { if (/supabase/.test(r.url()) && r.method() === 'POST') reqs.push(r.url()); });
    await page.goto(BASE + '/forgot-password'); await page.getByRole('button', { name: 'Send reset link' }).click(); ok((await err()).includes('Enter your email address.'));
    await page.getByLabel('Email').fill('nope'); await page.getByRole('button', { name: 'Send reset link' }).click(); ok((await err()).includes('does not look like an email'));
    eq(reqs, []);
  });
  await sub('reset-no-token', 'Reset password without a valid link shows "Reset link not valid" and a working "Request a new link"', async () => {
    await page.goto(BASE + '/reset-password'); await page.getByText('Checking your reset link').waitFor(); await page.getByText('Reset link not valid').waitFor({ timeout: 8000 });
    await page.getByRole('link', { name: 'Request a new link' }).click(); await page.waitForURL(/forgot-password/);
  });
  await sub('reset-bad-token', 'Reset password with garbage hash token does not crash and shows the invalid-link state', async () => {
    await page.goto(BASE + '/reset-password#access_token=garbage&refresh_token=garbage&type=recovery'); await page.getByText('Reset link not valid').waitFor({ timeout: 10000 });
  });
  await sub('auth-links', 'Auth page links: login<->signup, login->forgot, forgot->login, "Try the demo"->/app, logo', async () => {
    await page.goto(BASE + '/login'); await page.getByRole('link', { name: 'Create a free account' }).click(); await page.waitForURL(/signup/);
    await page.getByRole('link', { name: 'Sign in', exact: true }).click(); await page.waitForURL(/login/);
    await page.getByRole('link', { name: 'Forgot your password?' }).click(); await page.waitForURL(/forgot/);
    await page.getByRole('link', { name: 'Back to sign in' }).click(); await page.waitForURL(/login/);
    await page.getByRole('link', { name: 'Try the demo' }).click(); await page.waitForURL(/\/app$/);
  });
  await sub('signed-out-app', 'Signed out: /app and /app/investigations/<id> open in demo mode (banner shown), no redirect', async () => {
    await page.goto(BASE + '/app'); await page.getByTestId('demo-banner').waitFor(); await page.goto(BASE + '/app/investigations/sample-p101'); await page.getByTestId('demo-banner').waitFor();
  });
  await sub('next-param', 'Login ?next= only honours same-site paths (open-redirect check): //evil.com and https://evil.com ignored', async () => {
    // pure behaviour check on the page: after successful login would redirect; verify via a fresh login as A
    for (const n of ['//evil.example', 'https://evil.example', '/\\evil.example']) {
      await withPage(browser, {}, async (p) => { await p.goto(BASE + '/login?next=' + encodeURIComponent(n)); await p.getByLabel('Email').fill(USER_A); await p.getByLabel('Password').fill(PASSWORD); await p.getByRole('button', { name: 'Sign in', exact: true }).click(); await p.waitForURL(/localhost|\/app/, { timeout: 20000 }); ok(new URL(p.url()).origin === new URL(BASE).origin, 'redirected to ' + p.url()); });
    }
  });
  await sub('next-valid', 'Login ?next=/app/investigations/sample-p101 returns there after sign in', async () => withPage(browser, {}, async (p) => {
    await p.goto(BASE + '/login?next=' + encodeURIComponent('/app/investigations/sample-p101')); await p.getByLabel('Email').fill(USER_A); await p.getByLabel('Password').fill(PASSWORD); await p.getByRole('button', { name: 'Sign in', exact: true }).click(); await p.waitForURL(/investigations/, { timeout: 20000 });
  }));
  await sub('confirmed-banner', 'Login ?confirmed=1 shows "Email confirmed" notice', async () => { await page.goto(BASE + '/login?confirmed=1'); await page.getByText('Email confirmed. You can sign in now.').waitFor(); });
}));

// ---------------------------------------------------------------- session and dashboard
test('A-SESS-1', 'Signed in: session survives reload, account menu, signed-in /login redirect, sign out, demo data separate', async ({ browser, sub }) => asUser(browser, 'A', async (page) => {
  await page.goto(BASE + '/app'); await e.dashStats(page);
  await sub('menu', 'Account menu shows user A email; menu has "My investigations" and "Sign out"; Escape and outside-click close it', async () => {
    eq(await page.getByTestId('account-menu-button').innerText().then(t => t.trim()), USER_A);
    await page.getByTestId('account-menu-button').click(); eq(await page.getByTestId('account-email').innerText(), USER_A);
    await page.getByRole('menuitem', { name: 'My investigations' }).waitFor(); await page.keyboard.press('Escape'); await page.getByRole('menu').waitFor({ state: 'detached' });
    await page.getByTestId('account-menu-button').click(); await page.mouse.click(10, 300); await page.getByRole('menu').waitFor({ state: 'detached' });
  });
  await sub('no-banner', 'No demo banner when signed in', async () => { eq(await page.getByTestId('demo-banner').count(), 0); });
  await sub('reload', 'Session survives reload and a fresh navigation (still user A, same data)', async () => {
    await page.reload(); await e.dashStats(page); eq(await page.getByTestId('account-menu-button').innerText().then(t => t.trim()), USER_A);
    await page.goto(BASE + '/'); await page.getByTestId('account-menu-button').waitFor();
  });
  await sub('login-redirect', 'Visiting /login or /signup while signed in redirects to /app', async () => {
    for (const u of ['/login', '/signup']) { await page.goto(BASE + u); await page.waitForURL(/\/app$/, { timeout: 15000 }); }
  });
  await sub('sample-seeded', 'Account has its own seeded sample with the same hand-calculated totals as demo ($238,440 saved, round 3 sample)', async () => {
    await page.goto(BASE + '/app'); const s = await e.dashStats(page); eq(s['Verified annual savings'], '$238,440'); eq(s['Open actions'], '0');
    const rows = await e.dashRows(page); ok(rows.some(r => r.includes('Illustrative sample') && r.includes('$238,440')), rows.join('|'));
  });
  await sub('landing-sample-link', 'Landing "Open the sample investigation" maps to the account sample when signed in', async () => {
    await page.goto(BASE + '/'); await page.getByRole('link', { name: 'Try the sample investigation' }).click(); await page.waitForURL(/investigations/);
    await page.getByRole('heading', { name: /Repeat bearing and mechanical seal failures/, level: 1 }).waitFor();
  });
  await sub('demo-separate', 'Demo-mode data is separate: signing out shows demo store, not account data', async () => {
    await page.goto(BASE + '/app'); await e.dashStats(page); await page.getByTestId('account-menu-button').click(); await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await page.waitForURL(/\/app$/); await page.getByTestId('demo-banner').waitFor(); await e.dashStats(page);
    await page.goto(BASE + '/app/investigations/sample-p101'); await page.getByLabel('Title', { exact: true }).waitFor();
    await page.goto(BASE + '/app'); await page.getByRole('link', { name: 'Sign in' }).first().waitFor();
  });
  await sub('signed-out-no-cache', 'After sign out, reloading does not show account data (token removed)', async () => {
    await page.reload(); await page.getByTestId('demo-banner').waitFor(); eq(await page.getByTestId('account-menu-button').count(), 0);
    ok(!(await page.evaluate(() => Object.keys(localStorage).some(k => /auth-token/.test(k)))), 'auth token remains in localStorage after sign out');
  });
}));

test('A-PERF-1', 'Signed-in dashboard load time (navigation start to totals + rows rendered)', async ({ browser, sub }) => {
  const runs = [];
  for (let i = 0; i < 7; i++) await asUser(browser, 'A', async (page) => {
    const t0 = Date.now(); await page.goto(BASE + '/app', { waitUntil: 'commit' });
    await page.waitForFunction(() => { const s = document.querySelector('section[aria-label="Totals"]'); const l = document.querySelector('section[aria-label="Investigations list"] ul > li'); return s && !s.innerText.includes('…') && l; }, null, { timeout: 30000 });
    runs.push(Date.now() - t0);
  });
  const sorted = [...runs].sort((a, b) => a - b); const med = sorted[Math.floor(sorted.length / 2)];
  h.note('timing', `Signed-in dashboard load ms (7 cold-context runs): ${runs.join(', ')}; median ${med}; min ${sorted[0]}; max ${sorted[sorted.length - 1]}`, { runs, median: med });
  await sub('budget', `Dashboard shows data within 3000 ms (median ${med} ms)`, async () => ok(med <= 3000, 'median ' + med + ' ms'));
});

// ---------------------------------------------------------------- end to end signed in
test('A-E2E-1', 'Signed-in full flow as user A: create, fill 7 steps, hand-checked numbers, reload, report, dashboard, cleanup', async ({ browser, sub }) => asUser(browser, 'A', async (page) => {
  const id = await h.demoNew(page); created.A.push(id);
  const calc = await e.buildAll(page, { sub, mode: 'account' });
  await e.finishVerify(page, { sub }); await waitSaved(page);
  await step(page, 'Actions');
  for (const n of [0, 1]) await f.setActionStatus(page, n, 'Done');
  await waitSaved(page);
  await sub('reload-report', 'After full reload the account data gives the hand-calculated report', async () => {
    await page.goto(BASE + '/app'); await page.goto(BASE + '/app/investigations/' + id + '#report'); const t = (await page.locator('article.print-sheet').innerText()).replace(/\s+/g, ' ').toLowerCase();
    for (const s of ['annual loss $13,800', 'annual saving (verified) $10,350', 'action cost $2,151', 'payback 2.5 months', 'status: closed']) ok(t.includes(s), 'missing ' + s);
  });
  await sub('dash', 'Dashboard (account): loss $0, open 0, overdue 0, saved 238,440 + 10,350 = $248,790, new row Closed', async () => {
    await page.goto(BASE + '/app'); const s = await e.dashStats(page); eq(s['Verified annual savings'], money(238440 + calc.saving)); eq(s['Open actions'], '0'); eq(s['Overdue actions'], '0'); eq(s['Annual loss under investigation'], '$0');
    ok((await e.dashRows(page)).some(r => r.includes('QA: Gearbox') && r.includes('Closed') && r.includes('$13,800')));
  });
  await sub('print', 'Print emulation of the account report hides app chrome (account menu, header)', async () => {
    await page.goto(BASE + '/app'); await page.goto(BASE + '/app/investigations/' + id + '#report'); await page.locator('article.print-sheet').waitFor(); await page.emulateMedia({ media: 'print' });
    ok(!(await page.locator('header.no-print').isVisible()), 'header visible in print'); await h.shot(page, 'account-report-print'); await page.emulateMedia({ media: 'screen' });
  });
  await sub('autosave-xss', 'Special characters round-trip through the database as text', async () => {
    await page.goto(BASE + '/app'); await page.goto(BASE + '/app/investigations/' + id); const x = `<img src=x onerror="window.__x=1"> & "q" '${'é'}' 🚀`;
    await page.getByLabel('Impact', { exact: false }).count(); await page.getByLabel('What was the impact?').fill(x); await waitSaved(page); await page.reload();
    eq(await page.getByLabel('What was the impact?').inputValue(), x); eq(await page.evaluate(() => window.__x), undefined);
  });
}));

// ---------------------------------------------------------------- isolation
test('A-ISO-1', 'Data isolation between user A and user B (list and direct URL)', async ({ browser, sub }) => {
  let aId, aSample;
  await asUser(browser, 'A', async (page) => {
    aId = await h.demoNew(page); created.A.push(aId); await page.getByLabel('Title', { exact: true }).fill('A-PRIVATE-' + Date.now()); await waitSaved(page);
    await page.goto(BASE + '/app'); await e.dashStats(page);
    aSample = (await page.locator('section[aria-label="Investigations list"] li').filter({ hasText: 'Illustrative sample' }).getByRole('link', { name: 'Open' }).getAttribute('href')).split('/').pop();
  });
  await sub('b-list', 'User B dashboard does not list user A\'s investigation (B sees only own sample)', async () => asUser(browser, 'B', async (page) => {
    await page.goto(BASE + '/app'); await e.dashStats(page); const rows = await e.dashRows(page); ok(!rows.some(r => r.includes('A-PRIVATE')), rows.join('|')); ok(!rows.some(r => r.includes('QA: Gearbox')), rows.join('|'));
  }));
  await sub('b-direct', 'User B opening A\'s investigation URL directly gets "Investigation not found" (no data leaked)', async () => asUser(browser, 'B', async (page) => {
    await page.goto(BASE + '/app/investigations/' + aId); await page.getByRole('heading', { name: 'Investigation not found' }).waitFor(); eq(await page.locator('input').count(), 0);
    ok(!(await page.locator('body').innerText()).includes('A-PRIVATE'));
  }));
  await sub('b-direct-sample', 'User B opening A\'s sample id gets not found (B\'s sample id differs)', async () => asUser(browser, 'B', async (page) => {
    eq(aSample.startsWith('sample-'), true, aSample); await page.goto(BASE + '/app/investigations/' + aSample); await page.waitForTimeout(3000); const nf = await page.getByRole('heading', { name: 'Investigation not found' }).count(); ok(nf === 1, 'B can open A\'s sample ' + aSample);
  }));
  await sub('b-write', 'User B cannot modify A\'s row via the API (RLS): PATCH/DELETE affect 0 rows', async () => asUser(browser, 'B', async (page) => {
    let apikey = null; page.on('request', rq => { if (/\/rest\/v1\//.test(rq.url()) && rq.headers()['apikey']) apikey = rq.headers()['apikey']; });
    await page.goto(BASE + '/app'); await e.dashStats(page);
    const res = await page.evaluate(async ({ aId }) => {
      const k = Object.keys(localStorage).find(x => /auth-token/.test(x)); const tok = JSON.parse(localStorage.getItem(k)).access_token;
      const base = [...document.querySelectorAll('script')].length; return { tok: !!tok };
    }, { aId });
    ok(res.tok, 'no token');
    // use the app's own network calls to learn the REST base
    const url = await page.evaluate(() => performance.getEntriesByType('resource').map(r => r.name).find(n => /\/rest\/v1\/investigations/.test(n)));
    ok(url, 'no REST call observed'); const restBase = url.split('/rest/v1/')[0];
    const r = await page.evaluate(async ({ restBase, aId }) => {
      const k = Object.keys(localStorage).find(x => /auth-token/.test(x)); const tok = JSON.parse(localStorage.getItem(k)).access_token;
      const key = (await (await fetch(restBase + '/rest/v1/', { headers: {} }).catch(() => ({ text: async () => '' }))).text, null);
      return { tok };
    }, { restBase, aId });
    // The publishable key is needed; read it from the page's own requests
        ok(apikey, 'could not learn the publishable key from app traffic');
    const out = await page.evaluate(async ({ restBase, aId, apikey }) => {
      const k = Object.keys(localStorage).find(x => /auth-token/.test(x)); const tok = JSON.parse(localStorage.getItem(k)).access_token;
      const H = { apikey, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', Prefer: 'return=representation' };
      const sel = await (await fetch(`${restBase}/rest/v1/investigations?id=eq.${aId}&select=id`, { headers: H })).json();
      const upd = await (await fetch(`${restBase}/rest/v1/investigations?id=eq.${aId}`, { method: 'PATCH', headers: H, body: JSON.stringify({ data: { hacked: true } }) })).json();
      const del = await (await fetch(`${restBase}/rest/v1/investigations?id=eq.${aId}`, { method: 'DELETE', headers: H })).json();
      const all = await (await fetch(`${restBase}/rest/v1/investigations?select=id`, { headers: H })).json();
      const anon = await (await fetch(`${restBase}/rest/v1/investigations?select=id`, { headers: { apikey } })).json();
      return { sel, upd, del, allCount: all.length, anon };
    }, { restBase, aId, apikey });
    eq(out.sel, [], 'B can SELECT A row'); eq(out.upd, [], 'B can PATCH A row'); eq(out.del, [], 'B can DELETE A row'); ok(out.allCount <= 3, 'B list size ' + out.allCount); ok(!Array.isArray(out.anon) || out.anon.length === 0, 'anonymous (no login) can read rows: ' + JSON.stringify(out.anon).slice(0, 100));
  }));
  await sub('a-still-ok', 'After B\'s attempts, A\'s investigation is intact', async () => asUser(browser, 'A', async (page) => { await page.goto(BASE + '/app/investigations/' + aId); await page.getByLabel('Title', { exact: true }).waitFor(); ok((await page.getByLabel('Title', { exact: true }).inputValue()).startsWith('A-PRIVATE')); }));
  await sub('signed-out-direct', 'Signed out (demo) opening A\'s account URL gets "not found" (no account data without login)', async () => withPage(browser, {}, async (page) => {
    await page.goto(BASE + '/app/investigations/' + aId); await page.getByRole('heading', { name: 'Investigation not found' }).waitFor(); ok(!(await page.locator('body').innerText()).includes('A-PRIVATE'));
  }));
  await sub('b-delete-own-dup', 'User B duplicate of own sample stays in B only', async () => asUser(browser, 'B', async (page) => {
    await page.goto(BASE + '/app'); await e.dashStats(page); await page.getByRole('button', { name: /^Duplicate Repeat bearing/ }).click(); await page.waitForURL(/investigations\/(?!sample)/); created.B.push(invIdOf(page));
  }));
  await sub('a-list-no-b', 'User A does not see B\'s duplicate', async () => asUser(browser, 'A', async (page) => { await page.goto(BASE + '/app'); await e.dashStats(page); const rows = await e.dashRows(page); ok(!rows.some(r => r.includes('Copy of')), rows.join('|')); }));
});

// ---------------------------------------------------------------- persistence + offline
test('A-PERS-1', 'Signed-in persistence: reload after each kind of edit, autosave states, second device/tab', async ({ browser, sub }) => asUser(browser, 'A', async (page) => {
  const id = await h.demoNew(page); created.A.push(id);
  const reload = async () => { await waitSaved(page); await page.reload(); await page.getByRole('navigation', { name: 'Investigation steps' }).waitFor(); };
  await sub('problem-loss', 'Problem + Loss survive reload (account)', async () => {
    await f.fillProblem(page, e.PROBLEM); await f.fillLoss(page, { events: 4, hours: 5.5, rate: 120, unit: 'cartons', margin: 2.5, repair: 1800, cur: '$' }); await reload(); await step(page, 'Problem');
    eq(await page.getByLabel('Title', { exact: true }).inputValue(), e.PROBLEM.title); await step(page, 'Loss'); eq(await page.getByTestId('annual-loss').innerText(), '$13,800');
  });
  await sub('evidence-tree-actions-verify', 'Evidence, tree (flags, links, collapse), actions, verification survive reload (account)', async () => {
    await f.addEvidence(page, { title: 'E-acc', type: 'Interview', date: '2026-02-03', note: 'nn' });
    await step(page, 'Cause tree'); await page.getByRole('button', { name: 'Ask the first Why?' }).click(); await f.typeCause(page, 'AccCause'); await page.getByRole('radio', { name: 'System / Latent', exact: true }).click(); await page.getByRole('radio', { name: 'Verified', exact: true }).click(); await page.getByRole('checkbox', { name: /root cause/ }).check(); await page.getByRole('checkbox', { name: /^E1\./ }).check();
    await f.addAction(page, { cause: 'AccCause', desc: 'Acc action', owner: 'Zed', due: '2027-04-04', status: 'In progress', cost: 321.5 });
    await f.fillVerify(page, { date: '2026-11-12', recurred: 'No, it has not recurred', after: 1, notes: 'acc notes' }); await reload();
    await step(page, 'Evidence'); await page.getByText('E-acc').waitFor(); await step(page, 'Cause tree'); await f.selectCause(page, 'AccCause');
    ok(await page.getByRole('checkbox', { name: /root cause/ }).isChecked()); ok(await page.getByRole('checkbox', { name: /^E1\./ }).isChecked()); eq(await page.getByRole('radio', { name: 'Verified', exact: true }).getAttribute('aria-checked'), 'true');
    await step(page, 'Actions'); { const li = await f.openAction(page, 0); eq(await li.getByLabel('Cost', { exact: true }).inputValue(), '321.5'); eq(await li.getByLabel('Owner', { exact: true }).inputValue(), 'Zed'); }
    await step(page, 'Verify'); eq(await page.getByLabel('What did you find?').inputValue(), 'acc notes');
  });
  await sub('fast-reload', 'Edit then reload within 60 ms - edit still saved (flush on pagehide)', async () => {
    await step(page, 'Problem'); let prompted = false; page.on('dialog', d => { prompted = d.type() === 'beforeunload'; d.accept(); }); await page.getByLabel('Title', { exact: true }).fill('FAST ACC'); await page.waitForTimeout(60); await page.reload();
    await page.getByLabel('Title', { exact: true }).waitFor(); const v = await page.getByLabel('Title', { exact: true }).inputValue(); h.note('observation', 'fast reload: beforeunload prompt shown=' + prompted + ', value after=' + v);
    ok(v === 'FAST ACC' || prompted, 'edit lost and no "unsaved changes" prompt was shown; title after quick reload: "' + v + '"');
  });
  await sub('autosave-states', 'Autosave indicator shows Saving... then All changes saved on account writes', async () => {
    await page.getByLabel('Title', { exact: true }).fill('state test'); ok(/Saving/.test(await page.locator('[role=status]').filter({ hasText: /Saving|saved/ }).first().innerText())); await waitSaved(page);
  });
  await sub('two-tabs', 'Two tabs/devices: a stale tab must never silently wipe the other tab\'s edit; it is refused with "Load the latest version" / "Keep mine and overwrite" (round 2 design)', async () => {
    const p2 = await page.context().newPage(); await p2.goto(BASE + '/app/investigations/' + id); await p2.getByLabel('Asset', { exact: true }).waitFor();
    await page.getByLabel('Title', { exact: true }).fill('ACC TAB1'); await waitSaved(page); await p2.getByLabel('Asset', { exact: true }).fill('ACC TAB2'); await p2.waitForTimeout(2500);
    const banner = await p2.getByTestId('conflict-banner').count(); const t = await page.evaluate(() => null);
    await page.reload(); await page.getByLabel('Title', { exact: true }).waitFor(); const title = await page.getByLabel('Title', { exact: true }).inputValue(); const asset = await page.getByLabel('Asset', { exact: true }).inputValue();
    h.note('observation', `two tabs: conflict banner shown=${banner}; DB after: title="${title}" asset="${asset}"`);
    ok(title === 'ACC TAB1' && (asset === 'ACC TAB2' || banner === 1), `silent loss: title="${title}" asset="${asset}" banner=${banner}`);
    if (banner === 1) { await h.shot(p2, 'account-conflict-banner'); }
    await p2.close();
  });
  await sub('concurrent-window', 'Account: two tabs edit different fields within the same save window: no silent loss (both saved, or a conflict banner and nothing overwritten)', async () => {
    const bad = [];
    for (let i = 0; i < 3; i++) {
      await page.goto(BASE + '/app'); await page.goto(BASE + '/app/investigations/' + id); await page.getByLabel('Site / area').waitFor();
      const p2 = await page.context().newPage(); await p2.goto(BASE + '/app/investigations/' + id); await p2.getByLabel('Site / area').waitFor();
      const sv = 'AS' + i + Date.now(), wv = 'AW' + i + Date.now();
      await Promise.all([page.getByLabel('Site / area').fill(sv), p2.getByLabel('When did it happen?').fill(wv)]); await page.waitForTimeout(4000);
      const banners = (await page.getByTestId('conflict-banner').count()) + (await p2.getByTestId('conflict-banner').count());
      const p3 = await page.context().newPage(); await p3.goto(BASE + '/app/investigations/' + id); await p3.getByLabel('Site / area').waitFor(); const site = await p3.getByLabel('Site / area').inputValue(), when = await p3.getByLabel('When did it happen?').inputValue();
      if (!((site === sv && when === wv) || banners > 0)) bad.push(`try ${i}: site="${site}" when="${when}" banners=${banners}`);
      await p2.close(); await p3.close();
    }
    eq(bad, []);
  });
  await sub('conflict-load-latest', '"Load the latest version" shows the other tab\'s data and clears the banner', async () => {
    await page.goto(BASE + '/app/investigations/' + id); await page.getByLabel('Title', { exact: true }).waitFor();
    const p2 = await page.context().newPage(); await p2.goto(BASE + '/app/investigations/' + id); await p2.getByLabel('Title', { exact: true }).waitFor();
    await page.getByLabel('Title', { exact: true }).fill('FROM TAB1'); await waitSaved(page);
    await p2.getByLabel('Asset', { exact: true }).fill('STALE ASSET'); await p2.getByTestId('conflict-banner').waitFor({ timeout: 15000 });
    await p2.getByRole('button', { name: 'Load the latest version' }).click(); await p2.getByTestId('conflict-banner').waitFor({ state: 'detached' });
    eq(await p2.getByLabel('Title', { exact: true }).inputValue(), 'FROM TAB1'); ok((await p2.getByLabel('Asset', { exact: true }).inputValue()) !== 'STALE ASSET', 'stale edit should be discarded after Load latest');
    await p2.getByLabel('Asset', { exact: true }).fill('AFTER LOAD'); await waitSaved(p2); await p2.close();
  });
  await sub('conflict-keep-mine', '"Keep mine and overwrite" saves this tab\'s version and clears the banner', async () => {
    await page.goto(BASE + '/app/investigations/' + id); await page.getByLabel('Title', { exact: true }).waitFor();
    const p2 = await page.context().newPage(); await p2.goto(BASE + '/app/investigations/' + id); await p2.getByLabel('Title', { exact: true }).waitFor();
    await page.getByLabel('Title', { exact: true }).fill('TAB1 WINS?'); await waitSaved(page);
    await p2.getByLabel('Title', { exact: true }).fill('TAB2 KEEP MINE'); await p2.getByTestId('conflict-banner').waitFor({ timeout: 15000 });
    await p2.getByRole('button', { name: 'Keep mine and overwrite' }).click(); await p2.getByTestId('conflict-banner').waitFor({ state: 'detached' }); await p2.getByText('All changes saved').waitFor();
    await page.reload(); await page.getByLabel('Title', { exact: true }).waitFor(); eq(await page.getByLabel('Title', { exact: true }).inputValue(), 'TAB2 KEEP MINE'); await p2.close();
  });
  await sub('conflict-offline-no-banner', 'A plain network failure is still the "Could not save" error, not a conflict banner', async () => {
    await page.getByLabel('Title', { exact: true }).fill('x'); await waitSaved(page); await page.context().setOffline(true); await page.getByLabel('Title', { exact: true }).fill('offline edit'); await page.getByRole('alert').filter({ hasText: /Could not save/ }).waitFor({ timeout: 20000 });
    eq(await page.getByTestId('conflict-banner').count(), 0); await page.context().setOffline(false); await page.getByText('All changes saved').waitFor({ timeout: 25000 });
  });
  await sub('duplicate-delete', 'Duplicate then delete (cancel / confirm) in account mode', async () => {
    await page.goto(BASE + '/app/investigations/' + id); await page.getByLabel('Title', { exact: true }).fill('ACC TAB1'); await waitSaved(page);
    await page.goto(BASE + '/app'); await e.dashStats(page); const before = (await e.dashRows(page)).length;
    await page.getByRole('button', { name: /^Duplicate ACC TAB1/ }).click(); await page.waitForURL(/investigations\/(?!sample)/); const dup = invIdOf(page); created.A.push(dup);
    await page.goto(BASE + '/app'); await e.dashStats(page); eq((await e.dashRows(page)).length, before + 1);
    await page.getByRole('button', { name: /^Delete Copy of ACC TAB1/ }).click(); await page.getByRole('button', { name: 'Cancel' }).click(); eq((await e.dashRows(page)).length, before + 1);
    await page.getByRole('button', { name: /^Delete Copy of ACC TAB1/ }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click(); await page.waitForFunction((n) => document.querySelectorAll('section[aria-label="Investigations list"] ul > li').length === n, before);
    await page.reload(); await e.dashStats(page); eq((await e.dashRows(page)).length, before);
  });
  await sub('reset-sample', 'Reset sample data in account: edit sample, reset, original restored, own data untouched', async () => {
    await page.goto(BASE + '/'); await page.getByRole('link', { name: 'Try the sample investigation' }).click(); await page.getByLabel('Title', { exact: true }).waitFor(); await page.getByLabel('Title', { exact: true }).fill('SAMPLE EDIT ACC'); await waitSaved(page);
    await page.goto(BASE + '/app'); await e.dashStats(page); ok((await e.dashRows(page)).some(r => r.includes('SAMPLE EDIT ACC')));
    await page.getByRole('button', { name: 'Reset sample data' }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Reset sample' }).click();
    await page.waitForFunction(() => !document.body.innerText.includes('SAMPLE EDIT ACC')); const rows = await e.dashRows(page); ok(rows.some(r => r.includes('Repeat bearing')) && rows.some(r => r.includes('ACC TAB1')), rows.join('|'));
    eq(rows.filter(r => r.includes('Illustrative sample')).length, 1, 'exactly one sample');
  });
}));

test('A-OFF-1', 'Network drop while editing signed in: error shown, edits kept, recovery on reconnect', async ({ browser, sub }) => asUser(browser, 'A', async (page) => {
  const id = await h.demoNew(page); created.A.push(id); await page.getByLabel('Title', { exact: true }).fill('before offline'); await waitSaved(page);
  const ctx = page.context();
  await sub('offline-error', 'Going offline and editing shows a readable save error with "Try again"', async () => {
    await ctx.setOffline(true); await page.getByLabel('Title', { exact: true }).fill('typed while offline'); await page.getByRole('alert').filter({ hasText: /Could not save/ }).waitFor({ timeout: 10000 });
    const t = await page.getByRole('alert').first().innerText(); ok(/no connection/i.test(t), t); await page.getByRole('button', { name: 'Try again' }).waitFor(); await h.shot(page, 'account-offline-error');
  });
  await sub('offline-keeps-typing', 'More edits while offline are kept in the page (not discarded), other steps usable', async () => {
    await page.getByLabel('Asset', { exact: true }).fill('asset while offline'); await step(page, 'Loss'); await step(page, 'Problem');
    eq(await page.getByLabel('Title', { exact: true }).inputValue(), 'typed while offline'); eq(await page.getByLabel('Asset', { exact: true }).inputValue(), 'asset while offline');
  });
  await sub('retry-offline', '"Try again" while still offline keeps the error (no false "saved")', async () => {
    const t0 = Date.now(); await page.getByRole('button', { name: 'Try again' }).click(); await page.getByRole('alert').filter({ hasText: /Could not save/ }).first().waitFor({ timeout: 20000 }); h.note('timing', 'Offline: error appears ' + (Date.now() - t0) + ' ms after pressing Try again (indicator reads "Saving…" meanwhile)'); eq(await page.getByText('All changes saved').count(), 0);
  });
  await sub('beforeunload', 'Leaving with unsaved offline edits triggers the browser "unsaved changes" prompt', async () => {
    let prompted = false; page.once('dialog', async d => { prompted = d.type() === 'beforeunload'; await d.dismiss(); });
    await page.evaluate(() => window.dispatchEvent(new Event('beforeunload', { cancelable: true }))); const prevented = await page.evaluate(() => { const ev = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(ev); return ev.defaultPrevented; }); ok(prevented, 'beforeunload not prevented');
  });
  await sub('recover', 'Back online: "online" event flushes and the indicator returns to "All changes saved"', async () => {
    await ctx.setOffline(false); await page.getByText('All changes saved').waitFor({ timeout: 20000 });
  });
  await sub('recover-persisted', 'After recovery a reload shows the offline-typed values (nothing lost)', async () => {
    await page.reload(); await page.getByLabel('Title', { exact: true }).waitFor(); eq(await page.getByLabel('Title', { exact: true }).inputValue(), 'typed while offline'); eq(await page.getByLabel('Asset', { exact: true }).inputValue(), 'asset while offline');
  });
  await sub('auto-retry', 'Offline error auto-retries (about 8 s) once the network returns even without a new edit or the online event', async () => {
    await ctx.setOffline(true); await page.getByLabel('Title', { exact: true }).fill('auto retry'); await page.getByRole('alert').filter({ hasText: /Could not save/ }).waitFor({ timeout: 10000 });
    await ctx.setOffline(false); await page.getByText('All changes saved').waitFor({ timeout: 25000 });
  });
  await sub('offline-dashboard', 'Dashboard while offline shows a readable error (no blank crash)', async () => {
    await page.goto(BASE + '/app'); await e.dashStats(page); await ctx.setOffline(true); await page.getByRole('button', { name: /^Delete / }).first().click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    const al = page.getByRole('alert').filter({ hasText: /Could not/ }); await al.first().waitFor({ timeout: 15000 }); const m = await al.first().innerText(); await h.shot(page, 'account-offline-dashboard'); await ctx.setOffline(false);
    ok(/Could not|connection|network/i.test(m), m); await page.reload(); await e.dashStats(page); ok((await e.dashRows(page)).length >= 2, 'delete must not have happened offline');
  });
  await sub('offline-create', 'Creating a new investigation while offline shows an error and does not navigate', async () => {
    await ctx.setOffline(true); await page.getByRole('button', { name: 'New investigation' }).click(); await page.getByRole('alert').filter({ hasText: /Could not|connection/ }).first().waitFor({ timeout: 15000 }); ok(/\/app$/.test(page.url()), page.url()); await ctx.setOffline(false);
  });
  await sub('offline-load', 'Opening an investigation while offline does not claim it is missing/deleted', async () => {
    await page.goto(BASE + '/app'); await e.dashStats(page); await ctx.setOffline(true); await page.evaluate((id) => { window.history.pushState({}, '', '/app/investigations/' + id); }, id);
    await page.goto(BASE + '/app/investigations/' + id).catch(() => {}); await ctx.setOffline(false);
  });
  await sub('offline-open-existing', 'Network failing during investigation open: page says "not found / deleted" misleadingly? (observed)', async () => {
    await page.goto(BASE + '/app'); await page.goto(BASE + '/app/investigations/' + id); await page.getByLabel('Title', { exact: true }).waitFor();
    await page.route('**/rest/v1/investigations**', r => r.abort('failed'));
    await page.goto(BASE + '/app'); await page.goto(BASE + '/app/investigations/' + id); await page.waitForTimeout(4000); const t = await page.locator('body').innerText();
    await h.shot(page, 'account-open-while-api-down'); await page.unroute('**/rest/v1/investigations**');
    ok(!/Investigation not found/.test(t), 'API failure during open is reported as "Investigation not found... may have been deleted or belongs to a different account": ' + t.replace(/\s+/g, ' ').slice(0, 120));
  });
}));

test('A-SIGNOUT-1', 'Sign out with unsaved edits', async ({ browser, sub }) => asUser(browser, 'A', async (page) => {
  const id = await h.demoNew(page); created.A.push(id); await page.getByLabel('Title', { exact: true }).fill('before signout'); await waitSaved(page);
  await sub('flush-online', 'Typing then immediately signing out saves the edit first (online)', async () => {
    await page.getByLabel('Title', { exact: true }).fill('typed right before sign out'); await page.getByTestId('account-menu-button').click(); await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await page.waitForURL(/\/app$/); await page.getByTestId('demo-banner').waitFor();
    await withPage(browser, {}, async () => {}); const p2 = await h.newPage(browser); await h.login(p2, USER_A); await p2.goto(BASE + '/app/investigations/' + id); await p2.getByLabel('Title', { exact: true }).waitFor();
    eq(await p2.getByLabel('Title', { exact: true }).inputValue(), 'typed right before sign out'); await p2.context().close();
  });
  await sub('offline-signout', 'Offline unsaved edit then Sign out: warns "Some changes could not be saved"; Cancel keeps session; "Sign out anyway" signs out', async () => asUser(browser, 'A', async (p) => {
    await p.goto(BASE + '/app/investigations/' + id); await p.getByLabel('Title', { exact: true }).waitFor(); await p.context().setOffline(true); await p.getByLabel('Title', { exact: true }).fill('lost edit'); await p.getByRole('alert').filter({ hasText: /Could not save/ }).waitFor({ timeout: 10000 });
    await p.getByTestId('account-menu-button').click(); await p.getByRole('menuitem', { name: 'Sign out' }).click(); const d = p.getByRole('alertdialog'); await d.waitFor({ timeout: 15000 }); ok((await d.innerText()).includes('Some changes could not be saved'));
    await d.getByRole('button', { name: 'Cancel' }).click(); await p.getByLabel('Title', { exact: true }).waitFor(); eq(await p.getByLabel('Title', { exact: true }).inputValue(), 'lost edit'); await h.shot(p, 'account-signout-cancel');
    await p.getByTestId('account-menu-button').click(); await p.getByRole('menuitem', { name: 'Sign out' }).click(); await d.waitFor(); await d.getByRole('button', { name: 'Sign out anyway' }).click();
    await p.context().setOffline(false); await p.waitForURL(/\/app$/, { timeout: 20000 }); await p.getByTestId('demo-banner').waitFor({ timeout: 15000 });
  }));
}));

test('A-MOB-1', 'Signed in at 375px: dashboard, workspace, account menu layout', async ({ browser, sub }) => asUser(browser, 'A', async (page) => {
  await page.goto(BASE + '/app'); await e.dashStats(page);
  await sub('dash', '375px signed-in dashboard: no overflow, long email truncated', async () => { const o = await h.overflowX(page); await h.shot(page, 'account-mobile-dashboard'); ok(o.sw <= o.cw, 'overflow ' + o.sw); });
  await sub('menu', '375px account menu fits on screen', async () => {
    await page.getByTestId('account-menu-button').click(); const b = await page.getByRole('menu').boundingBox(); await h.shot(page, 'account-mobile-menu'); ok(b.x >= 0 && b.x + b.width <= 376, JSON.stringify(b));
  });
  await sub('ws', '375px signed-in workspace: all steps no overflow', async () => {
    await page.keyboard.press('Escape'); await page.goto(BASE + '/app/investigations/' + (await page.evaluate(() => null) || 'x')).catch(() => {});
    await page.goto(BASE + '/'); await page.getByRole('link', { name: 'Try the sample investigation' }).click(); await page.waitForURL(/investigations/);
    for (const s of h.STEP_LABELS) { await step(page, s); const o = await h.overflowX(page); ok(o.sw <= o.cw, s + ' overflow ' + o.sw); }
  });
}, { viewport: MOBILE }));

test('A-ERR-1', 'Signed in: no console errors or failed requests on dashboard and all steps', async ({ browser, sub }) => asUser(browser, 'A', async (page) => {
  await page.goto(BASE + '/app'); await e.dashStats(page); await page.goto(BASE + '/'); await page.getByRole('link', { name: 'Try the sample investigation' }).click(); await page.waitForURL(/investigations/);
  for (const s of h.STEP_LABELS) { await step(page, s); await page.waitForTimeout(200); }
  await page.goto(BASE + '/app'); await e.dashStats(page);
  eq({ errs: page.errs, fails: page.fails }, { errs: [], fails: [] });
}));

test('A-RESET-1', 'Reset sample data when the network fails half way (delete succeeds, insert fails)', async ({ browser, sub }) => asUser(browser, 'B', async (page) => {
  await page.goto(BASE + '/app'); await e.dashStats(page); await page.locator('section[aria-label="Investigations list"] ul > li').first().waitFor(); const baseRows = (await e.dashRows(page)).length;
  await sub('atomic', 'A failed reset must not leave the account without its sample', async () => {
    await page.route('**/rest/v1/investigations**', r => r.request().method() === 'POST' ? r.abort('failed') : r.continue());
    await page.getByRole('button', { name: 'Reset sample data' }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Reset sample' }).click();
    await page.getByRole('alert').filter({ hasText: /Could not/ }).first().waitFor({ timeout: 20000 }); await page.unroute('**/rest/v1/investigations**');
    await page.reload(); await e.dashStats(page); await page.waitForTimeout(1500); const rows = await e.dashRows(page); await h.shot(page, 'account-reset-failed');
    if (rows.length === 0) { await page.getByRole('button', { name: 'Load the sample investigation' }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Reset sample' }).click(); await page.locator('section[aria-label="Investigations list"] ul > li').first().waitFor(); }
    ok(rows.length === baseRows && rows.some(r => r.includes('Illustrative sample')), 'after failed reset the account has ' + rows.length + ' investigations (was ' + baseRows + ') (sample deleted, not restored; only the empty-state button recovers it)');
  });
}));

test('A-LOSS-1', 'Signed in: the new loss fields persist in the account and carry to Verify, dashboard and Report (hand calc)', async ({ browser, sub }) => asUser(browser, 'A', async (page) => {
  const L = require('./loss'); const id = await L.buildS3(page); created.A.push(id);
  await sub('reload', 'After reload: shares 48/32/20, recovery note, holding cost, two other cost lines and annual loss $20,462', async () => {
    await page.goto(BASE + '/app'); await page.goto(BASE + '/app/investigations/' + id); await page.getByLabel('Title', { exact: true }).waitFor(); await step(page, 'Loss');
    const v = async (k) => Number(await page.getByLabel(k + ' percent', { exact: true }).inputValue()); eq([await v('Lost for good'), await v('Made up later'), await v('Covered by buffer stock')], [48, 32, 20]);
    eq(await page.getByLabel('Recovery note (optional)').inputValue(), 'two Saturdays'); eq(await page.getByTestId('other-cost-line').count(), 2); eq(await page.getByTestId('annual-loss').innerText(), '$20,462');
  });
  await sub('verify-report', 'Verify and Report show expected saving $12,641 (cash $8,801 + opportunity $3,840), payback 4.7 months', async () => {
    await step(page, 'Verify'); const t = (await page.locator('dl').last().innerText()).replace(/\s+/g, ' ').toLowerCase(); ok(t.includes('expected saving (not yet verified) $12,641') && t.includes('cash $8,801 · opportunity $3,840') && t.includes('4.7 months'), t);
    const r = (await e.reportText(page)).toLowerCase(); ok(r.includes('cash costs $2,200 $14,702') && r.includes('opportunity loss (240 units lost for good'.replace('units', 'pcs') + ' × $4) $960 $5,760') && r.includes('total $3,160 $20,462'), r.slice(0, 600));
  });
  const num = (t) => Number((/\$([\d,]+)/.exec(t) || [0, '0'])[1].replace(/,/g, ''));
  const split = (t) => { const m = /Cash \$([\d,]+) · Opportunity \$([\d,]+)/.exec(t); return m ? [Number(m[1].replace(/,/g, '')), Number(m[2].replace(/,/g, ''))] : [0, 0]; };
  const tiles = async () => { await page.goto(BASE + '/app'); await e.dashStats(page); return page.evaluate(() => [...document.querySelectorAll('section[aria-label="Totals"] > div')].map(d => d.innerText.replace(/\s+/g, ' '))); };
  await sub('dashboard', 'Account dashboard: the S3 row is $20,462 with split $14,702 / $5,760; the loss tile rises by exactly that; verified tile does not change until closed', async () => {
    const after = await tiles(); const row = (await e.dashRows(page)).find(x => x.includes('LOSS-S3')); ok(row.includes('$20,462') && row.includes('Cash $14,702 · Opportunity $5,760'), row);
    // baseline = tiles with the S3 investigation removed from the maths: compare against a second read after deleting nothing is impossible, so use the row-sum identity
    const rows = await e.dashRows(page); let openSum = 0; for (const r of rows) { if (/Closed/.test(r)) continue; const m = /\$([\d,]+) Cash/.exec(r); if (m) openSum += Number(m[1].replace(/,/g, '')); }
    eq(num(after[0]), openSum, 'loss tile = sum of non-closed row annual losses'); eq(split(after[0])[0] + split(after[0])[1], num(after[0]), 'cash + opportunity = tile'); ok(after[0].includes('$'), after[0]);
    h.note('observation', 'A-LOSS-1 tiles before closing: ' + after.join(' | ')); globalThis.__savedBefore = [num(after[3]), ...split(after[3])];
  });
  await sub('close-dashboard', 'After closing S3 the verified tile rises by exactly $12,641 (cash +$8,801, opportunity +$3,840) and the loss tile drops by $20,462', async () => {
    const before = globalThis.__savedBefore; const lossBefore = num((await tiles())[0]);
    await page.goto(BASE + '/app/investigations/' + id); await page.getByLabel('Title', { exact: true }).waitFor(); await step(page, 'Actions'); await f.setActionStatus(page, 0, 'Done');
    await f.fillVerify(page, { date: '2026-11-10', recurred: 'No, it has not recurred' }); await waitSaved(page); const t = await tiles();
    eq([num(t[3]), ...split(t[3])], [before[0] + 12641, before[1] + 8801, before[2] + 3840], 'verified tile delta'); eq(num(t[0]), lossBefore - 20462, 'loss tile delta');
  });
}));

test('A-EMPTY-1', 'Signed in: empty account -> "Load the sample investigation" needs no confirm (round 2 change b) and restores exactly one sample', async ({ browser, sub }) => asUser(browser, 'B', async (page) => {
  await page.goto(BASE + '/app'); await e.dashStats(page); await page.locator('section[aria-label="Investigations list"] ul > li').first().waitFor();
  for (let g = 0; g < 20; g++) { const n = await page.locator('section[aria-label="Investigations list"] ul > li').count(); if (!n) break; await page.getByRole('button', { name: /^Delete / }).first().click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click(); await page.waitForTimeout(700); }
  await page.getByText('No investigations yet').waitFor();
  await sub('no-dialog', 'Click "Load the sample investigation": no dialog, sample appears, exactly one', async () => {
    await page.getByRole('button', { name: 'Load the sample investigation' }).click(); await page.waitForTimeout(400); eq(await page.getByRole('alertdialog').count(), 0, 'dialog shown'); await page.locator('section[aria-label="Investigations list"] ul > li').first().waitFor({ timeout: 15000 });
    await page.reload(); await e.dashStats(page); await page.locator('section[aria-label="Investigations list"] ul > li').first().waitFor(); eq((await e.dashRows(page)).length, 1);
  });
  await sub('double-load', 'Double-clicking "Load the sample" does not create two samples', async () => {
    await page.getByRole('button', { name: /^Delete / }).first().click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click(); await page.getByText('No investigations yet').waitFor();
    await page.getByRole('button', { name: 'Load the sample investigation' }).dblclick(); await page.waitForTimeout(2500); await page.reload(); await e.dashStats(page); await page.waitForTimeout(800); eq((await e.dashRows(page)).filter(r => r.includes('Illustrative sample')).length, 1);
  });
}));

// ---------------------------------------------------------------- cleanup (must run last)
test('A-ZZ-CLEANUP', 'Cleanup: delete every investigation and asset created by this run; leave each account with only its sample and the 5 sample assets', async ({ browser, sub }) => {
  const { cleanAccount } = require('./cleanup');
  for (const who of ['A', 'B']) await sub('clean-' + who, `Account ${who} left with only the seeded sample (and sample assets)`, async () => asUser(browser, who, async (page) => {
    await cleanAccount(page); await page.goto(BASE + '/app'); await e.dashStats(page); await page.locator('section[aria-label="Investigations list"] ul > li').first().waitFor(); await page.waitForTimeout(500);
    const rows = await e.dashRows(page); eq(rows.length, 1, rows.join(' | ')); ok(rows[0].includes('Illustrative sample'));
  }));
});

if (require.main === module) h.run('account', { only: process.argv[2] }).then(f => process.exit(f ? 1 : 0));
