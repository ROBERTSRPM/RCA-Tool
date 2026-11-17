# Test plan and results

Run against `http://localhost:3555` (production build, port 3555). Desktop 1440x900 and mobile 375x812. Demo mode and signed in (accounts A and B).
**Round 3 (this build, local production build only).** Local production build (http://localhost:3555): **668 checks, 661 passed, 7 failed.** Round 2 live-site run for comparison (https://rca-tool-omega.vercel.app, old build): 375 checks, 373 passed, 2 failed. (leaf checks; parent groups not counted twice). Failures map to defects in defects.md. Live note: D-EDGE-NAV.weird-ids failed live only because the hosting platform answers a ../ path with HTTP 403 (the test now accepts 403 as a valid rejection; re-run live: pass). Round 1 (old build) was 263 checks, 241 passed, 22 failed (kept in round1/).

## 1. Control inventory
Every interactive control found by `inventory.js` (raw lists in results/inventory.json). "Result" = outcome of the exercising test.

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
| 1 Problem (new) | Asset tag, Asset type (combo), Make and model, Duty or service, Criticality A/B/C (tap again clears), Failure mode (combo), register status text, links to the register | F-ASSET-1 | pass |
| Problem / Cause tree (new) | Similar past failures panel: Open, Copy this cause into my tree (arrives as Hypothesis), Open the cause tree | F-SIM-1 | pass |
| /app/assets (new) | Paste a list, Add asset (form: tag, type, make, duty, site, notes, criticality, Add/Cancel), Search assets, per-row Edit (Save changes/Cancel), Delete (+confirm), per-asset stats, paste Add N assets / Close | F-REG-1, F-REG-2 | pass |
| /app/account (new) | Download my data, Change password form, Delete my account (typed confirmation, NOT executed), Clear browser data (demo), account menu link | F-ACCT-1 | pass |
| 4 Cause tree (new) | Type of wear: Natural / Forced deterioration | F-DET-1 | pass |
| 5 Actions (new) | Add corrective action, Add preventive action (per root cause), compact row expand/Close/Delete, Corrective or preventive?, Category (8), task fields (description, Do this every, Interval unit, Craft or trade, New task or change), Re-link, Maintenance plan changes + Copy for the planner, Spares check (needed, in stock, lead time, coverage, Add a spares holding action) | F-CAPA-1, F-PLAN-1, F-SPARES-1, F-QUAL-1 | pass |
| 6 Verify (new) | Roll this fix out: candidate tick boxes, What to check, Create N rollout checks, per-check What/Who/Due/Result/Delete, Go to Asset details, Add a similar asset | F-ROLL-1 | pass |
| 7 Report (new) | Maintenance plan changes, Spares check, Rollout to similar assets sections | F-PLAN-1, F-SPARES-1, F-ROLL-1 | pass |
| Dashboard (new) | Rollout checks tile (open / created / same problem), unreadable-row Delete | F-ROLL-1, F-SEC-2 | pass |
| Security (new) | CSP + 4 other headers on every route, image allowlist, malformed rows, password rule, global sign-out, next-redirect | F-SEC-1..3, F-ACCT-1, A-AUTH-1 | see defects |
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
| Dashboard load time | A-PERF-1 (median 1063 ms) |

## 3. Results (all checks)
| ID | Check | Round 3 local | Round 2 live (old build) | Detail |
|---|---|---|---|---|
| D-LAND-1.hdr | Landing shows headline, 3 benefit cards, video placeholder | pass | pass |  |
| D-LAND-1.logo | Logo link goes to the landing page / app | pass | pass |  |
| D-LAND-1.open-app | "Open the app" -> /app | pass | pass |  |
| D-LAND-1.signin | "Sign in" header link -> /login | pass | pass |  |
| D-LAND-1.create-acct | "Create account" header link -> /signup | pass | pass |  |
| D-LAND-1.sample | "Open the sample investigation" opens the sample workspace | pass | pass |  |
| D-LAND-1.start-new | "Start a new investigation" creates one and opens it | pass | pass |  |
| D-LAND-1.footer | Footer copy is accurate now that accounts exist | pass | pass |  |
| D-DASH-1.totals | Totals: loss under investigation $0 (sample is closed), 0 open, 0 overdue, saved $238,440 (round 3 sample) | pass | pass |  |
| D-DASH-1.row | Sample row shows $238,440, Closed, sample chip | pass | pass |  |
| D-DASH-2.dup | Duplicate creates "Copy of ..." and opens it | pass | pass |  |
| D-DASH-2.dup-numbers | Duplicate keeps the money identical (both rows $238,440) | pass | pass |  |
| D-DASH-2.del-cancel | Delete + Cancel keeps the investigation | pass | pass |  |
| D-DASH-2.del-esc | Delete dialog closes on Escape and on backdrop click | pass | pass |  |
| D-DASH-2.del-confirm | Delete + confirm removes it | pass | pass |  |
| D-DASH-2.reset-sample | Reset sample data: cancel keeps edits; confirm restores original | pass | pass |  |
| D-DASH-2.reset-keeps-own | Reset sample leaves own investigations untouched | pass | pass |  |
| D-DASH-2.empty | Delete everything -> empty state, then "Load the sample investigation" restores it | pass | pass |  |
| D-DASH-2.empty-new | Empty state "Start a new investigation" button works | pass | pass |  |
| D-E2E-1.problem | Problem step accepts all 8 fields | pass | pass |  |
| D-E2E-1.loss-calc | Loss live calc equals hand calc (lost units, lost margin, cost/event, annual loss) | pass | pass |  |
| D-E2E-1.evidence | Evidence: 3 items listed, types and "Not linked" shown | pass | pass |  |
| D-E2E-1.tree-leaf-delete | Deleting a leaf cause needs no confirmation and removes it | pass | pass |  |
| D-E2E-1.tree-nodes | Tree has 7 causes covering Physical, Human and System / Latent | pass | pass |  |
| D-E2E-1.actions-tiles | Actions tiles: total cost, 0 of 2 done, 1 overdue, 0 roots unlinked | pass | pass |  |
| D-E2E-1.qc-midway | Quality check lists "needs action" findings before verification (cause without system cause etc.) | pass | pass |  |
| D-E2E-1.dash-1 | Dashboard totals (open work, unverified): loss $13,800, open 2, overdue 1, saved $238,440 | pass | pass |  |
| D-E2E-1.verify-calc | Verify step money equals hand calc (before, after, saving, cost, payback) | pass | pass |  |
| D-E2E-1.dash-2 | Verified savings must not count while actions are still open (review says "no recurrence" but 2 actions not done) | pass | pass |  |
| D-E2E-1.verified-label | Once all actions are Done, review says no recurrence and a date is set, Verify says "Annual saving (verified)" and the status is Closed | pass | pass |  |
| D-E2E-1.dash-3 | Dashboard after closing: loss $0, open 0, overdue 0, saved $248,790; row says Closed | pass | pass |  |
| D-E2E-1.report | Report content matches data and hand-calculated figures | pass | pass |  |
| D-E2E-1.report-ruledout | Report marks ruled-out cause and category/evidence tags | pass | pass |  |
| D-E2E-1.reload | After reload the report is identical (everything persisted) | pass | pass |  |
| D-E2E-1.print | Print emulation: app chrome hidden, report visible, A4 PDF renders | pass | pass |  |
| D-TREE-1.empty | Empty tree shows "Start here" prompt and failure-event box; Tree has no Expand/Collapse all | pass | pass |  |
| D-TREE-1.child-focus | Add child: new box is selected and its text box has keyboard focus | pass | pass |  |
| D-TREE-1.order | Siblings are inserted directly after the source (one, two, three) | pass | pass |  |
| D-TREE-1.top-no-sibling | Failure event has no Sibling / Move / Delete buttons | pass | pass |  |
| D-TREE-1.edit | Edit text of a selected cause persists in the box and panel | pass | pass |  |
| D-TREE-1.move | Move up/down reorders; buttons disabled at the ends | pass | pass |  |
| D-TREE-1.status-cat | Category and status radios switch and reflect aria-checked | pass | pass |  |
| D-TREE-1.collapse | Collapse hides children with "+N hidden" chip; Expand and chip restore them | pass | pass |  |
| D-TREE-1.collapse-all | Collapse all / Expand all toggle every branch | pass | pass |  |
| D-TREE-1.del-parent-cancel | Delete cause with children: confirm names the count; Cancel keeps all | pass | pass |  |
| D-TREE-1.del-parent-confirm | Delete with children + confirm removes the whole branch; parent becomes selected | pass | pass |  |
| D-TREE-1.del-linked-action | Deleting a root cause that has an action warns and unlinks the action | pass | pass |  |
| D-TREE-1.details-btn | "Details" toolbar button is present and scrolls to the panel without error | pass | pass |  |
| D-TREE-2.tree-count | Tree view of the sample shows all 19 causes + failure event | pass | pass |  |
| D-TREE-2.whys | 5 Whys: chain = path to selected cause; "Because" arrows; sibling chips switch; deeper buttons | pass | pass |  |
| D-TREE-2.whys-add | 5 Whys "Add another Why" adds a child of the last box and selects it | pass | pass |  |
| D-TREE-2.fish | Fishbone: three category columns with counts; text edit appears in Tree | pass | pass |  |
| D-TREE-2.fish-sum | Fishbone column counts sum to the number of causes (excl. failure event) | pass | pass |  |
| D-TREE-2.fish-empty | Fishbone with no causes shows empty guidance | pass | pass |  |
| D-TREE-2.tab-state | Tab aria-selected tracks the active view | pass | pass |  |
| D-QC-1.blank | Blank investigation: problem-missing, loss-not-quantified, no-causes findings; panel opens on desktop | pass | pass |  |
| D-QC-1.jump-problem | Rule problem-missing: "Go to Problem" opens Problem step | pass | pass |  |
| D-QC-1.clear-problem | Rule problem-missing clears when all 8 fields are filled | pass | pass |  |
| D-QC-1.partial-problem | Rule problem-missing lists only the remaining fields | pass | pass |  |
| D-QC-1.jump-loss | Rule loss-not-quantified: "Go to Loss" opens Loss step | pass | pass |  |
| D-QC-1.loss-partial | Loss finding shrinks as inputs are entered, then clears | pass | pass |  |
| D-QC-1.loss-zero | Loss inputs of 0 still count as "not quantified" | pass | pass |  |
| D-QC-1.no-root | Rule no-root-cause (tree started): "No cause is flagged as a root cause yet" and jump -> Cause tree | pass | pass |  |
| D-QC-1.no-latent | Rule branch-without-system-cause: Physical leaf flagged; jump selects that node | pass | pass |  |
| D-QC-1.no-latent-human | Rule branch-without-system-cause also fires for a Human leaf, not for ruled-out | pass | pass |  |
| D-QC-1.verified-no-ev | Rule verified-without-evidence: needs Verified + no evidence; shown in panel warning only when evidence exists | pass | pass |  |
| D-QC-1.evidence-clears | Linking evidence clears verified-without-evidence | pass | pass |  |
| D-QC-1.system-clears | Adding a System cause beneath the Human leaf clears the branch rule; flagging root cause clears no-root-cause | pass | pass |  |
| D-QC-1.root-no-action | Rule root-cause-without-action: appears, jump -> Actions | pass | pass |  |
| D-QC-1.action-incomplete | Rule action-missing-owner-or-date: both missing, then owner only, then clears | pass | pass |  |
| D-QC-1.overdue | Rule action-overdue: past due + not done flags; "today" is not overdue; Done clears it | pass | pass |  |
| D-QC-1.verify-missing | Rule done-without-verification: all done + unreviewed; jump -> Verify; clears when reviewed | pass | pass |  |
| D-QC-1.recurred | Rule failure-recurred: "Yes" flags; Verify shows alert + "Reopen the cause tree" -> Cause tree; jump -> Cause tree | pass | pass |  |
| D-QC-1.all-clear | With everything fixed the panel shows "All clear" | pass | pass |  |
| D-QC-1.sort | Findings are sorted High first, then Medium | pass | pass |  |
| D-QC-1.toggle | Quality panel header toggles open/closed (aria-expanded) | pass | pass |  |
| D-PERS-1.autosave-states | Autosave indicator: "Saving..." after typing, then "All changes saved" | pass | pass |  |
| D-PERS-1.problem | Problem fields survive reload (all 8) | pass | pass |  |
| D-PERS-1.url-hash | Reload keeps the current step via the #hash | pass | pass |  |
| D-PERS-1.loss | Loss inputs, unit and currency survive reload | pass | pass |  |
| D-PERS-1.evidence | Evidence add / edit / delete survive reload | pass | pass |  |
| D-PERS-1.tree | Tree structure, text, category, status, root flag, evidence link, collapse survive reload | pass | pass |  |
| D-PERS-1.tree-move-delete | Tree move and delete survive reload | pass | pass |  |
| D-PERS-1.actions | Actions add / edit / status / delete survive reload | pass | pass |  |
| D-PERS-1.verify | Verification fields survive reload | pass | pass |  |
| D-PERS-1.fast-reload | Edit then reload within 100 ms (before the 350 ms debounce) does not lose the edit | pass | pass |  |
| D-PERS-1.nav-away | Edit then click "All investigations" immediately keeps the edit | pass | pass |  |
| D-PERS-1.title-doc | Browser tab title follows the investigation title | pass | pass |  |
| D-PERS-1.two-tabs | Two tabs editing different fields of one investigation do not overwrite each other | pass | pass |  |
| D-PERS-1.concurrent-window | Two tabs edit different fields within the same ~350 ms autosave window: neither edit may be silently lost (3 tries) | **FAIL** | **FAIL** | values differ: expected [] but got ["try 0: site=\"S01794901723942\" (typed \"S01794901723942\") when=\"Night shift, full speed\" (typed \"W |
| D-EDGE-NUM.letters | Letters are rejected in number fields | pass | pass |  |
| D-EDGE-NUM.negative | Negative numbers cannot be entered (minus key ignored) - no explanation shown | pass | pass |  |
| D-EDGE-NUM.paste-comma | Pasting "1,000" or "1e3" is silently rejected (field keeps previous value) | pass | pass |  |
| D-EDGE-NUM.decimals | Decimals ".5", "5.", "0.001" accepted; live calc rounds to 2 dp | pass | pass |  |
| D-EDGE-NUM.zero-loss | All zeros: annual loss $0, no NaN/Infinity anywhere | pass | pass |  |
| D-EDGE-NUM.huge | Huge values (1e20) format without NaN/scientific and without horizontal overflow | pass | pass |  |
| D-EDGE-NUM.currency | Currency: max 4 chars; empty falls back to $; unit empty falls back to "units" | pass | pass |  |
| D-EDGE-NUM.payback-after-empty | Verify: events after = "" -> saving Not entered, payback n/a (no divide-by-zero) | pass | pass |  |
| D-EDGE-NUM.payback-after=events (saving 0) | Verify: events after = "4" -> saving $0, payback n/a (no divide-by-zero) | pass | pass |  |
| D-EDGE-NUM.payback-after>events (negative saving) | Verify: events after = "6" -> saving -$6,900, payback n/a (no divide-by-zero) | pass | pass |  |
| D-EDGE-NUM.payback-after=0 | Verify: events after = "0" -> saving $13,800, payback 1.9 months (no divide-by-zero) | pass | pass |  |
| D-EDGE-NUM.payback-after=1 | Verify: events after = "1" -> saving $10,350, payback 2.5 months (no divide-by-zero) | pass | pass |  |
| D-EDGE-NUM.payback-zero-cost | Action cost 0 with saving: payback "under 0.1 months" | pass | pass |  |
| D-EDGE-NUM.report-no-after | Report without an after figure says "Not yet" and explains | pass | pass |  |
| D-EDGE-TEXT.overflow-problem | 375px: "Problem" step has no horizontal page overflow with 3000-char words | pass | pass |  |
| D-EDGE-TEXT.overflow-loss | 375px: "Loss" step has no horizontal page overflow with 3000-char words | pass | pass |  |
| D-EDGE-TEXT.overflow-evidence | 375px: "Evidence" step has no horizontal page overflow with 3000-char words | pass | pass |  |
| D-EDGE-TEXT.overflow-cause | 375px: "Cause tree" step has no horizontal page overflow with 3000-char words | pass | pass |  |
| D-EDGE-TEXT.overflow-actions | 375px: "Actions" step has no horizontal page overflow with 3000-char words | pass | pass |  |
| D-EDGE-TEXT.overflow-verify | 375px: "Verify" step has no horizontal page overflow with 3000-char words | pass | pass |  |
| D-EDGE-TEXT.overflow-report | 375px: "Report" step has no horizontal page overflow with 3000-char words | pass | pass |  |
| D-EDGE-TEXT.views | 5 Whys and Fishbone views with long text: no page overflow | pass | pass |  |
| D-EDGE-TEXT.dash-overflow | Dashboard with long/special title: no overflow | pass | pass |  |
| D-EDGE-TEXT.no-xss | No script ran, no dialog opened, no injected elements anywhere | pass | pass |  |
| D-EDGE-TEXT.as-text | Special text is shown literally in the report and survives a round trip | pass | pass |  |
| D-EDGE-TEXT.delete-msg | Delete dialog shows the hostile title as text | pass | pass |  |
| D-EDGE-TEXT.doc-title | document.title contains the title as plain text | pass | pass |  |
| D-EDGE-DATE.past-future-event | Event dates 1900-01-01 and 2999-12-31 are accepted and shown formatted | pass | pass |  |
| D-EDGE-DATE.future-event-flag | Future event date (after today) is not flagged by the quality check | pass | pass |  |
| D-EDGE-DATE.clear-date | Clearing the date makes the quality check list "date of event" again | pass | pass |  |
| D-EDGE-DATE.overdue-done | Past due date on a Done action is not overdue; on an Open action it is; dashboard counts it | pass | pass |  |
| D-EDGE-DATE.review-before-event | Review date earlier than the event date is accepted without any warning (observation) | pass | pass |  |
| D-EDGE-NAV.bad-id | Invalid investigation id shows "Investigation not found" with a working link back | pass | pass |  |
| D-EDGE-NAV.weird-ids | Ids with special characters (%00, <script>, very long, ../) do not crash the page | pass | **FAIL** |  |
| D-EDGE-NAV.unknown-route | Unknown route /nope and /app/investigations/ return a 404 page | pass | pass |  |
| D-EDGE-NAV.bad-hash | Unknown #hash falls back to the Problem step | pass | pass |  |
| D-EDGE-NAV.deep-link | Deep links #report and #cause open those steps | pass | pass |  |
| D-EDGE-NAV.back-fwd | Browser back/forward: dashboard -> workspace -> steps -> back returns to dashboard, forward returns to workspace | pass | pass |  |
| D-EDGE-NAV.bfcache-edit | Back to the dashboard after editing shows the edited title | pass | pass |  |
| D-EDGE-NAV.dblclick-dashboard | Double-clicking "New investigation" creates exactly one investigation | pass | pass |  |
| D-EDGE-NAV.dblclick-dashboard-human | Human-speed double click (2 clicks 120 ms apart) on "New investigation" creates exactly one | pass | pass |  |
| D-EDGE-NAV.hashchange | Changing only the #hash in the address bar of an open investigation switches the step | pass | pass |  |
| D-EDGE-NAV.dblclick-landing | Double-clicking "Start a new investigation" on the landing page creates exactly one | pass | pass |  |
| D-EDGE-NAV.dblclick-dup | Double-clicking Duplicate creates exactly one copy | pass | pass |  |
| D-EDGE-NAV.rapid-new-nav | Pressing "New investigation" then browser Back immediately leaves no half-created junk beyond one blank | pass | pass |  |
| D-EDGE-NAV | Invalid id, unknown routes, back/forward, double-click create | **FAIL** | n/a | CSP violations during test: Applying inline style violates the following Content Security Policy directive 'style-src 'self''. Either the 'u |
| D-EDGE-ACT.hidden-after-unflag | After the only root cause is un-flagged the existing action is still visible and editable | pass | pass |  |
| D-EDGE-ACT.hidden-still-counted | Hidden action still counts in quality findings, report and dashboard (data and UI disagree) | pass | pass |  |
| D-EDGE-EVID.upload | Upload a 3000x2000 PNG: preview appears, button changes to "Replace photo", stored as JPEG <= 800px | pass | pass |  |
| D-EDGE-EVID.non-image | Non-image file shows "That file is not an image." alert | pass | pass |  |
| D-EDGE-EVID.photo-persist-report | Photo persists after reload and appears in the report | pass | pass |  |
| D-EDGE-EVID.remove-photo | "Remove photo" removes the image | pass | pass |  |
| D-EDGE-EVID.link-delete | Delete evidence linked to a cause: confirm says "linked to 1 cause"; after confirm the cause chip/link is gone | pass | pass |  |
| D-EDGE-EVID.evidence-types | All six evidence types selectable and shown in the list/report | pass | pass |  |
| D-EDGE-STORE.corrupt | Corrupt localStorage JSON: app does not crash (shows empty state) and recovers when a new investigation is created | pass | pass |  |
| D-EDGE-STORE.blocked | localStorage unavailable (throws): app still works in memory for the session | pass | pass |  |
| D-EDGE-STORE.quota | Storage full: edit shows a readable "Browser storage is full" error with Try again | pass | pass |  |
| D-ERR-1.pages-desktop | desktop: console + network clean on all 7 pages | pass | pass |  |
| D-ERR-1.steps-desktop | desktop: console + network clean while visiting all 7 steps and 3 cause views | pass | pass |  |
| D-ERR-1.pages-mobile | mobile: console + network clean on all 7 pages | pass | pass |  |
| D-ERR-1.steps-mobile | mobile: console + network clean while visiting all 7 steps and 3 cause views | pass | pass |  |
| D-A11Y-1.names | Every input/select/textarea has an accessible name (all pages) | pass | pass |  |
| D-A11Y-1.btn-names | Every button/link has an accessible name | pass | pass |  |
| D-A11Y-1.lang | <html lang> is set and exactly one <h1> per page | pass | pass |  |
| D-A11Y-1.titles | Each page has its own <title> | pass | pass |  |
| D-A11Y-1.dup-ids | No duplicate element ids | pass | pass |  |
| D-A11Y-1.ws-names | Workspace: all 7 steps have labelled inputs and named buttons | pass | pass |  |
| D-A11Y-1.stepper-name | Stepper button accessible names read naturally ("Problem, complete" not "Problem(complete)") | pass | pass |  |
| D-A11Y-1.small-targets | Interactive controls are at least 24x24 CSS px (WCAG 2.2 min) on every step | pass | pass |  |
| D-A11Y-1.contrast-desktop | Text contrast >= 4.5:1 (3:1 large) on all pages (desktop) | pass | pass |  |
| D-A11Y-1.focus-visible | Keyboard focus is visibly indicated on buttons, links, inputs (outline or ring) | pass | pass |  |
| D-A11Y-1.keyboard-main | Dashboard main controls reachable by Tab: New investigation, Open, Duplicate, Delete, Reset sample | pass | pass |  |
| D-A11Y-1.keyboard-tree | Cause tree: boxes reachable and selectable by keyboard (Tab + Enter), toolbar then reachable | pass | pass |  |
| D-A11Y-1.keyboard-modal | Confirm dialog: focus moves into it, Escape closes, focus returns to trigger | pass | pass |  |
| D-A11Y-1.modal-focus-return | After closing the dialog with Escape focus returns to the button that opened it | pass | pass |  |
| D-A11Y-1.account-menu-kbd | Skip link / landmarks: page has a <main> landmark on dashboard and workspace | pass | pass |  |
| D-MOB-1.page_ | 375px /: no overflow / off-screen content | pass | pass |  |
| D-MOB-1.page_login | 375px /login: no overflow / off-screen content | pass | pass |  |
| D-MOB-1.page_signup | 375px /signup: no overflow / off-screen content | pass | pass |  |
| D-MOB-1.page_forgot_password | 375px /forgot-password: no overflow / off-screen content | pass | pass |  |
| D-MOB-1.page_reset_password | 375px /reset-password: no overflow / off-screen content | pass | pass |  |
| D-MOB-1.page_app | 375px /app: no overflow / off-screen content | pass | pass |  |
| D-MOB-1.page_app_investigations_sample_p101 | 375px /app/investigations/sample-p101: no overflow / off-screen content | pass | pass |  |
| D-MOB-1.step-Problem | 375px sample "Problem" step: no overflow / off-screen content | pass | pass |  |
| D-MOB-1.step-Loss | 375px sample "Loss" step: no overflow / off-screen content | pass | pass |  |
| D-MOB-1.step-Evidence | 375px sample "Evidence" step: no overflow / off-screen content | pass | pass |  |
| D-MOB-1.step-Cause tree | 375px sample "Cause tree" step: no overflow / off-screen content | pass | pass |  |
| D-MOB-1.step-Actions | 375px sample "Actions" step: no overflow / off-screen content | pass | pass |  |
| D-MOB-1.step-Verify | 375px sample "Verify" step: no overflow / off-screen content | pass | pass |  |
| D-MOB-1.step-Report | 375px sample "Report" step: no overflow / off-screen content | pass | pass |  |
| D-MOB-1.cause-views | 375px cause views (5 Whys, Fishbone, Tree with selected node + panel): no overflow | pass | pass |  |
| D-MOB-1.tap-targets | 375px: primary controls are at least 40px tall (touch) | pass | pass |  |
| D-MOB-1.stepper-scroll | 375px: stepper scrolls horizontally and the active step stays in view | pass | pass |  |
| D-MOB-1.mobile-print-buttons | 375px: Back/Next buttons do not overlap content | pass | pass |  |
| D-MOB-E2E.problem | Problem step accepts all 8 fields | pass | pass |  |
| D-MOB-E2E.loss-calc | Loss live calc equals hand calc (lost units, lost margin, cost/event, annual loss) | pass | pass |  |
| D-MOB-E2E.evidence | Evidence: 3 items listed, types and "Not linked" shown | pass | pass |  |
| D-MOB-E2E.tree-leaf-delete | Deleting a leaf cause needs no confirmation and removes it | pass | pass |  |
| D-MOB-E2E.tree-nodes | Tree has 7 causes covering Physical, Human and System / Latent | pass | pass |  |
| D-MOB-E2E.actions-tiles | Actions tiles: total cost, 0 of 2 done, 1 overdue, 0 roots unlinked | pass | pass |  |
| D-MOB-E2E.verify-calc | Verify step money equals hand calc (before, after, saving, cost, payback) | pass | pass |  |
| D-MOB-E2E.report-mobile | Mobile report shows the same headline numbers | pass | pass |  |
| D-MOB-E2E.tree-mobile | Mobile tree with 7 nodes: no page overflow, tree scroll container used | pass | pass |  |
| LOSS-1-desk.default | New investigation starts at 100 / 0 / 0, total 100%, no recovery/buffer fields | pass | pass |  |
| LOSS-1-desk.mix-S2 | Setting lost=60% gives 60/40/0 and total 100 | pass | pass |  |
| LOSS-1-desk.mix-S3 | Setting buffer=20% gives 48/32/20 and total 100 | pass | pass |  |
| LOSS-1-desk.mix-S4 | Setting madeUp=50% gives 35/50/15 and total 100 | pass | pass |  |
| LOSS-1-desk.mix-S5 | Setting madeUp=100% gives 0/100/0 and total 100 | pass | pass |  |
| LOSS-1-desk.mix-S6 | Setting buffer=100% gives 0/0/100 and total 100 | pass | pass |  |
| LOSS-1-desk.mix-S7 | Setting lost=25% gives 25/0/75 and total 100 | pass | pass |  |
| LOSS-1-desk.slider | Slider changes a share and the others rebalance to 100 | pass | pass |  |
| LOSS-1-desk.clamp | Typing 150 clamps to 100 (others 0); empty counts as 0; letters rejected; 4 digits rejected | pass | pass |  |
| LOSS-1-desk.always-100 | 60 random operations (typing and slider on any share) never leave a total other than 100 | pass | pass |  |
| LOSS-1-desk.bar | Share bar segment widths match the shares | pass | pass |  |
| LOSS-1-desk.persist | Shares, recovery note, holding cost and other lines survive reload | pass | pass |  |
| LOSS-2-desk.mix-S1 | S1 100/0/0: cash $1,000/event, opportunity $2,000/event, annual $6,000 + $12,000 = $18,000 | pass | pass |  |
| LOSS-2-desk.recovery-S2 | S2 60/40/0 with recovery $800: opportunity $1,200/event; cash $1,800/event; annual $10,800 + $7,200 = $18,000 | pass | pass |  |
| LOSS-2-desk.others-S2 | Two other-cost lines (250 + 150.25) add $400.25 to cash per event; annual loss rises by 400.25 x 6 = 2,401.5 | pass | pass |  |
| LOSS-2-desk.calc-S3 | S3 48/32/20: live panel equals hand calc | pass | pass |  |
| LOSS-2-desk.calc-S4 | S4 35/50/15: live panel equals hand calc | pass | pass |  |
| LOSS-2-desk.calc-S5 | S5 0/100/0: live panel equals hand calc | pass | pass |  |
| LOSS-2-desk.calc-S6 | S6 0/0/100: live panel equals hand calc | pass | pass |  |
| LOSS-2-desk.calc-S7 | S7 25/0/75: live panel equals hand calc | pass | pass |  |
| LOSS-2-desk.buffer-hidden-fields | When the buffer share is 0 the holding cost is not counted; when made-up share is 0 the recovery cost is not counted (even though the numbers are still stored) | pass | pass |  |
| LOSS-2-desk.recovery-reappears | Raising the made-up share again restores the stored recovery cost ($800) | pass | pass |  |
| LOSS-2-desk.zero-margin | With 0% lost for good, a blank margin is not reported as missing and the loss is quantified | pass | pass |  |
| LOSS-2-desk.hours-rate-needed | Zero downtime hours: annual loss 0 only if no cash costs; repair + other still count? (cash per event x events) | pass | pass |  |
| LOSS-3-desk.empty | No lines: explanatory text, repair counted as cash | pass | pass |  |
| LOSS-3-desk.categories | Category select offers the 8 categories | pass | pass |  |
| LOSS-3-desk.blank-amount | A blank amount counts as 0; setting 500 raises cash/event by 500 and annual by 3,000 | pass | pass |  |
| LOSS-3-desk.negative-text | Negative and non-numeric amounts cannot be typed | pass | pass |  |
| LOSS-3-desk.long-desc | A 3000-char description does not overflow the layout | pass | pass |  |
| LOSS-3-desk.remove | Remove deletes only that line and updates totals | pass | pass |  |
| LOSS-3-desk.currency | Other-cost amount prefix follows the currency symbol | pass | pass |  |
| LOSS-4-desk.verify | Verify: before/after/expected saving with cash vs opportunity split, buffer holding assumed to continue, payback 4.7 months | pass | pass |  |
| LOSS-4-desk.dash-open | Dashboard (open investigation): row $20,462 with cash/opportunity split; loss tile = same; verified tile unchanged at $238,440 | pass | pass |  |
| LOSS-4-desk.report-open | Report: loss table rows, split, totals and "expected saving ... not yet verified" wording equal hand calc | pass | pass |  |
| LOSS-4-desk.close | Closing (action Done + not recurred + review date): label becomes "Annual saving (verified)", status Closed | pass | pass |  |
| LOSS-4-desk.dash-closed | Dashboard after closing: loss tile $0, verified tile $251,081 (238,440 + 12,641) with cash $65,801 + opportunity $185,280 | pass | pass |  |
| LOSS-4-desk.not-verified-states | Each missing condition keeps the saving "not yet verified" and out of the dashboard: action open / recurred yes / unreviewed / no review date | pass | pass |  |
| LOSS-5-desk.dash | Old record (no share fields) keeps the old maths: $18,000 = $6,000 cash + $12,000 opportunity | pass | pass |  |
| LOSS-5-desk.open-old | Opening the old record shows 100/0/0, empty other costs, no recovery fields, and the same annual loss | pass | pass |  |
| LOSS-5-desk.edit-old | Editing an old record (change shares, add cost) works and persists | pass | pass |  |
| LOSS-5-desk.verify-old | Old record in Verify: events after 2 gives saving $12,000 (cash $4,000... hand: 6->2 events) | pass | pass |  |
| LOSS-5-desk.malformed-total | Stored shares 50/50/50 are shown as whole numbers totalling 100 (33/33/34) | pass | pass |  |
| LOSS-5-desk.malformed-money | Malformed 50/50/50 + recovery 600: money uses one third each (opp 500x1/3x$4x6 = $4,000; cash (1000+600)x6 = $9,600; total $13,600) and agrees with what the screen shows | pass | pass |  |
| LOSS-5-desk.negatives | Negative stored shares/recovery/other amounts are treated as 0 (no negative money, no NaN) | pass | pass |  |
| LOSS-6-desk.layout | Loss step with every section open: no horizontal overflow or off-screen content | pass | pass |  |
| LOSS-6-desk.report-layout | Report with loss table: no overflow; print emulation keeps the table | pass | pass |  |
| LOSS-6-desk.a11y | New controls have accessible names (percent, slider, recovery, holding, category, description, amount, remove) | pass | pass |  |
| LOSS-6-desk.huge | Huge loss numbers wrap inside the live-calculation panel (no page overflow at this width) | pass | pass |  |
| LOSS-7-desk.copy-same | Copy has 48/32/20, the 2 other-cost lines, recovery note and the same annual loss $20,462 | pass | pass |  |
| LOSS-7-desk.copy-independent | Editing the copy (shares, remove a cost line) does not change the original | pass | pass |  |
| LOSS-1-mob.default | New investigation starts at 100 / 0 / 0, total 100%, no recovery/buffer fields | pass | pass |  |
| LOSS-1-mob.mix-S2 | Setting lost=60% gives 60/40/0 and total 100 | pass | pass |  |
| LOSS-1-mob.mix-S3 | Setting buffer=20% gives 48/32/20 and total 100 | pass | pass |  |
| LOSS-1-mob.mix-S4 | Setting madeUp=50% gives 35/50/15 and total 100 | pass | pass |  |
| LOSS-1-mob.mix-S5 | Setting madeUp=100% gives 0/100/0 and total 100 | pass | pass |  |
| LOSS-1-mob.mix-S6 | Setting buffer=100% gives 0/0/100 and total 100 | pass | pass |  |
| LOSS-1-mob.mix-S7 | Setting lost=25% gives 25/0/75 and total 100 | pass | pass |  |
| LOSS-1-mob.slider | Slider changes a share and the others rebalance to 100 | pass | pass |  |
| LOSS-1-mob.clamp | Typing 150 clamps to 100 (others 0); empty counts as 0; letters rejected; 4 digits rejected | pass | pass |  |
| LOSS-1-mob.always-100 | 60 random operations (typing and slider on any share) never leave a total other than 100 | pass | pass |  |
| LOSS-1-mob.bar | Share bar segment widths match the shares | pass | pass |  |
| LOSS-1-mob.persist | Shares, recovery note, holding cost and other lines survive reload | pass | pass |  |
| LOSS-2-mob.mix-S1 | S1 100/0/0: cash $1,000/event, opportunity $2,000/event, annual $6,000 + $12,000 = $18,000 | pass | pass |  |
| LOSS-2-mob.recovery-S2 | S2 60/40/0 with recovery $800: opportunity $1,200/event; cash $1,800/event; annual $10,800 + $7,200 = $18,000 | pass | pass |  |
| LOSS-2-mob.others-S2 | Two other-cost lines (250 + 150.25) add $400.25 to cash per event; annual loss rises by 400.25 x 6 = 2,401.5 | pass | pass |  |
| LOSS-2-mob.calc-S3 | S3 48/32/20: live panel equals hand calc | pass | pass |  |
| LOSS-2-mob.calc-S4 | S4 35/50/15: live panel equals hand calc | pass | pass |  |
| LOSS-2-mob.calc-S5 | S5 0/100/0: live panel equals hand calc | pass | pass |  |
| LOSS-2-mob.calc-S6 | S6 0/0/100: live panel equals hand calc | pass | pass |  |
| LOSS-2-mob.calc-S7 | S7 25/0/75: live panel equals hand calc | pass | pass |  |
| LOSS-2-mob.buffer-hidden-fields | When the buffer share is 0 the holding cost is not counted; when made-up share is 0 the recovery cost is not counted (even though the numbers are still stored) | pass | pass |  |
| LOSS-2-mob.recovery-reappears | Raising the made-up share again restores the stored recovery cost ($800) | pass | pass |  |
| LOSS-2-mob.zero-margin | With 0% lost for good, a blank margin is not reported as missing and the loss is quantified | pass | pass |  |
| LOSS-2-mob.hours-rate-needed | Zero downtime hours: annual loss 0 only if no cash costs; repair + other still count? (cash per event x events) | pass | pass |  |
| LOSS-3-mob.empty | No lines: explanatory text, repair counted as cash | pass | pass |  |
| LOSS-3-mob.categories | Category select offers the 8 categories | pass | pass |  |
| LOSS-3-mob.blank-amount | A blank amount counts as 0; setting 500 raises cash/event by 500 and annual by 3,000 | pass | pass |  |
| LOSS-3-mob.negative-text | Negative and non-numeric amounts cannot be typed | pass | pass |  |
| LOSS-3-mob.long-desc | A 3000-char description does not overflow the layout | pass | pass |  |
| LOSS-3-mob.remove | Remove deletes only that line and updates totals | pass | pass |  |
| LOSS-3-mob.currency | Other-cost amount prefix follows the currency symbol | pass | pass |  |
| LOSS-4-mob.verify | Verify: before/after/expected saving with cash vs opportunity split, buffer holding assumed to continue, payback 4.7 months | pass | pass |  |
| LOSS-4-mob.dash-open | Dashboard (open investigation): row $20,462 with cash/opportunity split; loss tile = same; verified tile unchanged at $238,440 | pass | pass |  |
| LOSS-4-mob.report-open | Report: loss table rows, split, totals and "expected saving ... not yet verified" wording equal hand calc | pass | pass |  |
| LOSS-4-mob.close | Closing (action Done + not recurred + review date): label becomes "Annual saving (verified)", status Closed | pass | pass |  |
| LOSS-4-mob.dash-closed | Dashboard after closing: loss tile $0, verified tile $251,081 (238,440 + 12,641) with cash $65,801 + opportunity $185,280 | pass | pass |  |
| LOSS-4-mob.not-verified-states | Each missing condition keeps the saving "not yet verified" and out of the dashboard: action open / recurred yes / unreviewed / no review date | pass | pass |  |
| LOSS-5-mob.dash | Old record (no share fields) keeps the old maths: $18,000 = $6,000 cash + $12,000 opportunity | pass | pass |  |
| LOSS-5-mob.open-old | Opening the old record shows 100/0/0, empty other costs, no recovery fields, and the same annual loss | pass | pass |  |
| LOSS-5-mob.edit-old | Editing an old record (change shares, add cost) works and persists | pass | pass |  |
| LOSS-5-mob.verify-old | Old record in Verify: events after 2 gives saving $12,000 (cash $4,000... hand: 6->2 events) | pass | pass |  |
| LOSS-5-mob.malformed-total | Stored shares 50/50/50 are shown as whole numbers totalling 100 (33/33/34) | pass | pass |  |
| LOSS-5-mob.malformed-money | Malformed 50/50/50 + recovery 600: money uses one third each (opp 500x1/3x$4x6 = $4,000; cash (1000+600)x6 = $9,600; total $13,600) and agrees with what the screen shows | pass | pass |  |
| LOSS-5-mob.negatives | Negative stored shares/recovery/other amounts are treated as 0 (no negative money, no NaN) | pass | pass |  |
| LOSS-6-mob.layout | Loss step with every section open: no horizontal overflow or off-screen content | pass | pass |  |
| LOSS-6-mob.report-layout | Report with loss table: no overflow; print emulation keeps the table | pass | pass |  |
| LOSS-6-mob.a11y | New controls have accessible names (percent, slider, recovery, holding, category, description, amount, remove) | pass | pass |  |
| LOSS-6-mob.huge | Huge loss numbers wrap inside the live-calculation panel (no page overflow at this width) | pass | pass |  |
| LOSS-7-mob.copy-same | Copy has 48/32/20, the 2 other-cost lines, recovery note and the same annual loss $20,462 | pass | pass |  |
| LOSS-7-mob.copy-independent | Editing the copy (shares, remove a cost line) does not change the original | pass | pass |  |
| F-ASSET-1-demo-desk.fields | Asset details section has tag, type, make/model, duty, criticality A/B/C, failure mode | pass | n/a |  |
| F-ASSET-1-demo-desk.combo-list | Asset type and Failure mode lists open on focus, filter while typing, and accept your own text | pass | n/a |  |
| F-ASSET-1-demo-desk.criticality | Criticality: choose A, tap again clears, B replaces A | pass | n/a |  |
| F-ASSET-1-demo-desk.register-status | A new tag says "It will be added to your asset register", then "In your asset register" once saved; matching ignores case and spaces | pass | n/a |  |
| F-ASSET-1-demo-desk.persist | All asset detail fields survive reload | pass | n/a |  |
| F-ASSET-1-demo-desk.register-entry | The register now has ZZ-501 with the type, make, duty and criticality from the investigation, plus 1 investigation | pass | n/a |  |
| F-ASSET-1-demo-desk.long-text | A 3000-character make/duty does not overflow the Problem step at this width | pass | n/a |  |
| F-ASSET-1-demo-mob.fields | Asset details section has tag, type, make/model, duty, criticality A/B/C, failure mode | pass | n/a |  |
| F-ASSET-1-demo-mob.combo-list | Asset type and Failure mode lists open on focus, filter while typing, and accept your own text | pass | n/a |  |
| F-ASSET-1-demo-mob.criticality | Criticality: choose A, tap again clears, B replaces A | pass | n/a |  |
| F-ASSET-1-demo-mob.register-status | A new tag says "It will be added to your asset register", then "In your asset register" once saved; matching ignores case and spaces | pass | n/a |  |
| F-ASSET-1-demo-mob.persist | All asset detail fields survive reload | pass | n/a |  |
| F-ASSET-1-demo-mob.register-entry | The register now has ZZ-501 with the type, make, duty and criticality from the investigation, plus 1 investigation | pass | n/a |  |
| F-ASSET-1-demo-mob.long-text | A 3000-character make/duty does not overflow the Problem step at this width | pass | n/a |  |
| F-ASSET-1-acct-desk.fields | Asset details section has tag, type, make/model, duty, criticality A/B/C, failure mode | pass | n/a |  |
| F-ASSET-1-acct-desk.combo-list | Asset type and Failure mode lists open on focus, filter while typing, and accept your own text | pass | n/a |  |
| F-ASSET-1-acct-desk.criticality | Criticality: choose A, tap again clears, B replaces A | pass | n/a |  |
| F-ASSET-1-acct-desk.register-status | A new tag says "It will be added to your asset register", then "In your asset register" once saved; matching ignores case and spaces | pass | n/a |  |
| F-ASSET-1-acct-desk.persist | All asset detail fields survive reload | pass | n/a |  |
| F-ASSET-1-acct-desk.register-entry | The register now has ZZ-501 with the type, make, duty and criticality from the investigation, plus 1 investigation | pass | n/a |  |
| F-ASSET-1-acct-desk.long-text | A 3000-character make/duty does not overflow the Problem step at this width | pass | n/a |  |
| F-REG-1-demo-desk.sample | Fresh register shows the 5 sample assets in tag order P-101, P-102, P-103, P-210, P-215, each marked Illustrative sample | pass | n/a |  |
| F-REG-1-demo-desk.stats | P-101 stats equal hand calc from the sample: 1 investigation, 6 failures a year, annual loss $238,440 | pass | n/a |  |
| F-REG-1-demo-desk.add-validation | Add asset: empty tag and duplicate tag (any case) are refused with a clear message | pass | n/a |  |
| F-REG-1-demo-desk.add | Add asset with all fields shows it in the list; cancel closes the form without adding | pass | n/a |  |
| F-REG-1-demo-desk.edit | Edit: change duty and save; tag clash refused; cancel discards | pass | n/a |  |
| F-REG-1-demo-desk.search | Search matches tag, type, make, duty and area; no match message; clearing restores the list | pass | n/a |  |
| F-REG-1-demo-desk.paste | Paste a list: counts new / repeated / blank lines exactly, adds only the new ones | pass | n/a |  |
| F-REG-1-demo-desk.stats-linked | Stats follow investigations by tag: a 3-events/yr investigation with annual loss $9,000 on QA-1 shows 1 / 3 / $9,000 | pass | n/a |  |
| F-REG-1-demo-desk.delete | Delete asset: message mentions investigations that use the tag; Cancel keeps it; Delete removes it and keeps the investigation | pass | n/a |  |
| F-REG-1-demo-desk.layout | Register page layout: no overflow at this width; long values wrap | pass | n/a |  |
| F-REG-1-demo-mob.sample | Fresh register shows the 5 sample assets in tag order P-101, P-102, P-103, P-210, P-215, each marked Illustrative sample | pass | n/a |  |
| F-REG-1-demo-mob.stats | P-101 stats equal hand calc from the sample: 1 investigation, 6 failures a year, annual loss $238,440 | pass | n/a |  |
| F-REG-1-demo-mob.add-validation | Add asset: empty tag and duplicate tag (any case) are refused with a clear message | pass | n/a |  |
| F-REG-1-demo-mob.add | Add asset with all fields shows it in the list; cancel closes the form without adding | pass | n/a |  |
| F-REG-1-demo-mob.edit | Edit: change duty and save; tag clash refused; cancel discards | pass | n/a |  |
| F-REG-1-demo-mob.search | Search matches tag, type, make, duty and area; no match message; clearing restores the list | pass | n/a |  |
| F-REG-1-demo-mob.paste | Paste a list: counts new / repeated / blank lines exactly, adds only the new ones | pass | n/a |  |
| F-REG-1-demo-mob.stats-linked | Stats follow investigations by tag: a 3-events/yr investigation with annual loss $9,000 on QA-1 shows 1 / 3 / $9,000 | pass | n/a |  |
| F-REG-1-demo-mob.delete | Delete asset: message mentions investigations that use the tag; Cancel keeps it; Delete removes it and keeps the investigation | pass | n/a |  |
| F-REG-1-demo-mob.layout | Register page layout: no overflow at this width; long values wrap | pass | n/a |  |
| F-REG-2-acct-desk.add-persist | Asset added signed in persists after reload and shows in A's list | pass | n/a |  |
| F-REG-2-acct-desk.b-sees-own | User B's register has the 5 sample assets and does not show A's asset | pass | n/a |  |
| F-REG-2-acct-desk.b-api | User B cannot read, change or delete A's asset row through the API; anonymous gets nothing | pass | n/a |  |
| F-REG-2-acct-desk.b-direct-write | B writing an asset with A's tag does not collide with or change A's asset | pass | n/a |  |
| F-REG-2-acct-desk.delete | A deletes the asset: gone after reload | pass | n/a |  |
| F-CAPA-1-demo-desk.empty | Empty Actions step: corrective section with "No corrective action yet" prompt, one preventive group per root cause with "No action yet" | pass | n/a |  |
| F-CAPA-1-demo-desk.corrective | Add corrective action: lands in the Corrective section, is linked to "The failure event", editor opens at once | pass | n/a |  |
| F-CAPA-1-demo-desk.preventive | Add preventive action under each root cause: appears in that group only; kind is Preventive | pass | n/a |  |
| F-CAPA-1-demo-desk.one-open | Rows expand in place one at a time: opening another row closes the first; Close button collapses | pass | n/a |  |
| F-CAPA-1-demo-desk.tiles | Tiles: total action cost 800 + 100 + 50 = $950; 0 of 3 done; root causes without action 0 | pass | n/a |  |
| F-CAPA-1-demo-desk.task-fields | Task fields appear only for Maintenance task / Condition monitoring; changing category away hides them | pass | n/a |  |
| F-CAPA-1-demo-desk.categories | Category list offers the 8 categories + Not set | pass | n/a |  |
| F-CAPA-1-demo-desk.kind-switch | Corrective -> Preventive moves a failure-event action onto the first root cause; Preventive -> Corrective keeps its root-cause link and the action moves to the Corrective section | pass | n/a |  |
| F-CAPA-1-demo-desk.delete | Delete action: dialog, cancel keeps, confirm removes; tiles update | pass | n/a |  |
| F-CAPA-1-demo-desk.persist | Actions with kind, category, task survive reload | pass | n/a |  |
| F-CAPA-1-demo-desk.layout | Actions step layout at this width: no overflow, rows fit | pass | n/a |  |
| F-CAPA-1-demo-mob.empty | Empty Actions step: corrective section with "No corrective action yet" prompt, one preventive group per root cause with "No action yet" | pass | n/a |  |
| F-CAPA-1-demo-mob.corrective | Add corrective action: lands in the Corrective section, is linked to "The failure event", editor opens at once | pass | n/a |  |
| F-CAPA-1-demo-mob.preventive | Add preventive action under each root cause: appears in that group only; kind is Preventive | pass | n/a |  |
| F-CAPA-1-demo-mob.one-open | Rows expand in place one at a time: opening another row closes the first; Close button collapses | pass | n/a |  |
| F-CAPA-1-demo-mob.tiles | Tiles: total action cost 800 + 100 + 50 = $950; 0 of 3 done; root causes without action 0 | pass | n/a |  |
| F-CAPA-1-demo-mob.task-fields | Task fields appear only for Maintenance task / Condition monitoring; changing category away hides them | pass | n/a |  |
| F-CAPA-1-demo-mob.categories | Category list offers the 8 categories + Not set | pass | n/a |  |
| F-CAPA-1-demo-mob.kind-switch | Corrective -> Preventive moves a failure-event action onto the first root cause; Preventive -> Corrective keeps its root-cause link and the action moves to the Corrective section | pass | n/a |  |
| F-CAPA-1-demo-mob.delete | Delete action: dialog, cancel keeps, confirm removes; tiles update | pass | n/a |  |
| F-CAPA-1-demo-mob.persist | Actions with kind, category, task survive reload | pass | n/a |  |
| F-CAPA-1-demo-mob.layout | Actions step layout at this width: no overflow, rows fit | pass | n/a |  |
| F-CAPA-1-acct-desk.empty | Empty Actions step: corrective section with "No corrective action yet" prompt, one preventive group per root cause with "No action yet" | pass | n/a |  |
| F-CAPA-1-acct-desk.corrective | Add corrective action: lands in the Corrective section, is linked to "The failure event", editor opens at once | pass | n/a |  |
| F-CAPA-1-acct-desk.preventive | Add preventive action under each root cause: appears in that group only; kind is Preventive | pass | n/a |  |
| F-CAPA-1-acct-desk.one-open | Rows expand in place one at a time: opening another row closes the first; Close button collapses | pass | n/a |  |
| F-CAPA-1-acct-desk.tiles | Tiles: total action cost 800 + 100 + 50 = $950; 0 of 3 done; root causes without action 0 | pass | n/a |  |
| F-CAPA-1-acct-desk.task-fields | Task fields appear only for Maintenance task / Condition monitoring; changing category away hides them | pass | n/a |  |
| F-CAPA-1-acct-desk.categories | Category list offers the 8 categories + Not set | pass | n/a |  |
| F-CAPA-1-acct-desk.kind-switch | Corrective -> Preventive moves a failure-event action onto the first root cause; Preventive -> Corrective keeps its root-cause link and the action moves to the Corrective section | pass | n/a |  |
| F-CAPA-1-acct-desk.delete | Delete action: dialog, cancel keeps, confirm removes; tiles update | pass | n/a |  |
| F-CAPA-1-acct-desk.persist | Actions with kind, category, task survive reload | pass | n/a |  |
| F-CAPA-1-acct-desk.layout | Actions step layout at this width: no overflow, rows fit | pass | n/a |  |
| F-PLAN-1-demo-desk.empty | No tasks: the plan section explains how tasks appear and has no Copy button | pass | n/a |  |
| F-PLAN-1-demo-desk.lines | Plan lists the 4 tasks with: New/Change, interval text ("every 3 months", "every 500 hours run", "every week", "every 2.5 weeks"), craft, root cause | pass | n/a |  |
| F-PLAN-1-demo-desk.fallbacks | A task with no description uses the action text; no craft shows "Not set" | pass | n/a |  |
| F-PLAN-1-demo-desk.copy | "Copy for the planner" puts tab-separated text with header, 10 columns and one row per task on the clipboard (hand-built expected text) | pass | n/a |  |
| F-PLAN-1-demo-desk.quality-task | Quality: tasks missing description/interval are flagged ("a task description and an interval") | pass | n/a |  |
| F-PLAN-1-demo-desk.report | Report has a "Maintenance plan changes" section with the same tasks | pass | n/a |  |
| F-PLAN-1-demo-desk.persist | Tasks (interval, craft, change) survive reload | pass | n/a |  |
| F-PLAN-1-demo-mob.empty | No tasks: the plan section explains how tasks appear and has no Copy button | pass | n/a |  |
| F-PLAN-1-demo-mob.lines | Plan lists the 4 tasks with: New/Change, interval text ("every 3 months", "every 500 hours run", "every week", "every 2.5 weeks"), craft, root cause | pass | n/a |  |
| F-PLAN-1-demo-mob.fallbacks | A task with no description uses the action text; no craft shows "Not set" | pass | n/a |  |
| F-PLAN-1-demo-mob.copy | "Copy for the planner" puts tab-separated text with header, 10 columns and one row per task on the clipboard (hand-built expected text) | pass | n/a |  |
| F-PLAN-1-demo-mob.quality-task | Quality: tasks missing description/interval are flagged ("a task description and an interval") | pass | n/a |  |
| F-PLAN-1-demo-mob.report | Report has a "Maintenance plan changes" section with the same tasks | pass | n/a |  |
| F-PLAN-1-demo-mob.persist | Tasks (interval, craft, change) survive reload | pass | n/a |  |
| F-PLAN-1-acct-desk.empty | No tasks: the plan section explains how tasks appear and has no Copy button | pass | n/a |  |
| F-PLAN-1-acct-desk.lines | Plan lists the 4 tasks with: New/Change, interval text ("every 3 months", "every 500 hours run", "every week", "every 2.5 weeks"), craft, root cause | pass | n/a |  |
| F-PLAN-1-acct-desk.fallbacks | A task with no description uses the action text; no craft shows "Not set" | pass | n/a |  |
| F-PLAN-1-acct-desk.copy | "Copy for the planner" puts tab-separated text with header, 10 columns and one row per task on the clipboard (hand-built expected text) | pass | n/a |  |
| F-PLAN-1-acct-desk.quality-task | Quality: tasks missing description/interval are flagged ("a task description and an interval") | pass | n/a |  |
| F-PLAN-1-acct-desk.report | Report has a "Maintenance plan changes" section with the same tasks | pass | n/a |  |
| F-PLAN-1-acct-desk.persist | Tasks (interval, craft, change) survive reload | pass | n/a |  |
| F-SPARES-1-demo-desk.fields | Spares check shows only "Was a spare part needed?" until Yes is chosen; then stock, lead time, coverage appear | pass | n/a |  |
| F-SPARES-1-demo-desk.lead-13 | Not in stock, lead time 13 days: flag not shown (threshold is 14) | pass | n/a |  |
| F-SPARES-1-demo-desk.lead-14 | Not in stock, lead time 14 days: flag shown (threshold is 14) | pass | n/a |  |
| F-SPARES-1-demo-desk.lead-60 | Not in stock, lead time 60 days: flag shown (threshold is 14) | pass | n/a |  |
| F-SPARES-1-demo-desk.lead-0 | Not in stock, lead time 0 days: flag not shown (threshold is 14) | pass | n/a |  |
| F-SPARES-1-demo-desk.in-stock | In stock = Yes removes the flag even with 60 days lead time | pass | n/a |  |
| F-SPARES-1-demo-desk.one-tap | "Add a spares holding action": adds a preventive Spares holding action for the first root cause with the asset and lead time in the text; flag text says it is on the list; quality rule clears | pass | n/a |  |
| F-SPARES-1-demo-desk.report | Report shows the Spares check section with the flag line | pass | n/a |  |
| F-SPARES-1-demo-desk.persist | Spares answers survive reload | pass | n/a |  |
| F-SPARES-1-demo-mob.fields | Spares check shows only "Was a spare part needed?" until Yes is chosen; then stock, lead time, coverage appear | pass | n/a |  |
| F-SPARES-1-demo-mob.lead-13 | Not in stock, lead time 13 days: flag not shown (threshold is 14) | pass | n/a |  |
| F-SPARES-1-demo-mob.lead-14 | Not in stock, lead time 14 days: flag shown (threshold is 14) | pass | n/a |  |
| F-SPARES-1-demo-mob.lead-60 | Not in stock, lead time 60 days: flag shown (threshold is 14) | pass | n/a |  |
| F-SPARES-1-demo-mob.lead-0 | Not in stock, lead time 0 days: flag not shown (threshold is 14) | pass | n/a |  |
| F-SPARES-1-demo-mob.in-stock | In stock = Yes removes the flag even with 60 days lead time | pass | n/a |  |
| F-SPARES-1-demo-mob.one-tap | "Add a spares holding action": adds a preventive Spares holding action for the first root cause with the asset and lead time in the text; flag text says it is on the list; quality rule clears | pass | n/a |  |
| F-SPARES-1-demo-mob.report | Report shows the Spares check section with the flag line | pass | n/a |  |
| F-SPARES-1-demo-mob.persist | Spares answers survive reload | pass | n/a |  |
| F-SPARES-1-acct-desk.fields | Spares check shows only "Was a spare part needed?" until Yes is chosen; then stock, lead time, coverage appear | pass | n/a |  |
| F-SPARES-1-acct-desk.lead-13 | Not in stock, lead time 13 days: flag not shown (threshold is 14) | pass | n/a |  |
| F-SPARES-1-acct-desk.lead-14 | Not in stock, lead time 14 days: flag shown (threshold is 14) | pass | n/a |  |
| F-SPARES-1-acct-desk.lead-60 | Not in stock, lead time 60 days: flag shown (threshold is 14) | pass | n/a |  |
| F-SPARES-1-acct-desk.lead-0 | Not in stock, lead time 0 days: flag not shown (threshold is 14) | pass | n/a |  |
| F-SPARES-1-acct-desk.in-stock | In stock = Yes removes the flag even with 60 days lead time | pass | n/a |  |
| F-SPARES-1-acct-desk.one-tap | "Add a spares holding action": adds a preventive Spares holding action for the first root cause with the asset and lead time in the text; flag text says it is on the list; quality rule clears | pass | n/a |  |
| F-SPARES-1-acct-desk.report | Report shows the Spares check section with the flag line | pass | n/a |  |
| F-SPARES-1-acct-desk.persist | Spares answers survive reload | pass | n/a |  |
| F-QUAL-1-demo-desk.natural | natural-deterioration-unmanaged: verified + natural wear with no maintenance task or condition monitoring action is flagged; jump -> Actions; a Condition monitoring action on its branch clears it | pass | n/a |  |
| F-QUAL-1-demo-desk.forced-no-flag | The same cause marked Forced (not natural) is not flagged by that rule; toggling the type of wear off clears it | pass | n/a |  |
| F-QUAL-1-demo-desk.task-incomplete | task-missing-detail: a maintenance task with no interval is flagged; entering the interval clears it | pass | n/a |  |
| F-QUAL-1-demo-desk.system-systemic | system-root-without-systemic-action: a System/Latent root cause whose only (categorised) action is a Repair is flagged; a Procedure action clears it; uncategorised actions are not judged | pass | n/a |  |
| F-QUAL-1-demo-desk.corrective-only | corrective-without-preventive: a root cause that has only a corrective action is flagged (high); adding a preventive one clears it; jump -> Actions | pass | n/a |  |
| F-QUAL-1-demo-desk.unlinked | action-not-linked: un-flagging the root cause of an action flags it; the action appears under "Not linked to a root cause"; re-linking clears it | pass | n/a |  |
| F-QUAL-1-demo-desk.severity-links | Every new finding has a "Go to ..." button and the panel count matches the number of findings | pass | n/a |  |
| F-QUAL-1-acct-desk.natural | natural-deterioration-unmanaged: verified + natural wear with no maintenance task or condition monitoring action is flagged; jump -> Actions; a Condition monitoring action on its branch clears it | pass | n/a |  |
| F-QUAL-1-acct-desk.forced-no-flag | The same cause marked Forced (not natural) is not flagged by that rule; toggling the type of wear off clears it | pass | n/a |  |
| F-QUAL-1-acct-desk.task-incomplete | task-missing-detail: a maintenance task with no interval is flagged; entering the interval clears it | pass | n/a |  |
| F-QUAL-1-acct-desk.system-systemic | system-root-without-systemic-action: a System/Latent root cause whose only (categorised) action is a Repair is flagged; a Procedure action clears it; uncategorised actions are not judged | pass | n/a |  |
| F-QUAL-1-acct-desk.corrective-only | corrective-without-preventive: a root cause that has only a corrective action is flagged (high); adding a preventive one clears it; jump -> Actions | pass | n/a |  |
| F-QUAL-1-acct-desk.unlinked | action-not-linked: un-flagging the root cause of an action flags it; the action appears under "Not linked to a root cause"; re-linking clears it | pass | n/a |  |
| F-QUAL-1-acct-desk.severity-links | Every new finding has a "Go to ..." button and the panel count matches the number of findings | pass | n/a |  |
| F-DET-1-demo-desk.toggle | Natural, Forced, and tap-again-to-clear behave as radios; default is not decided; help text changes | pass | n/a |  |
| F-DET-1-demo-desk.persist | Deterioration survives reload | pass | n/a |  |
| F-DET-1-demo-desk.panel-top | The failure event itself has no deterioration control | pass | n/a |  |
| F-DET-1-demo-mob.toggle | Natural, Forced, and tap-again-to-clear behave as radios; default is not decided; help text changes | pass | n/a |  |
| F-DET-1-demo-mob.persist | Deterioration survives reload | pass | n/a |  |
| F-DET-1-demo-mob.panel-top | The failure event itself has no deterioration control | pass | n/a |  |
| F-SIM-1-demo-desk.rank | Panel lists S1 (score 100), S2 (41), S3 (6, the minimum) in that order; S4 (one shared word = 3) and S5 are not listed | pass | n/a |  |
| F-SIM-1-demo-desk.reasons | Reasons shown: O1 "Same asset (X-1)", "Same asset type (Gearbox)", "Same failure mode (Bearing failure)"; O2 type+mode but no tag; O3 shared words only | pass | n/a |  |
| F-SIM-1-demo-desk.cause-text | Each match shows its root causes and "What fixed it" text; Open link goes to that investigation | pass | n/a |  |
| F-SIM-1-demo-desk.copy | "Copy this cause into my tree" adds it under the failure event as a Hypothesis (not verified, not a root cause, no evidence); button turns to "Copied"; message with link to the tree | pass | n/a |  |
| F-SIM-1-demo-desk.cause-step-panel | The Cause tree step also shows the Similar past failures panel and a copy there adds under the selected cause | pass | n/a |  |
| F-SIM-1-demo-desk.empty | An investigation with no similar ones shows "No similar failures yet" guidance | pass | n/a |  |
| F-SIM-1-demo-desk.self-excluded | An investigation is never listed as similar to itself and a copy of it (Duplicate) is listed as similar | pass | n/a |  |
| F-SIM-1-demo-mob.rank | Panel lists S1 (score 100), S2 (41), S3 (6, the minimum) in that order; S4 (one shared word = 3) and S5 are not listed | pass | n/a |  |
| F-SIM-1-demo-mob.reasons | Reasons shown: O1 "Same asset (X-1)", "Same asset type (Gearbox)", "Same failure mode (Bearing failure)"; O2 type+mode but no tag; O3 shared words only | pass | n/a |  |
| F-SIM-1-demo-mob.cause-text | Each match shows its root causes and "What fixed it" text; Open link goes to that investigation | pass | n/a |  |
| F-SIM-1-demo-mob.copy | "Copy this cause into my tree" adds it under the failure event as a Hypothesis (not verified, not a root cause, no evidence); button turns to "Copied"; message with link to the tree | pass | n/a |  |
| F-SIM-1-demo-mob.cause-step-panel | The Cause tree step also shows the Similar past failures panel and a copy there adds under the selected cause | pass | n/a |  |
| F-SIM-1-demo-mob.empty | An investigation with no similar ones shows "No similar failures yet" guidance | pass | n/a |  |
| F-SIM-1-demo-mob.self-excluded | An investigation is never listed as similar to itself and a copy of it (Duplicate) is listed as similar | pass | n/a |  |
| F-SIM-1-acct-desk.rank | Panel lists S1 (score 100), S2 (41), S3 (6, the minimum) in that order; S4 (one shared word = 3) and S5 are not listed | pass | n/a |  |
| F-SIM-1-acct-desk.reasons | Reasons shown: O1 "Same asset (X-1)", "Same asset type (Gearbox)", "Same failure mode (Bearing failure)"; O2 type+mode but no tag; O3 shared words only | pass | n/a |  |
| F-SIM-1-acct-desk.cause-text | Each match shows its root causes and "What fixed it" text; Open link goes to that investigation | pass | n/a |  |
| F-SIM-1-acct-desk.copy | "Copy this cause into my tree" adds it under the failure event as a Hypothesis (not verified, not a root cause, no evidence); button turns to "Copied"; message with link to the tree | pass | n/a |  |
| F-SIM-1-acct-desk.cause-step-panel | The Cause tree step also shows the Similar past failures panel and a copy there adds under the selected cause | pass | n/a |  |
| F-SIM-1-acct-desk.empty | An investigation with no similar ones shows "No similar failures yet" guidance | pass | n/a |  |
| F-SIM-1-acct-desk.self-excluded | An investigation is never listed as similar to itself and a copy of it (Duplicate) is listed as similar | pass | n/a |  |
| F-ROLL-1-demo-desk.encourage | Before verification the panel says "Best done once the fix is verified" | pass | n/a |  |
| F-ROLL-1-demo-desk.rank | Candidates: P-102, P-215, P-103 in that order; the centrifugal pump P-210 and the asset itself are not listed | pass | n/a |  |
| F-ROLL-1-demo-desk.reasons | Reasons: P-102 same make+model, similar duty (slurry, feed, concentrator), criticality A; P-103 similar make (warman) and criticality B | pass | n/a |  |
| F-ROLL-1-demo-desk.create | Tick P-102 and P-215, default text prefilled from root causes and preventive actions, create 2 checks; ticked ones show "Check created" and can no longer be picked | pass | n/a |  |
| F-ROLL-1-demo-desk.statuses | Result options: Open, Checked: no issue, Checked: same problem found, Fixed; progress counts finished ones; "same problem" shows the red notice | pass | n/a |  |
| F-ROLL-1-demo-desk.edit-check | Per-check owner, due date and "what to check" can be edited; delete asks for confirmation | pass | n/a |  |
| F-ROLL-1-demo-desk.dashboard | Dashboard "Rollout checks" tile: open count and "of N created" (hand: 2 created, 0 open now) | pass | n/a |  |
| F-ROLL-1-demo-desk.dashboard-open | Setting one back to Open and one to same problem: tile shows 1 open and "1 found the same problem" | pass | n/a |  |
| F-ROLL-1-demo-desk.report | Report section "Rollout to similar assets" lists the checks with their results | pass | n/a |  |
| F-ROLL-1-demo-desk.verified-message | When the fix is verified the panel says "The fix is verified. This is the moment to spread it" | pass | n/a |  |
| F-ROLL-1-demo-desk.needs-type | With no asset type set the panel asks for it and offers "Go to Asset details" | pass | n/a |  |
| F-ROLL-1-demo-desk.no-candidates | A type with no other assets shows the empty guidance and the "add a similar asset" form | pass | n/a |  |
| F-ROLL-1-demo-mob.encourage | Before verification the panel says "Best done once the fix is verified" | pass | n/a |  |
| F-ROLL-1-demo-mob.rank | Candidates: P-102, P-215, P-103 in that order; the centrifugal pump P-210 and the asset itself are not listed | pass | n/a |  |
| F-ROLL-1-demo-mob.reasons | Reasons: P-102 same make+model, similar duty (slurry, feed, concentrator), criticality A; P-103 similar make (warman) and criticality B | pass | n/a |  |
| F-ROLL-1-demo-mob.create | Tick P-102 and P-215, default text prefilled from root causes and preventive actions, create 2 checks; ticked ones show "Check created" and can no longer be picked | pass | n/a |  |
| F-ROLL-1-demo-mob.statuses | Result options: Open, Checked: no issue, Checked: same problem found, Fixed; progress counts finished ones; "same problem" shows the red notice | pass | n/a |  |
| F-ROLL-1-demo-mob.edit-check | Per-check owner, due date and "what to check" can be edited; delete asks for confirmation | pass | n/a |  |
| F-ROLL-1-demo-mob.dashboard | Dashboard "Rollout checks" tile: open count and "of N created" (hand: 2 created, 0 open now) | pass | n/a |  |
| F-ROLL-1-demo-mob.dashboard-open | Setting one back to Open and one to same problem: tile shows 1 open and "1 found the same problem" | pass | n/a |  |
| F-ROLL-1-demo-mob.report | Report section "Rollout to similar assets" lists the checks with their results | pass | n/a |  |
| F-ROLL-1-demo-mob.verified-message | When the fix is verified the panel says "The fix is verified. This is the moment to spread it" | pass | n/a |  |
| F-ROLL-1-demo-mob.needs-type | With no asset type set the panel asks for it and offers "Go to Asset details" | pass | n/a |  |
| F-ROLL-1-demo-mob.no-candidates | A type with no other assets shows the empty guidance and the "add a similar asset" form | pass | n/a |  |
| F-ROLL-1-acct-desk.encourage | Before verification the panel says "Best done once the fix is verified" | pass | n/a |  |
| F-ROLL-1-acct-desk.rank | Candidates: P-102, P-215, P-103 in that order; the centrifugal pump P-210 and the asset itself are not listed | pass | n/a |  |
| F-ROLL-1-acct-desk.reasons | Reasons: P-102 same make+model, similar duty (slurry, feed, concentrator), criticality A; P-103 similar make (warman) and criticality B | pass | n/a |  |
| F-ROLL-1-acct-desk.create | Tick P-102 and P-215, default text prefilled from root causes and preventive actions, create 2 checks; ticked ones show "Check created" and can no longer be picked | pass | n/a |  |
| F-ROLL-1-acct-desk.statuses | Result options: Open, Checked: no issue, Checked: same problem found, Fixed; progress counts finished ones; "same problem" shows the red notice | pass | n/a |  |
| F-ROLL-1-acct-desk.edit-check | Per-check owner, due date and "what to check" can be edited; delete asks for confirmation | pass | n/a |  |
| F-ROLL-1-acct-desk.dashboard | Dashboard "Rollout checks" tile: open count and "of N created" (hand: 2 created, 0 open now) | pass | n/a |  |
| F-ROLL-1-acct-desk.dashboard-open | Setting one back to Open and one to same problem: tile shows 1 open and "1 found the same problem" | pass | n/a |  |
| F-ROLL-1-acct-desk.report | Report section "Rollout to similar assets" lists the checks with their results | pass | n/a |  |
| F-ROLL-1-acct-desk.verified-message | When the fix is verified the panel says "The fix is verified. This is the moment to spread it" | pass | n/a |  |
| F-ROLL-1-acct-desk.needs-type | With no asset type set the panel asks for it and offers "Go to Asset details" | pass | n/a |  |
| F-ROLL-1-acct-desk.no-candidates | A type with no other assets shows the empty guidance and the "add a similar asset" form | pass | n/a |  |
| F-SAMPLE-1.verify | Verify step of the sample: before $238,440, after $0, saving $238,440 (verified), action cost $32,000, payback 1.6 months (32,000 / (238,440 / 12) = 1.61) | pass | n/a |  |
| F-SAMPLE-1.actions | Sample actions tile: total cost $32,000, all done, none overdue | pass | n/a |  |
| F-SAMPLE-1.report | Sample report headline: loss $238,440, verified saving $238,440, action cost $32,000, payback 1.6 months, plus maintenance plan and rollout sections | pass | n/a |  |
| F-SAMPLE-1.quality | Sample passes the quality check (All clear) including the new rules | pass | n/a |  |
| F-SAMPLE-1.assets | Register of a fresh demo browser has the 5 sample assets | pass | n/a |  |
| F-SAMPLE-1.dashboard | Dashboard totals for the sample: verified savings $238,440 with cash $57,000 + opportunity $181,440 | pass | n/a |  |
| F-SAMPLE-2.fixture | The v1 fixture is an old sample (action 1 cost $28,000, no asset fields) | pass | n/a |  |
| F-SAMPLE-2.unedited | Unedited v1 sample stored in the browser is replaced by the current sample (cost $32,000, saving $238,440, asset tag P-101, quality All clear), same id, nothing else lost | pass | n/a |  |
| F-SAMPLE-2.edited-title | A v1 sample whose title was edited (even one character) is left alone: still old numbers | pass | n/a |  |
| F-SAMPLE-2.edited-action | A v1 sample with one action cost changed is left alone | pass | n/a |  |
| F-SAMPLE-2.edited-note | A v1 sample with an evidence note changed is left alone | pass | n/a |  |
| F-SAMPLE-2.collapsed-only | A v1 sample where only a tree node was collapsed (UI state, not an edit) is still upgraded | pass | n/a |  |
| F-SAMPLE-2.reset-restores | Reset sample data on an edited old sample restores the current sample (asks for confirmation) | pass | n/a |  |
| F-SAMPLE-3.unedited | Writing the unedited v1 sample into the account row, then loading the dashboard: row is upgraded to the current sample | pass | n/a |  |
| F-SAMPLE-3.edited | An edited v1 sample row stays as the user left it (old $60,000 total, edited title kept) | pass | n/a |  |
| F-SEC-1.hdr_ | Security headers present on / | pass | n/a |  |
| F-SEC-1.hdr_login | Security headers present on /login | pass | n/a |  |
| F-SEC-1.hdr_signup | Security headers present on /signup | pass | n/a |  |
| F-SEC-1.hdr_forgot_password | Security headers present on /forgot-password | pass | n/a |  |
| F-SEC-1.hdr_reset_password | Security headers present on /reset-password | pass | n/a |  |
| F-SEC-1.hdr_app | Security headers present on /app | pass | n/a |  |
| F-SEC-1.hdr_app_assets | Security headers present on /app/assets | pass | n/a |  |
| F-SEC-1.hdr_app_account | Security headers present on /app/account | pass | n/a |  |
| F-SEC-1.hdr_app_investigations_sample_p101 | Security headers present on /app/investigations/sample-p101 | pass | n/a |  |
| F-SEC-1.hdr_nope | Security headers present on /nope | pass | n/a |  |
| F-SEC-1.csp-content | CSP forbids framing, objects, off-site forms, base-uri tricks and allows only own origin + the Supabase host for connections | pass | n/a |  |
| F-SEC-1.hsts | HSTS header is sent when served over HTTPS (not applicable on plain http://localhost) | pass | n/a |  |
| F-SEC-1.inline-script-blocked | An injected inline <script> is not blocked by CSP (script-src allows inline): record behaviour | pass | n/a |  |
| F-SEC-1.external-blocked | A script or image from another origin is blocked by CSP | pass | n/a |  |
| F-SEC-1.frame-blocked | The app cannot be framed (X-Frame-Options/frame-ancestors): an <iframe> of the page in a data: page stays empty | pass | n/a |  |
| F-SEC-1.walk | Walking every page and step (demo) produces no CSP violations or console errors | pass | n/a |  |
| F-SEC-2.image-types | Evidence photo: JPEG and PNG accepted; SVG, GIF, WebP, BMP and a renamed text file are refused with a message | pass | n/a |  |
| F-SEC-2.malformed-row | A malformed stored row shows "This investigation could not be read" with a Delete control and does not break the rest of the dashboard | pass | n/a |  |
| F-SEC-2.malformed-open | Opening an unreadable investigation by URL shows "Investigation not found"/unreadable message instead of crashing | pass | n/a |  |
| F-SEC-2.partial-row | A row missing optional new fields or with wrong types in them still opens (tolerant parsing), without losing the readable parts | pass | n/a |  |
| F-SEC-2.password-rule-hint | Sign-up and Change password show the rule "At least 8 characters. Not a very common password, and not your email address." | pass | n/a |  |
| F-SEC-2.password-rule | Sign-up form refuses common passwords (password123, 12345678, Password1, rootloop1) and password = email, accepts a strong one client-side (nothing is submitted) | pass | n/a |  |
| F-SEC-2.password-rule-reset | Reset-password and the weak-length rule: 7 characters refused | pass | n/a |  |
| F-ACCT-1.demo-page | Demo mode /app/account explains demo mode, offers Download my data and Clear browser data, and has no password/delete controls | pass | n/a |  |
| F-ACCT-1.demo-download | Demo "Download my data" produces a JSON file with the sample investigation and the register (valid JSON, no secrets) | pass | n/a |  |
| F-ACCT-1.demo-clear | Clear browser data: cancel keeps data, confirm removes everything and a fresh sample comes back | pass | n/a |  |
| F-ACCT-1.acct-sections | Signed in: account page shows the email, Download my data, Change password and Delete my account sections | pass | n/a |  |
| F-ACCT-1.acct-menu-link | The account menu links to the account page | pass | n/a |  |
| F-ACCT-1.acct-download | Signed-in download: valid JSON with the account's investigations and assets, the account email, and no credentials | pass | n/a |  |
| F-ACCT-1.pw-validation | Change password: empty, mismatch, too short, common password and "same as email" are refused; nothing is sent; the real password is NOT changed | pass | n/a |  |
| F-ACCT-1.delete-gate | Delete my account: button disabled until the exact phrase is typed; wrong phrases keep it disabled; NO deletion is performed | pass | n/a |  |
| F-ACCT-1.acct-signed-out | Signed out, Change password / Delete are not offered and /app/account does not expose account data | pass | n/a |  |
| F-ACCT-1.global-signout | Sign out ends the session in ALL tabs/devices: after signing out in tab 1, tab 2 loses its session on next use | pass | n/a |  |
| F-SEC-3.png-shown | A valid PNG data URL is shown | pass | n/a |  |
| F-SEC-3.block-svg | Stored image "svg" is not rendered as an <img src> | pass | n/a |  |
| F-SEC-3.block-js | Stored image "js" is not rendered as an <img src> | pass | n/a |  |
| F-SEC-3.block-http | Stored image "http" is not rendered as an <img src> | pass | n/a |  |
| F-SEC-3.block-html | Stored image "html" is not rendered as an <img src> | pass | n/a |  |
| F-SEC-3.no-exec | Nothing executed (no window.__x) | pass | n/a |  |
| F-UI-1-demo-desk.page_app_assets | /app/assets: labelled controls, no overflow, one h1, one main | pass | n/a |  |
| F-UI-1-demo-desk.page_app_account | /app/account: labelled controls, no overflow, one h1, one main | pass | n/a |  |
| F-UI-1-demo-desk.sample-steps | Sample investigation: every step incl. Actions with plan/spares and Verify with rollout: labelled controls and no overflow | pass | n/a |  |
| F-UI-1-demo-desk.keyboard | Actions step reachable by keyboard: Tab reaches an action row button and Enter expands it | pass | n/a |  |
| F-UI-1-demo-desk.tap-size | Actions rows and key buttons are at least 40px tall on touch layouts | pass | n/a |  |
| F-UI-1-demo-desk.console | No console errors, failed requests or CSP violations on these pages | pass | n/a |  |
| F-UI-1-demo-mob.page_app_assets | /app/assets: labelled controls, no overflow, one h1, one main | pass | n/a |  |
| F-UI-1-demo-mob.page_app_account | /app/account: labelled controls, no overflow, one h1, one main | pass | n/a |  |
| F-UI-1-demo-mob.sample-steps | Sample investigation: every step incl. Actions with plan/spares and Verify with rollout: labelled controls and no overflow | pass | n/a |  |
| F-UI-1-demo-mob.keyboard | Actions step reachable by keyboard: Tab reaches an action row button and Enter expands it | pass | n/a |  |
| F-UI-1-demo-mob.tap-size | Actions rows and key buttons are at least 40px tall on touch layouts | pass | n/a |  |
| F-UI-1-demo-mob.console | No console errors, failed requests or CSP violations on these pages | pass | n/a |  |
| F-UI-1-acct-desk.page_app_assets | /app/assets: labelled controls, no overflow, one h1, one main | pass | n/a |  |
| F-UI-1-acct-desk.page_app_account | /app/account: labelled controls, no overflow, one h1, one main | pass | n/a |  |
| F-UI-1-acct-desk.sample-steps | Sample investigation: every step incl. Actions with plan/spares and Verify with rollout: labelled controls and no overflow | pass | n/a |  |
| F-UI-1-acct-desk.keyboard | Actions step reachable by keyboard: Tab reaches an action row button and Enter expands it | pass | n/a |  |
| F-UI-1-acct-desk.tap-size | Actions rows and key buttons are at least 40px tall on touch layouts | pass | n/a |  |
| F-UI-1-acct-desk.console | No console errors, failed requests or CSP violations on these pages | pass | n/a |  |
| F-ZZ-CLEANUP.clean-A | Account A: only the sample investigation and the 5 sample assets remain | pass | n/a |  |
| F-ZZ-CLEANUP.clean-B | Account B: only the sample investigation and the 5 sample assets remain | pass | n/a |  |
| F-LIMIT-1.too-large | Saving a ~6 MB investigation shows "this investigation is too large" with Try again, keeps the app usable, and nothing oversized is stored | pass | n/a |  |
| F-LIMIT-1.next-0 | login ?next=//evil.example never leaves this site (a request to evil.example is intercepted and counted) | pass | n/a |  |
| F-LIMIT-1.next-1 | login ?next=https://evil.example/x never leaves this site (a request to evil.example is intercepted and counted) | pass | n/a |  |
| F-LIMIT-1.next-2 | login ?next=/\evil.example never leaves this site (a request to evil.example is intercepted and counted) | pass | n/a |  |
| F-LIMIT-1.next-3 | login ?next=javascript:alert(1) never leaves this site (a request to evil.example is intercepted and counted) | pass | n/a |  |
| F-LIMIT-1.next-4 | login ?next=/%2F%2Fevil.example never leaves this site (a request to evil.example is intercepted and counted) | pass | n/a |  |
| F-LIMIT-1.next-5 | login ?next=/app/../..//evil.example never leaves this site (a request to evil.example is intercepted and counted) | **FAIL** | n/a | OPEN REDIRECT: after sign-in the browser went to http://evil.example/ |
| F-LIMIT-1.next-6 | login ?next=/%5Cevil.example never leaves this site (a request to evil.example is intercepted and counted) | pass | n/a |  |
| F-LIMIT-1.next-7 | login ?next=data:text/html,hi never leaves this site (a request to evil.example is intercepted and counted) | pass | n/a |  |
| F-LIMIT-1.next-8 | login ?next=/app%0d%0aLocation:%20https://evil.example never leaves this site (a request to evil.example is intercepted and counted) | pass | n/a |  |
| F-LIMIT-1.next-dots-921 | login ?next=/app/..//evil.example (dot segments that normalise to //evil.example) stays on this site | **FAIL** | n/a | OPEN REDIRECT: after sign-in the browser went to http://evil.example/ |
| F-LIMIT-1.next-dots-925 | login ?next=/app/%2e%2e//evil.example (dot segments that normalise to //evil.example) stays on this site | **FAIL** | n/a | OPEN REDIRECT: after sign-in the browser went to http://evil.example/ |
| F-LIMIT-1.next-dots-917 | login ?next=/..//evil.example (dot segments that normalise to //evil.example) stays on this site | **FAIL** | n/a | OPEN REDIRECT: after sign-in the browser went to http://evil.example/ |
| F-LIMIT-1.next-dots-923 | login ?next=/a/../../evil.example/x (dot segments that normalise to //evil.example) stays on this site | **FAIL** | n/a | CSP violations during test: Applying inline style violates the following Content Security Policy directive 'style-src 'self''. Either the 'u |
| A-00 | Setup: sign in as user A and user B (also: wrong-password test counts as A-AUTH) | pass | pass |  |
| A-AUTH-1.login-empty | Login: empty submit shows "Enter your email address." and "Enter your password." | pass | pass |  |
| A-AUTH-1.login-malformed | Login: malformed emails ("abc", "a@b", "a b@c.com", "a@b.c") are rejected client-side | pass | pass |  |
| A-AUTH-1.login-wrong-pw | Login: wrong password shows friendly message, stays on /login, no token stored | pass | pass |  |
| A-AUTH-1.login-unknown-user | Login: unknown email gives the same message (no account enumeration) | pass | pass |  |
| A-AUTH-1.login-ui | Login: password field is masked, inline error clears after fixing, Enter submits | pass | pass |  |
| A-AUTH-1.signup-empty | Signup: empty submit shows email + password errors (nothing sent) | pass | pass |  |
| A-AUTH-1.signup-weak | Signup: weak/short password (7 chars) rejected; mismatch rejected; hint visible | pass | pass |  |
| A-AUTH-1.signup-malformed | Signup: malformed email rejected | pass | pass |  |
| A-AUTH-1.signup-common-pw | Signup: 8-char all-numeric password "12345678" - client accepts (server decides); not submitted | pass | pass |  |
| A-AUTH-1.forgot-validation | Forgot password: empty and malformed email rejected, nothing sent | pass | pass |  |
| A-AUTH-1.reset-no-token | Reset password without a valid link shows "Reset link not valid" and a working "Request a new link" | pass | pass |  |
| A-AUTH-1.reset-bad-token | Reset password with garbage hash token does not crash and shows the invalid-link state | pass | pass |  |
| A-AUTH-1.auth-links | Auth page links: login<->signup, login->forgot, forgot->login, "Try the demo"->/app, logo | pass | pass |  |
| A-AUTH-1.signed-out-app | Signed out: /app and /app/investigations/<id> open in demo mode (banner shown), no redirect | pass | pass |  |
| A-AUTH-1.next-param | Login ?next= only honours same-site paths (open-redirect check): //evil.com and https://evil.com ignored | pass | pass |  |
| A-AUTH-1.next-valid | Login ?next=/app/investigations/sample-p101 returns there after sign in | pass | pass |  |
| A-AUTH-1.confirmed-banner | Login ?confirmed=1 shows "Email confirmed" notice | pass | pass |  |
| A-SESS-1.menu | Account menu shows user A email; menu has "My investigations" and "Sign out"; Escape and outside-click close it | pass | pass |  |
| A-SESS-1.no-banner | No demo banner when signed in | pass | pass |  |
| A-SESS-1.reload | Session survives reload and a fresh navigation (still user A, same data) | pass | pass |  |
| A-SESS-1.login-redirect | Visiting /login or /signup while signed in redirects to /app | pass | pass |  |
| A-SESS-1.sample-seeded | Account has its own seeded sample with the same hand-calculated totals as demo ($238,440 saved, round 3 sample) | pass | pass |  |
| A-SESS-1.landing-sample-link | Landing "Open the sample investigation" maps to the account sample when signed in | pass | pass |  |
| A-SESS-1.demo-separate | Demo-mode data is separate: signing out shows demo store, not account data | pass | pass |  |
| A-SESS-1.signed-out-no-cache | After sign out, reloading does not show account data (token removed) | pass | pass |  |
| A-PERF-1.budget | Dashboard shows data within 3000 ms (median 1063 ms) | pass | pass |  |
| A-E2E-1.problem | Problem step accepts all 8 fields | pass | pass |  |
| A-E2E-1.loss-calc | Loss live calc equals hand calc (lost units, lost margin, cost/event, annual loss) | pass | pass |  |
| A-E2E-1.evidence | Evidence: 3 items listed, types and "Not linked" shown | pass | pass |  |
| A-E2E-1.tree-leaf-delete | Deleting a leaf cause needs no confirmation and removes it | pass | pass |  |
| A-E2E-1.tree-nodes | Tree has 7 causes covering Physical, Human and System / Latent | pass | pass |  |
| A-E2E-1.actions-tiles | Actions tiles: total cost, 0 of 2 done, 1 overdue, 0 roots unlinked | pass | pass |  |
| A-E2E-1.verify-calc | Verify step money equals hand calc (before, after, saving, cost, payback) | pass | pass |  |
| A-E2E-1.reload-report | After full reload the account data gives the hand-calculated report | pass | pass |  |
| A-E2E-1.dash | Dashboard (account): loss $0, open 0, overdue 0, saved 238,440 + 10,350 = $248,790, new row Closed | pass | pass |  |
| A-E2E-1.print | Print emulation of the account report hides app chrome (account menu, header) | pass | pass |  |
| A-E2E-1.autosave-xss | Special characters round-trip through the database as text | pass | pass |  |
| A-ISO-1.b-list | User B dashboard does not list user A's investigation (B sees only own sample) | pass | pass |  |
| A-ISO-1.b-direct | User B opening A's investigation URL directly gets "Investigation not found" (no data leaked) | pass | pass |  |
| A-ISO-1.b-direct-sample | User B opening A's sample id gets not found (B's sample id differs) | pass | pass |  |
| A-ISO-1.b-write | User B cannot modify A's row via the API (RLS): PATCH/DELETE affect 0 rows | pass | pass |  |
| A-ISO-1.a-still-ok | After B's attempts, A's investigation is intact | pass | pass |  |
| A-ISO-1.signed-out-direct | Signed out (demo) opening A's account URL gets "not found" (no account data without login) | pass | pass |  |
| A-ISO-1.b-delete-own-dup | User B duplicate of own sample stays in B only | pass | pass |  |
| A-ISO-1.a-list-no-b | User A does not see B's duplicate | pass | pass |  |
| A-PERS-1.problem-loss | Problem + Loss survive reload (account) | pass | pass |  |
| A-PERS-1.evidence-tree-actions-verify | Evidence, tree (flags, links, collapse), actions, verification survive reload (account) | pass | pass |  |
| A-PERS-1.fast-reload | Edit then reload within 60 ms - edit still saved (flush on pagehide) | pass | pass |  |
| A-PERS-1.autosave-states | Autosave indicator shows Saving... then All changes saved on account writes | pass | pass |  |
| A-PERS-1.two-tabs | Two tabs/devices: a stale tab must never silently wipe the other tab's edit; it is refused with "Load the latest version" / "Keep mine and overwrite" (round 2 design) | pass | pass |  |
| A-PERS-1.concurrent-window | Account: two tabs edit different fields within the same save window: no silent loss (both saved, or a conflict banner and nothing overwritten) | pass | pass |  |
| A-PERS-1.conflict-load-latest | "Load the latest version" shows the other tab's data and clears the banner | pass | pass |  |
| A-PERS-1.conflict-keep-mine | "Keep mine and overwrite" saves this tab's version and clears the banner | pass | pass |  |
| A-PERS-1.conflict-offline-no-banner | A plain network failure is still the "Could not save" error, not a conflict banner | pass | pass |  |
| A-PERS-1.duplicate-delete | Duplicate then delete (cancel / confirm) in account mode | pass | pass |  |
| A-PERS-1.reset-sample | Reset sample data in account: edit sample, reset, original restored, own data untouched | pass | pass |  |
| A-OFF-1.offline-error | Going offline and editing shows a readable save error with "Try again" | pass | pass |  |
| A-OFF-1.offline-keeps-typing | More edits while offline are kept in the page (not discarded), other steps usable | pass | pass |  |
| A-OFF-1.retry-offline | "Try again" while still offline keeps the error (no false "saved") | pass | pass |  |
| A-OFF-1.beforeunload | Leaving with unsaved offline edits triggers the browser "unsaved changes" prompt | pass | pass |  |
| A-OFF-1.recover | Back online: "online" event flushes and the indicator returns to "All changes saved" | pass | pass |  |
| A-OFF-1.recover-persisted | After recovery a reload shows the offline-typed values (nothing lost) | pass | pass |  |
| A-OFF-1.auto-retry | Offline error auto-retries (about 8 s) once the network returns even without a new edit or the online event | pass | pass |  |
| A-OFF-1.offline-dashboard | Dashboard while offline shows a readable error (no blank crash) | pass | pass |  |
| A-OFF-1.offline-create | Creating a new investigation while offline shows an error and does not navigate | pass | pass |  |
| A-OFF-1.offline-load | Opening an investigation while offline does not claim it is missing/deleted | pass | pass |  |
| A-OFF-1.offline-open-existing | Network failing during investigation open: page says "not found / deleted" misleadingly? (observed) | pass | pass |  |
| A-SIGNOUT-1.flush-online | Typing then immediately signing out saves the edit first (online) | pass | pass |  |
| A-SIGNOUT-1.offline-signout | Offline unsaved edit then Sign out: warns "Some changes could not be saved"; Cancel keeps session; "Sign out anyway" signs out | pass | pass |  |
| A-MOB-1.dash | 375px signed-in dashboard: no overflow, long email truncated | pass | pass |  |
| A-MOB-1.menu | 375px account menu fits on screen | pass | pass |  |
| A-MOB-1.ws | 375px signed-in workspace: all steps no overflow | pass | pass |  |
| A-ERR-1 | Signed in: no console errors or failed requests on dashboard and all steps | pass | pass |  |
| A-RESET-1.atomic | A failed reset must not leave the account without its sample | pass | pass |  |
| A-LOSS-1.reload | After reload: shares 48/32/20, recovery note, holding cost, two other cost lines and annual loss $20,462 | pass | pass |  |
| A-LOSS-1.verify-report | Verify and Report show expected saving $12,641 (cash $8,801 + opportunity $3,840), payback 4.7 months | pass | pass |  |
| A-LOSS-1.dashboard | Account dashboard: the S3 row is $20,462 with split $14,702 / $5,760; the loss tile rises by exactly that; verified tile does not change until closed | pass | pass |  |
| A-LOSS-1.close-dashboard | After closing S3 the verified tile rises by exactly $12,641 (cash +$8,801, opportunity +$3,840) and the loss tile drops by $20,462 | pass | pass |  |
| A-EMPTY-1.no-dialog | Click "Load the sample investigation": no dialog, sample appears, exactly one | pass | pass |  |
| A-EMPTY-1.double-load | Double-clicking "Load the sample" does not create two samples | pass | pass |  |
| A-ZZ-CLEANUP.clean-A | Account A left with only the seeded sample (and sample assets) | pass | pass |  |
| A-ZZ-CLEANUP.clean-B | Account B left with only the seeded sample (and sample assets) | pass | pass |  |

## 4. Observations recorded during the run (local)
- (observation) "1,000" -> "7", "1e3" -> "7"
- (observation) No validation for an event date in the future (2999-12-31 accepted silently)
- (observation) Review date before event date: no validation
- (observation) Step changes use history.replaceState, so Back leaves the investigation instead of going to the previous step; after Forward the step shown is Report
- (observation) Blank "Untitled investigation" rows remain if user creates and abandons: 5
- (observation) Quality: Fix first The loss is not quantified yet. Still needed: events per year, downtime hours per event, production rate, margin per unit. Go to Loss | Fix first No cause is flagged as a root cause yet. Go to Cause tree | Should fix Problem statement is missing: title, asset, site or area, date of event, what happened, where, when, impact. Go to Problem | Should fix This branch stops at a Physical cause: "Only root". Ask "why?" again to find the System / Latent cause beneath. Go to Cause tree | Should fix Action "Action X" is not linked to a root cause (its cause was removed or is no longer flagged as a root cause). Link it to a root cause or delete it. Go to Actions ; report has action text: true
- (observation) Corrupt demo data is silently shown as "No investigations yet" and overwritten on the next save (no warning)
- (observation) Downtime 0 with repair/other costs entered: annual loss shows $13,202
- (observation) malformed record verify text: ANNUAL LOSS BEFORE $13,600 Cash $9,600 · Opportunity $4,000 ANNUAL LOSS AFTER $4,533 $2,267 × 2. Cash $3,200 · Opportunity $1,333 EXPECTED SAVING (NOT YET VERIFIED) $9,067 Cash $6,400 · Opportunity $2,667. Counts as verified, and in the dashboard total, only when all actions are done and the review 
- (observation) Downtime 0 with repair/other costs entered: annual loss shows $13,202
- (observation) malformed record verify text: ANNUAL LOSS BEFORE $13,600 Cash $9,600 · Opportunity $4,000 ANNUAL LOSS AFTER $4,533 $2,267 × 2. Cash $3,200 · Opportunity $1,333 EXPECTED SAVING (NOT YET VERIFIED) $9,067 Cash $6,400 · Opportunity $2,667. Counts as verified, and in the dashboard total, only when all actions are done and the review 
- (observation) A task with an interval but no task description is listed in the plan using the action text, yet the quality check still says it needs a task description: true
- (observation) A task with an interval but no task description is listed in the plan using the action text, yet the quality check still says it needs a task description: true
- (observation) A task with an interval but no task description is listed in the plan using the action text, yet the quality check still says it needs a task description: true
- (observation) script-src allows 'unsafe-inline' (needed by the framework bootstrap); style-src is 'self' with style-src-attr 'unsafe-inline'
- (observation) Strict-Transport-Security not checked on http://localhost; verify on the deployed HTTPS site
- (observation) dynamically injected inline script executes: true
- (observation) image upload results: {"a.png":{"img":true,"alert":"New investigation · RootLoop"},"b.jpg":{"img":true,"alert":"New investigation · RootLoop"},"c.gif":{"img":true,"alert":"New investigation · RootLoop"},"d.svg":{"img":true,"alert":"New investigation · RootLoop"},"e.webp":{"img":false,"alert":"That image could not be read. Try a JPEG or PNG.|New investigation · RootLoop"},"f.png":{"img":false,"alert":"That image could not be read. Try a JPEG or PNG.|New investigation · RootLoop"},"g.txt":{"img":false,"alert":"That file is not an image.|New investigation · RootLoop"},"h.bmp":{"img":false,"alert":"That image could not be read. Try a JPEG or PNG.|New investigation · RootLoop"}}
- (observation) SVG and GIF files are accepted and re-encoded to a JPEG data URL (rasterised, script in the SVG did not run): svg=true gif=true
- (observation) signup password "password123": refused
- (observation) signup password "12345678": refused
- (observation) signup password "Password1": refused
- (observation) signup password "rootloop1": refused
- (observation) signup password "QWERTYUI": refused
- (observation) delete phrase: DELETE
- (observation) device 2 refresh token after global sign-out: HTTP 400; the page itself stays signed in until its access token expires (<= 1 h)
- (observation) stored image handling: {"ok1":["data:image/png;base64,iVBORw0K"],"svg":[],"js":[],"http":[],"big":["data:image/png;base64,AAAAAAAA"],"html":[]}
- (observation) mobile Actions control heights (px): 36,99,119
- (observation) oversize message: Could not save: this investigation is too large. Remove some photos from the evidence list and try again. Try again
- (observation) oversize message: Could not save: this investigation is too large. Remove some photos from the evidence list and try again. Try again
- (observation) Client-side password rule is length only (min 8); strength is left to the server. Not submitted to avoid creating an account.
- (timing) Signed-in dashboard load ms (7 cold-context runs): 1052, 1042, 1063, 1115, 1276, 919, 1221; median 1063; min 919; max 1276
- (observation) fast reload: beforeunload prompt shown=true, value after=QA: Gearbox seizure on conveyor C-7
- (observation) two tabs: conflict banner shown=1; DB after: title="ACC TAB1" asset="Conveyor C-7 gearbox"
- (timing) Offline: error appears 40 ms after pressing Try again (indicator reads "Saving…" meanwhile)
- (observation) A-LOSS-1 tiles before closing: ANNUAL LOSS UNDER INVESTIGATION $34,262 Open investigations, per year Cash $21,902 · Opportunity $12,360 | OPEN ACTIONS 2 Not yet done | OVERDUE ACTIONS 0 Past their due date | VERIFIED ANNUAL SAVINGS $248,790 Closed investigations only: failure confirmed stopped Cash $62,400 · Opportunity $186,390 | ROLLOUT CHECKS 0 Open. Spread a proven fix to similar assets

## 5. Observations recorded during the run (live)
- (observation) "1,000" -> "7", "1e3" -> "7"
- (observation) No validation for an event date in the future (2999-12-31 accepted silently)
- (observation) Review date before event date: no validation
- (observation) Step changes use history.replaceState, so Back leaves the investigation instead of going to the previous step; after Forward the step shown is Report
- (observation) Blank "Untitled investigation" rows remain if user creates and abandons: 5
- (observation) Quality: Fix first The loss is not quantified yet. Still needed: events per year, downtime hours per event, production rate, margin per unit. Go to Loss | Fix first No cause is flagged as a root cause yet. Go to Cause tree | Should fix Problem statement is missing: title, asset, site or area, date of event, what happened, where, when, impact. Go to Problem | Should fix This branch stops at a Physical cause: "Only root". Ask "why?" again to find the System / Latent cause beneath. Go to Cause tree | Should fix Action "Action X" is not linked to a root cause (its cause was removed or is no longer flagged as a root cause). Link it to a root cause or delete it. Go to Actions ; report has action text: true
- (observation) Corrupt demo data is silently shown as "No investigations yet" and overwritten on the next save (no warning)
- (observation) Downtime 0 with repair/other costs entered: annual loss shows $13,202
- (observation) malformed record verify text: ANNUAL LOSS BEFORE $13,600 Cash $9,600 · Opportunity $4,000 ANNUAL LOSS AFTER $4,533 $2,267 × 2. Cash $3,200 · Opportunity $1,333 EXPECTED SAVING (NOT YET VERIFIED) $9,067 Cash $6,400 · Opportunity $2,667. Counts as verified, and in the dashboard total, only when all actions are done and the review 
- (observation) Downtime 0 with repair/other costs entered: annual loss shows $13,202
- (observation) malformed record verify text: ANNUAL LOSS BEFORE $13,600 Cash $9,600 · Opportunity $4,000 ANNUAL LOSS AFTER $4,533 $2,267 × 2. Cash $3,200 · Opportunity $1,333 EXPECTED SAVING (NOT YET VERIFIED) $9,067 Cash $6,400 · Opportunity $2,667. Counts as verified, and in the dashboard total, only when all actions are done and the review 
- (observation) Client-side password rule is length only (min 8); strength is left to the server. Not submitted to avoid creating an account.
- (timing) Signed-in dashboard load ms (7 cold-context runs): 1572, 1500, 1525, 1591, 1607, 1784, 1571; median 1572; min 1500; max 1784
- (observation) fast reload: beforeunload prompt shown=true, value after=QA: Gearbox seizure on conveyor C-7
- (observation) two tabs: conflict banner shown=1; DB after: title="ACC TAB1" asset="Conveyor C-7 gearbox"
- (timing) Offline: error appears 47 ms after pressing Try again (indicator reads "Saving…" meanwhile)
- (observation) A-LOSS-1 tiles before closing: ANNUAL LOSS UNDER INVESTIGATION $34,262 Open investigations, per year Cash $21,902 · Opportunity $12,360 | OPEN ACTIONS 2 Not yet done | OVERDUE ACTIONS 0 Past their due date | VERIFIED ANNUAL SAVINGS $209,050 Closed investigations only: failure confirmed stopped Cash $52,900 · Opportunity $156,150
