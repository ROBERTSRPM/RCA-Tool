# Test plan and results

Run against `http://localhost:3555` (production build, port 3555). Desktop 1440x900 and mobile 375x812. Demo mode and signed in (accounts A and B).
**192 tests run, 171 passed, 21 failed** (leaf checks; parent groups not double counted). Failures map to defects in defects.md.

## 1. Control inventory
Every interactive control found by `inventory.js` (raw lists in results/inventory.json). "Result" = outcome of the exercising test.

| Page / step | Control | Exercised by | Result |
|---|---|---|---|
| Landing | Logo link, Open the app, Sign in, Create account, Open the sample investigation, Start a new investigation | D-LAND-1 | pass |
| Landing | footer text | D-LAND-1.footer | FAIL (DEF-12) |
| /login | Email, Password, Sign in, Forgot your password?, Create a free account, Try the demo, logo | A-AUTH-1 | pass |
| /login | "Send the confirmation email again" (only after unconfirmed-email error) | NOT TESTED: needs an unconfirmed account; no account may be created | n/a |
| /signup | Email, Password, Confirm password, Create account (invalid input only), Sign in, Try the demo | A-AUTH-1 | pass (valid submit NOT TESTED by rule) |
| /forgot-password | Email, Send reset link (validation only), Back to sign in | A-AUTH-1 | pass (real submit NOT TESTED: would email a fake address) |
| /reset-password | invalid-link state, Request a new link; New password form | A-AUTH-1 reset-no-token / reset-bad-token | pass (password form NOT TESTED: needs a real email link) |
| /app dashboard | Reset sample data, New investigation, Open, Duplicate, Delete, confirm dialog (Cancel/Delete/Escape/backdrop), Load the sample investigation, empty state | D-DASH-2, A-PERS-1, A-ISO-1 | pass |
| /app dashboard | 4 totals tiles, row figures, status badges | D-DASH-1, D-E2E-1, A-E2E-1 | pass except DEF-02 |
| Header | Logo, Investigations, Home, Sign in, Create account, account menu (My investigations, Sign out) | D-LAND-1, A-SESS-1, A-SIGNOUT-1 | pass |
| Demo banner | Create a free account, Sign in links | A-AUTH-1.signed-out-app | pass |
| Import offer banner (Copy to my account / No thanks) | NOT TESTED: appears only for an account with browser demo data on first sign-in and stores a one-time flag; the pre-existing accounts have been used before | n/a |
| Workspace | All investigations link, 7 stepper buttons, Back/Next buttons, save indicator, Try again, Quality panel toggle + every Go to link | D-E2E-1, D-QC-1, A-OFF-1 | pass except DEF-08 |
| 1 Problem | Title, Asset, Site/area, Date of event, What happened?, Where, When, Impact | D-E2E-1.problem, D-PERS-1.problem, D-EDGE-DATE | pass |
| 2 Loss | Events/yr, Downtime, Production rate, Unit name, Margin, Repair cost, Currency + live calc | D-E2E-1.loss-calc, D-EDGE-NUM | pass except DEF-07 |
| 3 Evidence | Add evidence (both), Edit/Done, Delete (+confirm), Title, Type (6 options), Date, Note, Upload photo, Replace/Remove photo | D-E2E-1, D-EDGE-EVID | pass |
| 4 Cause tree | Tabs Tree/5 Whys/Fishbone, Expand all, Collapse all, Ask the first Why?, box select, text box, toolbar Why?/Sibling/Move up/Move down/Collapse/Expand/Delete/Details, +N hidden chip, category radios (3), status radios (3), root-cause checkbox, evidence checkboxes, Go to Evidence | D-TREE-1, D-TREE-2, D-E2E-1, D-QC-1 | pass |
| 5 Whys view | chain boxes, sibling chips, Dig-deeper buttons, Add another Why | D-TREE-2.whys, whys-add | pass |
| Fishbone view | 3 columns, node cards | D-TREE-2.fish, fish-sum | pass |
| 5 Actions | Add action (both), Fixes this root cause, What will be done?, Owner, Due date, Status, Cost, Delete (+confirm), per-root Add action, Go to the cause tree | D-E2E-1, D-PERS-1, D-EDGE-ACT | pass except DEF-03 |
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
| Dashboard load time | A-PERF-1 (median ? ms) |

## 3. Results (all checks)
| ID | Check | Result | Detail |
|---|---|---|---|
| D-LAND-1.hdr | Landing shows headline, 3 benefit cards, video placeholder | pass |  |
| D-LAND-1.logo | Logo link goes to the landing page / app | pass |  |
| D-LAND-1.open-app | "Open the app" -> /app | pass |  |
| D-LAND-1.signin | "Sign in" header link -> /login | pass |  |
| D-LAND-1.create-acct | "Create account" header link -> /signup | pass |  |
| D-LAND-1.sample | "Open the sample investigation" opens the sample workspace | pass |  |
| D-LAND-1.start-new | "Start a new investigation" creates one and opens it | pass |  |
| D-LAND-1.footer | Footer copy is accurate now that accounts exist | **FAIL** | Footer says: "Your data stays in this browser for now. Sample figures are illustrative." although sign-in with cloud storage exists |
| D-DASH-1.totals | Totals: loss under investigation $0 (sample is closed), 0 open, 0 overdue, saved $198,700 | pass |  |
| D-DASH-1.row | Sample row shows $238,440, Closed, sample chip | pass |  |
| D-DASH-2.dup | Duplicate creates "Copy of ..." and opens it | pass |  |
| D-DASH-2.dup-numbers | Duplicate keeps the money identical (both rows $238,440) | pass |  |
| D-DASH-2.del-cancel | Delete + Cancel keeps the investigation | pass |  |
| D-DASH-2.del-esc | Delete dialog closes on Escape and on backdrop click | pass |  |
| D-DASH-2.del-confirm | Delete + confirm removes it | pass |  |
| D-DASH-2.reset-sample | Reset sample data: cancel keeps edits; confirm restores original | pass |  |
| D-DASH-2.reset-keeps-own | Reset sample leaves own investigations untouched | pass |  |
| D-DASH-2.empty | Delete everything -> empty state, then "Load the sample investigation" restores it | pass |  |
| D-DASH-2.empty-new | Empty state "Start a new investigation" button works | pass |  |
| D-E2E-1.problem | Problem step accepts all 8 fields | pass |  |
| D-E2E-1.loss-calc | Loss live calc equals hand calc (lost units, lost margin, cost/event, annual loss) | pass |  |
| D-E2E-1.evidence | Evidence: 3 items listed, types and "Not linked" shown | pass |  |
| D-E2E-1.tree-leaf-delete | Deleting a leaf cause needs no confirmation and removes it | pass |  |
| D-E2E-1.tree-nodes | Tree has 7 causes covering Physical, Human and System / Latent | pass |  |
| D-E2E-1.actions-tiles | Actions tiles: total cost, 0 of 2 done, 1 overdue, 0 roots unlinked | pass |  |
| D-E2E-1.qc-midway | Quality check lists "needs action" findings before verification (cause without system cause etc.) | pass |  |
| D-E2E-1.dash-1 | Dashboard totals (open work, unverified): loss $13,800, open 2, overdue 1, saved $198,700 | pass |  |
| D-E2E-1.verify-calc | Verify step money equals hand calc (before, after, saving, cost, payback) | pass |  |
| D-E2E-1.dash-2 | Verified savings must not count while actions are still open (review says "no recurrence" but 2 actions not done) | **FAIL** | saving counted before actions are complete: expected "$198,700" but got "$209,050" |
| D-E2E-1.dash-3 | Dashboard after closing: loss $0, open 0, overdue 0, saved $209,050; row says Closed | pass |  |
| D-E2E-1.report | Report content matches data and hand-calculated figures | pass |  |
| D-E2E-1.report-ruledout | Report marks ruled-out cause and category/evidence tags | pass |  |
| D-E2E-1.reload | After reload the report is identical (everything persisted) | pass |  |
| D-E2E-1.print | Print emulation: app chrome hidden, report visible, A4 PDF renders | pass |  |
| D-TREE-1.empty | Empty tree shows "Start here" prompt and failure-event box; Tree has no Expand/Collapse all | pass |  |
| D-TREE-1.child-focus | Add child: new box is selected and its text box has keyboard focus | pass |  |
| D-TREE-1.order | Siblings are inserted directly after the source (one, two, three) | pass |  |
| D-TREE-1.top-no-sibling | Failure event has no Sibling / Move / Delete buttons | pass |  |
| D-TREE-1.edit | Edit text of a selected cause persists in the box and panel | pass |  |
| D-TREE-1.move | Move up/down reorders; buttons disabled at the ends | pass |  |
| D-TREE-1.status-cat | Category and status radios switch and reflect aria-checked | pass |  |
| D-TREE-1.collapse | Collapse hides children with "+N hidden" chip; Expand and chip restore them | pass |  |
| D-TREE-1.collapse-all | Collapse all / Expand all toggle every branch | pass |  |
| D-TREE-1.del-parent-cancel | Delete cause with children: confirm names the count; Cancel keeps all | pass |  |
| D-TREE-1.del-parent-confirm | Delete with children + confirm removes the whole branch; parent becomes selected | pass |  |
| D-TREE-1.del-linked-action | Deleting a root cause that has an action warns and unlinks the action | pass |  |
| D-TREE-1.details-btn | "Details" toolbar button is present and scrolls to the panel without error | pass |  |
| D-TREE-2.tree-count | Tree view of the sample shows all 19 causes + failure event | pass |  |
| D-TREE-2.whys | 5 Whys: chain = path to selected cause; "Because" arrows; sibling chips switch; deeper buttons | pass |  |
| D-TREE-2.whys-add | 5 Whys "Add another Why" adds a child of the last box and selects it | pass |  |
| D-TREE-2.fish | Fishbone: three category columns with counts; text edit appears in Tree | pass |  |
| D-TREE-2.fish-sum | Fishbone column counts sum to the number of causes (excl. failure event) | pass |  |
| D-TREE-2.fish-empty | Fishbone with no causes shows empty guidance | pass |  |
| D-TREE-2.tab-state | Tab aria-selected tracks the active view | pass |  |
| D-QC-1.blank | Blank investigation: problem-missing, loss-not-quantified, no-causes findings; panel opens on desktop | pass |  |
| D-QC-1.jump-problem | Rule problem-missing: "Go to Problem" opens Problem step | pass |  |
| D-QC-1.clear-problem | Rule problem-missing clears when all 8 fields are filled | pass |  |
| D-QC-1.partial-problem | Rule problem-missing lists only the remaining fields | pass |  |
| D-QC-1.jump-loss | Rule loss-not-quantified: "Go to Loss" opens Loss step | pass |  |
| D-QC-1.loss-partial | Loss finding shrinks as inputs are entered, then clears | pass |  |
| D-QC-1.loss-zero | Loss inputs of 0 still count as "not quantified" | pass |  |
| D-QC-1.no-root | Rule no-root-cause (tree started): "No cause is flagged as a root cause yet" and jump -> Cause tree | pass |  |
| D-QC-1.no-latent | Rule branch-without-system-cause: Physical leaf flagged; jump selects that node | pass |  |
| D-QC-1.no-latent-human | Rule branch-without-system-cause also fires for a Human leaf, not for ruled-out | pass |  |
| D-QC-1.verified-no-ev | Rule verified-without-evidence: needs Verified + no evidence; shown in panel warning only when evidence exists | pass |  |
| D-QC-1.evidence-clears | Linking evidence clears verified-without-evidence | pass |  |
| D-QC-1.system-clears | Adding a System cause beneath the Human leaf clears the branch rule; flagging root cause clears no-root-cause | pass |  |
| D-QC-1.root-no-action | Rule root-cause-without-action: appears, jump -> Actions | pass |  |
| D-QC-1.action-incomplete | Rule action-missing-owner-or-date: both missing, then owner only, then clears | pass |  |
| D-QC-1.overdue | Rule action-overdue: past due + not done flags; "today" is not overdue; Done clears it | pass |  |
| D-QC-1.verify-missing | Rule done-without-verification: all done + unreviewed; jump -> Verify; clears when reviewed | pass |  |
| D-QC-1.recurred | Rule failure-recurred: "Yes" flags; Verify shows alert + "Reopen the cause tree" -> Cause tree; jump -> Cause tree | pass |  |
| D-QC-1.all-clear | With everything fixed the panel shows "All clear" | pass |  |
| D-QC-1.sort | Findings are sorted High first, then Medium | pass |  |
| D-QC-1.toggle | Quality panel header toggles open/closed (aria-expanded) | pass |  |
| D-PERS-1.autosave-states | Autosave indicator: "Saving..." after typing, then "All changes saved" | pass |  |
| D-PERS-1.problem | Problem fields survive reload (all 8) | pass |  |
| D-PERS-1.url-hash | Reload keeps the current step via the #hash | pass |  |
| D-PERS-1.loss | Loss inputs, unit and currency survive reload | pass |  |
| D-PERS-1.evidence | Evidence add / edit / delete survive reload | pass |  |
| D-PERS-1.tree | Tree structure, text, category, status, root flag, evidence link, collapse survive reload | pass |  |
| D-PERS-1.tree-move-delete | Tree move and delete survive reload | pass |  |
| D-PERS-1.actions | Actions add / edit / status / delete survive reload | pass |  |
| D-PERS-1.verify | Verification fields survive reload | pass |  |
| D-PERS-1.fast-reload | Edit then reload within 100 ms (before the 350 ms debounce) does not lose the edit | pass |  |
| D-PERS-1.nav-away | Edit then click "All investigations" immediately keeps the edit | pass |  |
| D-PERS-1.title-doc | Browser tab title follows the investigation title | **FAIL** | RootLoop: the root cause tool that closes the loop |
| D-PERS-1.two-tabs | Two tabs editing different fields of one investigation do not overwrite each other | **FAIL** | after both tabs saved: title="NAV EDIT" asset="TAB2 ASSET" (last writer replaced the whole problem object) |
| D-EDGE-NUM.letters | Letters are rejected in number fields | pass |  |
| D-EDGE-NUM.negative | Negative numbers cannot be entered (minus key ignored) - no explanation shown | pass |  |
| D-EDGE-NUM.paste-comma | Pasting "1,000" or "1e3" is silently rejected (field keeps previous value) | pass |  |
| D-EDGE-NUM.decimals | Decimals ".5", "5.", "0.001" accepted; live calc rounds to 2 dp | pass |  |
| D-EDGE-NUM.zero-loss | All zeros: annual loss $0, no NaN/Infinity anywhere | pass |  |
| D-EDGE-NUM.huge | Huge values (1e20) format without NaN/scientific and without horizontal overflow | **FAIL** | mobile overflow with huge numbers: scrollWidth 1237 > 375 (annual loss shows "$999,999,800,000,010,000,000,000,000,000,000,000,000,000,000,000,000,000") |
| D-EDGE-NUM.currency | Currency: max 4 chars; empty falls back to $; unit empty falls back to "units" | pass |  |
| D-EDGE-NUM.payback-after-empty | Verify: events after = "" -> saving Not entered, payback n/a (no divide-by-zero) | pass |  |
| D-EDGE-NUM.payback-after=events (saving 0) | Verify: events after = "4" -> saving $0, payback n/a (no divide-by-zero) | pass |  |
| D-EDGE-NUM.payback-after>events (negative saving) | Verify: events after = "6" -> saving -$6,900, payback n/a (no divide-by-zero) | pass |  |
| D-EDGE-NUM.payback-after=0 | Verify: events after = "0" -> saving $13,800, payback 1.9 months (no divide-by-zero) | pass |  |
| D-EDGE-NUM.payback-after=1 | Verify: events after = "1" -> saving $10,350, payback 2.5 months (no divide-by-zero) | pass |  |
| D-EDGE-NUM.payback-zero-cost | Action cost 0 with saving: payback "under 0.1 months" | pass |  |
| D-EDGE-NUM.report-no-after | Report without an after figure says "Not yet" and explains | pass |  |
| D-EDGE-TEXT.overflow-problem | 375px: "Problem" step has no horizontal page overflow with 3000-char words | pass |  |
| D-EDGE-TEXT.overflow-loss | 375px: "Loss" step has no horizontal page overflow with 3000-char words | **FAIL** | scrollWidth 1244 > clientWidth 375 |
| D-EDGE-TEXT.overflow-evidence | 375px: "Evidence" step has no horizontal page overflow with 3000-char words | **FAIL** | scrollWidth 42456 > clientWidth 375 |
| D-EDGE-TEXT.overflow-cause | 375px: "Cause tree" step has no horizontal page overflow with 3000-char words | pass |  |
| D-EDGE-TEXT.overflow-actions | 375px: "Actions" step has no horizontal page overflow with 3000-char words | pass |  |
| D-EDGE-TEXT.overflow-verify | 375px: "Verify" step has no horizontal page overflow with 3000-char words | pass |  |
| D-EDGE-TEXT.overflow-report | 375px: "Report" step has no horizontal page overflow with 3000-char words | **FAIL** | scrollWidth 42583 > clientWidth 375 |
| D-EDGE-TEXT.views | 5 Whys and Fishbone views with long text: no page overflow | **FAIL** | Fishbone overflow 42499>375 |
| D-EDGE-TEXT.dash-overflow | Dashboard with long/special title: no overflow | pass |  |
| D-EDGE-TEXT.no-xss | No script ran, no dialog opened, no injected elements anywhere | pass |  |
| D-EDGE-TEXT.as-text | Special text is shown literally in the report and survives a round trip | pass |  |
| D-EDGE-TEXT.delete-msg | Delete dialog shows the hostile title as text | pass |  |
| D-EDGE-TEXT.doc-title | document.title contains the title as plain text | **FAIL** | RootLoop: the root cause tool that closes the loop |
| D-EDGE-DATE.past-future-event | Event dates 1900-01-01 and 2999-12-31 are accepted and shown formatted | pass |  |
| D-EDGE-DATE.future-event-flag | Future event date (after today) is not flagged by the quality check | pass |  |
| D-EDGE-DATE.clear-date | Clearing the date makes the quality check list "date of event" again | pass |  |
| D-EDGE-DATE.overdue-done | Past due date on a Done action is not overdue; on an Open action it is; dashboard counts it | pass |  |
| D-EDGE-DATE.review-before-event | Review date earlier than the event date is accepted without any warning (observation) | pass |  |
| D-EDGE-NAV.bad-id | Invalid investigation id shows "Investigation not found" with a working link back | pass |  |
| D-EDGE-NAV.weird-ids | Ids with special characters (%00, <script>, very long, ../) do not crash the page | pass |  |
| D-EDGE-NAV.unknown-route | Unknown route /nope and /app/investigations/ return a 404 page | pass |  |
| D-EDGE-NAV.bad-hash | Unknown #hash falls back to the Problem step | pass |  |
| D-EDGE-NAV.deep-link | Deep links #report and #cause open those steps | pass |  |
| D-EDGE-NAV.back-fwd | Browser back/forward: dashboard -> workspace -> steps -> back returns to dashboard, forward returns to workspace | pass |  |
| D-EDGE-NAV.bfcache-edit | Back to the dashboard after editing shows the edited title | pass |  |
| D-EDGE-NAV.dblclick-dashboard | Double-clicking "New investigation" creates exactly one investigation | **FAIL** | created 2: expected 1 but got 2 |
| D-EDGE-NAV.dblclick-dashboard-human | Human-speed double click (2 clicks 120 ms apart) on "New investigation" creates exactly one | pass |  |
| D-EDGE-NAV.hashchange | Changing only the #hash in the address bar of an open investigation switches the step | **FAIL** | hashchange ignored; still on Loss: expected "Report" but got "Loss" |
| D-EDGE-NAV.dblclick-landing | Double-clicking "Start a new investigation" on the landing page creates exactly one | **FAIL** | created 2: expected 1 but got 2 |
| D-EDGE-NAV.dblclick-dup | Double-clicking Duplicate creates exactly one copy | **FAIL** | created 2: expected 1 but got 2 |
| D-EDGE-NAV.rapid-new-nav | Pressing "New investigation" then browser Back immediately leaves no half-created junk beyond one blank | pass |  |
| D-EDGE-ACT.hidden-after-unflag | After the only root cause is un-flagged the existing action is still visible and editable | **FAIL** | Actions step shows 0 action cards (it shows "Flag a root cause first") although 1 action with cost $500 still exists |
| D-EDGE-ACT.hidden-still-counted | Hidden action still counts in quality findings, report and dashboard (data and UI disagree) | pass |  |
| D-EDGE-EVID.upload | Upload a 3000x2000 PNG: preview appears, button changes to "Replace photo", stored as JPEG <= 800px | pass |  |
| D-EDGE-EVID.non-image | Non-image file shows "That file is not an image." alert | pass |  |
| D-EDGE-EVID.photo-persist-report | Photo persists after reload and appears in the report | pass |  |
| D-EDGE-EVID.remove-photo | "Remove photo" removes the image | pass |  |
| D-EDGE-EVID.link-delete | Delete evidence linked to a cause: confirm says "linked to 1 cause"; after confirm the cause chip/link is gone | pass |  |
| D-EDGE-EVID.evidence-types | All six evidence types selectable and shown in the list/report | pass |  |
| D-EDGE-STORE.corrupt | Corrupt localStorage JSON: app does not crash (shows empty state) and recovers when a new investigation is created | pass |  |
| D-EDGE-STORE.blocked | localStorage unavailable (throws): app still works in memory for the session | pass |  |
| D-EDGE-STORE.quota | Storage full: edit shows a readable "Browser storage is full" error with Try again | pass |  |
| D-ERR-1.pages-desktop | desktop: console + network clean on all 7 pages | pass |  |
| D-ERR-1.steps-desktop | desktop: console + network clean while visiting all 7 steps and 3 cause views | pass |  |
| D-ERR-1.pages-mobile | mobile: console + network clean on all 7 pages | pass |  |
| D-ERR-1.steps-mobile | mobile: console + network clean while visiting all 7 steps and 3 cause views | pass |  |
| D-A11Y-1.names | Every input/select/textarea has an accessible name (all pages) | pass |  |
| D-A11Y-1.btn-names | Every button/link has an accessible name | pass |  |
| D-A11Y-1.lang | <html lang> is set and exactly one <h1> per page | pass |  |
| D-A11Y-1.titles | Each page has its own <title> | pass |  |
| D-A11Y-1.dup-ids | No duplicate element ids | pass |  |
| D-A11Y-1.ws-names | Workspace: all 7 steps have labelled inputs and named buttons | pass |  |
| D-A11Y-1.stepper-name | Stepper button accessible names read naturally ("Problem, complete" not "Problem(complete)") | **FAIL** | name "Problem(complete)" has no separator before (complete) |
| D-A11Y-1.small-targets | Interactive controls are at least 24x24 CSS px (WCAG 2.2 min) on every step | **FAIL** | Problem: expected [] but got ["Create a free account 146x17","Sign in 46x17","All investigations 136x20"] |
| D-A11Y-1.contrast-desktop | Text contrast >= 4.5:1 (3:1 large) on all pages (desktop) | **FAIL** | values differ: expected {} but got {"/":[{"t":"Your data stays in this browser for now.","ratio":4.23,"size":14,"fg":"lab(48.0876 -2.03595 -16.5814)","bg":"rgb( |
| D-A11Y-1.focus-visible | Keyboard focus is visibly indicated on buttons, links, inputs (outline or ring) | pass |  |
| D-A11Y-1.keyboard-main | Dashboard main controls reachable by Tab: New investigation, Open, Duplicate, Delete, Reset sample | pass |  |
| D-A11Y-1.keyboard-tree | Cause tree: boxes reachable and selectable by keyboard (Tab + Enter), toolbar then reachable | pass |  |
| D-A11Y-1.keyboard-modal | Confirm dialog: focus moves into it, Escape closes, focus returns to trigger | **FAIL** | focus escaped the modal dialog after Tab (no focus trap) |
| D-A11Y-1.modal-focus-return | After closing the dialog with Escape focus returns to the button that opened it | **FAIL** | focus is on: BODY |
| D-A11Y-1.account-menu-kbd | Skip link / landmarks: page has a <main> landmark on dashboard and workspace | **FAIL** | /app/investigations/sample-p101 <main> count: expected 1 but got 0 |
| D-MOB-1.page_ | 375px /: no overflow / off-screen content | pass |  |
| D-MOB-1.page_login | 375px /login: no overflow / off-screen content | pass |  |
| D-MOB-1.page_signup | 375px /signup: no overflow / off-screen content | pass |  |
| D-MOB-1.page_forgot_password | 375px /forgot-password: no overflow / off-screen content | pass |  |
| D-MOB-1.page_reset_password | 375px /reset-password: no overflow / off-screen content | pass |  |
| D-MOB-1.page_app | 375px /app: no overflow / off-screen content | pass |  |
| D-MOB-1.page_app_investigations_sample_p101 | 375px /app/investigations/sample-p101: no overflow / off-screen content | pass |  |
| D-MOB-1.step-Problem | 375px sample "Problem" step: no overflow / off-screen content | pass |  |
| D-MOB-1.step-Loss | 375px sample "Loss" step: no overflow / off-screen content | pass |  |
| D-MOB-1.step-Evidence | 375px sample "Evidence" step: no overflow / off-screen content | pass |  |
| D-MOB-1.step-Cause tree | 375px sample "Cause tree" step: no overflow / off-screen content | pass |  |
| D-MOB-1.step-Actions | 375px sample "Actions" step: no overflow / off-screen content | pass |  |
| D-MOB-1.step-Verify | 375px sample "Verify" step: no overflow / off-screen content | pass |  |
| D-MOB-1.step-Report | 375px sample "Report" step: no overflow / off-screen content | pass |  |
| D-MOB-1.cause-views | 375px cause views (5 Whys, Fishbone, Tree with selected node + panel): no overflow | pass |  |
| D-MOB-1.tap-targets | 375px: primary controls are at least 40px tall (touch) | pass |  |
| D-MOB-1.stepper-scroll | 375px: stepper scrolls horizontally and the active step stays in view | pass |  |
| D-MOB-1.mobile-print-buttons | 375px: Back/Next buttons do not overlap content | pass |  |
| D-MOB-E2E.problem | Problem step accepts all 8 fields | pass |  |
| D-MOB-E2E.loss-calc | Loss live calc equals hand calc (lost units, lost margin, cost/event, annual loss) | pass |  |
| D-MOB-E2E.evidence | Evidence: 3 items listed, types and "Not linked" shown | pass |  |
| D-MOB-E2E.tree-leaf-delete | Deleting a leaf cause needs no confirmation and removes it | pass |  |
| D-MOB-E2E.tree-nodes | Tree has 7 causes covering Physical, Human and System / Latent | pass |  |
| D-MOB-E2E.actions-tiles | Actions tiles: total cost, 0 of 2 done, 1 overdue, 0 roots unlinked | pass |  |
| D-MOB-E2E.verify-calc | Verify step money equals hand calc (before, after, saving, cost, payback) | pass |  |
| D-MOB-E2E.report-mobile | Mobile report shows the same headline numbers | pass |  |
| D-MOB-E2E.tree-mobile | Mobile tree with 7 nodes: no page overflow, tree scroll container used | pass |  |
| A-ZZ-CLEANUP.clean-A | Account A left with only the seeded sample | pass |  |
| A-ZZ-CLEANUP.clean-B | Account B left with only the seeded sample | pass |  |

## 4. Observations recorded during the run
- (observation) "1,000" -> "7", "1e3" -> "7"
- (observation) No validation for an event date in the future (2999-12-31 accepted silently)
- (observation) Review date before event date: no validation
- (observation) Step changes use history.replaceState, so Back leaves the investigation instead of going to the previous step; after Forward the step shown is Report
- (observation) Blank "Untitled investigation" rows remain if user creates and abandons: 8
- (observation) Quality: Fix first The loss is not quantified yet. Still needed: events per year, downtime hours per event, production rate, margin per unit. Go to Loss | Fix first No cause is flagged as a root cause yet. Go to Cause tree | Should fix Problem statement is missing: title, asset, site or area, date of event, what happened, where, when, impact. Go to Problem | Should fix This branch stops at a Physical cause: "Only root". Ask "why?" again to find the System / Latent cause beneath. Go to Cause tree ; report has action text: true
- (observation) Corrupt demo data is silently shown as "No investigations yet" and overwritten on the next save (no warning)
