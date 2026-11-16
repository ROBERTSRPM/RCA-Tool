// Regenerates test-plan.md from results/*.json (+ the hand-written inventory below)
const fs = require('fs');
const loadFrom = (dir) => (n) => { try { return JSON.parse(fs.readFileSync(__dirname + '/results/' + dir + '/' + n + '.json')); } catch { return { results: [], notes: [] }; } };
const sets = {};
for (const dir of ['local', 'live']) { const L = loadFrom(dir); const parts = ['demo', 'loss', 'account'].map(L); const rows = parts.flatMap(p => p.results); const leaf = rows.filter(r => !rows.some(o => o.id.startsWith(r.id + '.'))); sets[dir] = { parts, rows, leaf, pass: leaf.filter(r => r.status === 'pass').length, notes: parts.flatMap(p => p.notes), base: parts[0].base }; }
const L0 = sets.local, L1 = sets.live;
const demo = { base: L0.base, notes: L0.notes }, acc = { notes: L0.notes };
const leaf = L0.leaf, pass = L0.pass;
const liveIds = new Map(L1.leaf.map(r => [r.id, r]));
let md = `# Test plan and results

Run against \`${demo.base}\` (production build, port 3555). Desktop 1440x900 and mobile 375x812. Demo mode and signed in (accounts A and B).
**Round 2.** Local production build (${L0.base}): **${L0.leaf.length} checks, ${L0.pass} passed, ${L0.leaf.length - L0.pass} failed.** Live site (${L1.base}): **${L1.leaf.length} checks, ${L1.pass} passed, ${L1.leaf.length - L1.pass} failed.** (leaf checks; parent groups not counted twice). Failures map to defects in defects.md. Live note: D-EDGE-NAV.weird-ids failed live only because the hosting platform answers a ../ path with HTTP 403 (the test now accepts 403 as a valid rejection; re-run live: pass). Round 1 (old build) was 263 checks, 241 passed, 22 failed (kept in round1/).

## 1. Control inventory
Every interactive control found by \`inventory.js\` (raw lists in results/inventory.json). "Result" = outcome of the exercising test.

| Page / step | Control | Exercised by | Result |
|---|---|---|---|
| Landing | Logo link, Open the app, Sign in, Create account, Open the sample investigation, Start a new investigation | D-LAND-1 | pass |
| Landing | footer text | D-LAND-1.footer | pass (round 2) |
| /login | Email, Password, Sign in, Forgot your password?, Create a free account, Try the demo, logo | A-AUTH-1 | pass |
| /login | "Send the confirmation email again" (only after unconfirmed-email error) | NOT TESTED: needs an unconfirmed account; no account may be created | n/a |
| /signup | Email, Password, Confirm password, Create account (invalid input only), Sign in, Try the demo | A-AUTH-1 | pass (valid submit NOT TESTED by rule) |
| /forgot-password | Email, Send reset link (validation only), Back to sign in | A-AUTH-1 | pass (real submit NOT TESTED: would email a fake address) |
| /reset-password | invalid-link state, Request a new link; New password form | A-AUTH-1 reset-no-token / reset-bad-token | pass (password form NOT TESTED: needs a real email link) |
| /app dashboard | Reset sample data, New investigation, Open, Duplicate, Delete, confirm dialog (Cancel/Delete/Escape/backdrop), Load the sample investigation, empty state | D-DASH-2, A-PERS-1, A-ISO-1 | pass |
| /app dashboard | 4 totals tiles, row figures, status badges | D-DASH-1, D-E2E-1, A-E2E-1 | pass |
| Header | Logo, Investigations, Home, Sign in, Create account, account menu (My investigations, Sign out) | D-LAND-1, A-SESS-1, A-SIGNOUT-1 | pass |
| Demo banner | Create a free account, Sign in links | A-AUTH-1.signed-out-app | pass |
| Import offer banner (Copy to my account / No thanks) | NOT TESTED: appears only for an account with browser demo data on first sign-in and stores a one-time flag; the pre-existing accounts have been used before | n/a |
| Workspace | All investigations link, 7 stepper buttons, Back/Next buttons, save indicator, Try again, Quality panel toggle + every Go to link, conflict banner (Load the latest version / Keep mine and overwrite) | D-E2E-1, D-QC-1, A-OFF-1, A-PERS-1 | pass |
| 1 Problem | Title, Asset, Site/area, Date of event, What happened?, Where, When, Impact | D-E2E-1.problem, D-PERS-1.problem, D-EDGE-DATE | pass |
| 2 Loss | Events/yr, Downtime, Production rate, Unit name, Margin, Repair cost, Currency + live calc | D-E2E-1.loss-calc, D-EDGE-NUM | pass |
| 2 Loss (new) | 3 share percent fields, 3 sliders, share bar, Recovery cost, Recovery note, Buffer holding cost, Add a cost, per-line Category / Description / Amount / Remove, cash vs opportunity panel | LOSS-1..7 (desktop and 375px), A-LOSS-1 | pass |
| 3 Evidence | Add evidence (both), Edit/Done, Delete (+confirm), Title, Type (6 options), Date, Note, Upload photo, Replace/Remove photo | D-E2E-1, D-EDGE-EVID | pass |
| 4 Cause tree | Tabs Tree/5 Whys/Fishbone, Expand all, Collapse all, Ask the first Why?, box select, text box, toolbar Why?/Sibling/Move up/Move down/Collapse/Expand/Delete/Details, +N hidden chip, category radios (3), status radios (3), root-cause checkbox, evidence checkboxes, Go to Evidence | D-TREE-1, D-TREE-2, D-E2E-1, D-QC-1 | pass |
| 5 Whys view | chain boxes, sibling chips, Dig-deeper buttons, Add another Why | D-TREE-2.whys, whys-add | pass |
| Fishbone view | 3 columns, node cards | D-TREE-2.fish, fish-sum | pass |
| 5 Actions | Add action (both), Fixes this root cause / Re-link to a root cause (Not linked group), What will be done?, Owner, Due date, Status, Cost, Delete (+confirm), per-root Add action, Go to the cause tree | D-E2E-1, D-PERS-1, D-EDGE-ACT | pass |
| 6 Verify | Review date, Has it recurred?, Events after, Findings, Reopen the cause tree | D-E2E-1, D-EDGE-NUM, D-QC-1.recurred | pass |
| 7 Report | Print / Save as PDF button (window.print: verified through print media emulation and page.pdf, the native dialog itself NOT TESTED) | D-E2E-1.print | pass |

## 2. Scope cases
| Area | Tests |
|---|---|
| End-to-end with hand calculations | D-E2E-1, D-MOB-E2E, A-E2E-1 |
| Cause tree operations / views | D-TREE-1, D-TREE-2 |
| Quality check, each rule | D-QC-1 (10 rules, jump links, clearing) |
| Persistence, autosave, offline | D-PERS-1, A-PERS-1, A-OFF-1, D-EDGE-STORE |
| Auth, sign out, isolation | A-AUTH-1, A-SESS-1, A-SIGNOUT-1, A-ISO-1 |
| Edge cases | D-EDGE-NUM, -TEXT, -DATE, -NAV, -ACT, -EVID, -STORE |
| Report / print | D-E2E-1.report, .print, A-E2E-1.print |
| Console, a11y, layout | D-ERR-1, A-ERR-1, D-A11Y-1, D-MOB-1, A-MOB-1 |
| Dashboard load time | A-PERF-1 (median ${(() => { const n = acc.notes.find(x => /dashboard load/.test(x.text)); return n && n.data ? n.data.median : '?'; })()} ms) |

## 3. Results (all checks)
| ID | Check | Local | Live | Detail (local) |
|---|---|---|---|---|
`;
for (const r of leaf) { const lv = liveIds.get(r.id); md += `| ${r.id} | ${r.title.replace(/\|/g, '/')} | ${r.status === 'pass' ? 'pass' : '**FAIL**'} | ${lv ? (lv.status === 'pass' ? 'pass' : '**FAIL**') : 'n/a'} | ${(r.detail || '').replace(/\|/g, '/').slice(0, 140)} |\n`; }
md += `\n## 4. Observations recorded during the run (local)\n` + L0.notes.map(n => `- (${n.kind}) ${n.text}`).join('\n') + '\n\n## 5. Observations recorded during the run (live)\n' + L1.notes.map(n => `- (${n.kind}) ${n.text}`).join('\n') + '\n';
fs.writeFileSync(__dirname + '/test-plan.md', md);
console.log('written', leaf.length, pass);
