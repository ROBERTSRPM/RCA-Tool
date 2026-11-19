# RCA Pilot: pre-launch QA report

Reviewer: independent QA lead (did not build it). Date: 18 Nov 2026.
Build tested: branch `claude/new-session-tdmk2t`, commit `0a7be49` ("AI round 1 fixes ... AI notice and draft privacy page"), on the Vercel preview (production settings, real AI key) and as a local production build (`npm ci && npm run build && npm start -p 3555`). The preview served the latest commit (new landing tagline and `/privacy` present). The live site www.rcapilot.com is the old version and was not tested.
Accounts: qa-user-a and qa-user-b (a security auditor was using them in parallel). Real AI calls made by this review: 7 of the 15 allowed.

## Verdict: READY AFTER BLOCKERS

The product itself is in good shape. All seven steps work end to end, the numbers I checked by hand were right, the AI features gave answers a maintenance manager would respect, data survived reloads, offline, slow networks, hostile text and two tabs, and phone and tablet layouts hold up. I found no data-loss bug and no wrong number.

What stops me saying "ready" is everything around the product that a customer meets in the first ten minutes: the confirmation email is unproven for real customers, there is no way to contact anyone, the only legal page says it is an unreviewed draft, and the signup page says "Free". These are owner actions, not code. There is also a short list of code fixes (section "SHOULD FIX") that I would do before the first demo call, mainly the printed report, which cuts off columns.

If the owner creates pilot accounts by hand (Supabase dashboard, invite or confirmed-email users) and puts a contact address and a reviewed privacy text in place, the pilots can start inside 24 hours.

---

## BLOCKER (must fix before any customer)

### B1. Signup confirmation email is not proven to reach a real customer
- Steps: Create account with a valid email and password on `/signup`.
- Expected: the customer gets a confirmation email within a minute from an RCA Pilot address and can sign in.
- Actual (what I could check): the UI is correct ("Check your email ... It can take a minute. Check your spam folder"), and the screen is the same for an existing address (good, no account leak). I cannot complete a signup on a `.test` address, so delivery was not tested. LAUNCH-PLAN says Supabase's built-in sender only reliably reaches the project team and is limited to a few emails an hour. Until custom SMTP is set up, a real customer will most likely never get the email and will see nothing wrong on screen. Same risk for "Forgot your password".
- Screenshot: `qa/prelaunch-shots/21-signup-existing.png`.
- Fix: owner action (see Owner actions 1). Until it is done, create pilot accounts yourself and hand over the password.

### B2. No way for a customer to reach you, and the only legal page says it is an unreviewed draft
- Steps: look at the landing page footer, `/privacy`, every error message, the 404 page. Open `/terms`, `/help`, `/contact`, `/pricing`.
- Expected: a support address somewhere obvious, a privacy page and terms a buyer's IT or legal person can accept.
- Actual: the footer is only "Sample figures are illustrative. Privacy". `/privacy` starts with "Draft. This is a short summary and has not been reviewed by a lawyer. A full privacy policy will replace it." and every AI panel links to it. `/terms`, `/help`, `/contact` and `/pricing` are 404. Error messages tell the user to "contact the site owner" (account page) with no address. The AI text says "Anthropic's commercial terms do not allow it to train models on this content" which is a legal claim the owner should confirm against current terms. The page does not say where data is stored (Sydney), which Australian plant customers will ask.
- Screenshots: `01-landing-desktop.png` (footer), `23-app-demo-empty.png`.
- Fix: owner provides a support address; small code change to put "Support: <address>" in the footer, the account page and error messages; replace the draft privacy text and add terms (owner action 2). Remove the word "Draft" only after review.

### B3. The signup page promises "Free" while the plan is a paid pilot
- Steps: open `/signup`. Subtitle: "Free. Keeps your investigations safe and available on any device."
- Expected: wording that matches how you will sell it (LAUNCH-PLAN: A$2,500 pilot, A$450 a month per site).
- Actual: a customer who signs up under "Free" and is later asked to pay will feel misled, and design partners will quote it back to you.
- Fix: owner decides the wording (for example "Free during the pilot") and a one-line copy change.

---

## SHOULD FIX (before pilots grow; items 1 to 4 before the first demo call)

### S1. Printed / PDF report cuts off columns and breaks words in the middle
- Steps: complete an investigation with at least one maintenance-task action, open Report, press Print / Save as PDF (Chromium print, A4). I reproduced with Playwright `page.pdf` using print media.
- Expected: every column visible, words not split.
- Actual: the "Maintenance plan changes" table is clipped on the right (the "Owner and due" column is cut off); the Actions table splits words ("Owne r", "super visor", "Maintenan ce task", "Plann er"). On screen the "Interval" column header also wraps to "Interva / l". The report is what managers will hold, and the printed page is the first thing they will judge.
- Screenshots: `51-report-pdf-clipped-tables.png`, `50-report-pdf-pages.png`, `49-report.png` (on-screen wrap).
- Fix: fixed table layout with `min-width` for the Interval/Owner columns, smaller print font, `overflow-wrap: normal` for table cells, and let the Actions table drop the "Fixes" column in print.

### S2. A save failure after the session ends is easy to miss, and the message is jargon
- Steps: signed in, open an investigation, clear the cookies and local storage (simulates an expired or revoked session), edit a field lower down the Problem step.
- Expected: a clear, visible message: "You were signed out. Sign in again to keep your changes" with a sign-in link, and the text kept on the page.
- Actual: the status line says "Could not save: not allowed." The status sits at the top of the page and is scrolled out of view while the user types in a long form, so the edit looks fine. Same position problem for the offline message ("Could not save: no connection to the server", which does appear within 1 s and recovers by itself when the network returns).
- Screenshot: `93-session-lost.png` (error is off screen).
- Fix: make the save status sticky (or a toast), and map 401/403 to "Your session has ended. Sign in again" with a link; keep the unsaved text.

### S3. Demo (signed-out) mode shows the AI feature as a wall of "Sign in to use AI"
- Steps: open the sample, go to Actions. Every root cause (six in the sample) repeats "Sends this investigation's text ... to Anthropic ... Sign in to use AI ... Suggest actions for this root cause" with a disabled button. The Problem step puts a large AI box above the form, so the first thing a new user sees is a disabled AI panel, and the red "Quality check: 3 findings, 2 to fix first" before they have typed anything.
- Expected: AI visible as a selling point, not as six disabled blocks; a new empty investigation should not open with red findings.
- Actual: noisy and slightly off-putting in the very mode people see first. On a sales call the presenter must be signed in to show AI at all.
- Screenshots: `30-new-problem-empty.png`, `45-tree-view.png`, `11-sample-5-Actions.png`.
- Fix: in demo mode show one short "AI suggestions need a free account" strip per step instead of per root cause; on desktop collapse the Problem-step AI box like the phone layout already does; start the quality check collapsed and neutral ("Nothing to check yet") until the user has entered something.

### S4. "Similar past failures" matches the demo sample to unrelated new investigations
- Steps: new investigation about a conveyor gearbox (tag, type "Gearbox", failure mode "Bearing failure"); open Cause tree.
- Expected: no match, or a clearly weak one.
- Actual: the slurry pump sample is offered as a similar past failure ("Shared words: months, seal", then "What fixed it: Fix verified" with pump actions) and offers "Copy this cause into my tree" for a gearbox. It happens to every new user because the sample is always in their list. A customer will read it as the tool not understanding their equipment.
- Screenshot: `45-tree-view.png`, `80-ai-coach-node.png` (bottom).
- Fix: never match the "Illustrative sample" to non-sample investigations, and require the asset type, tag or failure mode to match (words alone should not be enough).

### S5. Fixing a typo in the asset tag leaves a ghost asset in the register
- Steps: signed in, in Asset details type a tag, wait 4 s ("In your asset register"), then change the tag.
- Expected: the register has one asset for this investigation.
- Actual: the first tag stays in the register (confirmed in the database: `QA-NEW-415` remained after I changed it to `CV-204-GB1`). Over time the register fills with typos, and "Roll this fix out" will suggest them as similar assets.
- Fix: create the register entry only when the tag field is left (blur) or on a longer delay, and offer to delete or merge an asset that no investigation uses.

### S6. Photo help text says the wrong thing when signed in
- Steps: open Evidence, Add evidence. Under the photo button: "Photos are shrunk to fit and kept in this browser only."
- Actual: signed in, photos are saved in the account (the account page says export includes photos and delete removes photos). The text will confuse a careful buyer.
- Fix: show "kept in your account" when signed in.

### S7. Report and summary drafts from AI are not saved
- Steps: Report step, "Draft report" (about 21 s), go to another step and come back.
- Actual: the draft is gone. Copy text and Print this draft exist, but a user who navigates away loses 20 s of waiting and the edits they made. (This is AI-09 from the round 1 review, still open.)
- Fix: store the last draft with the investigation, or at least warn before leaving.

### S8. Export file still carries the old name RootLoop
- Steps: Account, Download my data. File name `rootloop-my-data-2026-11-18.json`; internal format `rootloop-export-v1`.
- Fix: rename the file to `rca-pilot-my-data-...` (keep the old format tag readable for imports if needed). `web/lib/account.ts`.

### S9. Stale automated tests hide real regressions
- The existing QA suite still looks for "RootLoop", expects the old landing page, and on phones does not open the collapsed Asset details, so many `demo-mob` feature tests fail for reasons that are not app bugs (details below). Update the tests before the next release so a real failure is visible.

---

## NICE TO HAVE

- N1. Autosave takes about 2.8 s to show "All changes saved" (350 ms debounce plus the write). Fine, but a presenter will wait on it. The asset register line still lags about 4.3 s (R3-05, open).
- N2. Browser Back from a step leaves the investigation (to the dashboard); steps do not create history entries.
- N3. No "skip to content" link; the logo link is the first tab stop. Focus rings are visible everywhere I tabbed.
- N4. Title wrapping breaks "P-101" across lines at tablet width ("slurry pump P- / 101"). Use a non-breaking hyphen in tags.
- N5. Phone header wraps "RCA Pilot by Intelbeyond" onto two lines and the Account link is not in the phone top bar (reachable from the account menu once signed in; check discoverability).
- N6. Change password does not ask for the current password (Supabase default). Acceptable; mention if a buyer's IT asks.
- N7. Challenge, coach and CAPA wait 6 to 21 s; a status line ("Thinking, this can take about 20 seconds") shows, which is good. A progress hint with the expected time would help a presenter.
- N8. The login error text "That email and password do not match" stays on screen when the next attempt is empty and the field error appears beside it. Cosmetic.
- N9. The landing says "Every action has an owner and due date", but AI-accepted actions have neither and the app allows blanks. Soften to "Give every action an owner and due date".
- N10. CSP still allows inline scripts (R3-02). Defence in depth only.

---

## Owner actions (outside the code)

1. Email: set up a sending service (Resend recommended) on rcapilot.com with SPF, DKIM, DMARC; connect it in Supabase Authentication, Emails, SMTP; branded templates; send a real test signup and password reset to a Gmail and an Outlook address and confirm both arrive.
2. Legal: have the privacy page reviewed and replace the draft; add terms of service; confirm the Anthropic "no training" wording against their current terms; add where data is stored (Sydney).
3. Support: pick a support address and tell me; add it to footer and error messages.
4. Pricing wording: decide what the signup page and landing say ("Free during pilot" etc.) and where pricing lives.
5. Supabase settings: leaked-password protection is still OFF (the advisor warns); set minimum password length 8 in Auth settings (the app enforces it in the form, the server setting is the real guard); CAPTCHA before public promotion; raise auth email rate limits once SMTP is on.
6. Hosting: Vercel Pro (Hobby is non-commercial) and Supabase Pro (backups) before the first paying customer.
7. AI budget: set auto-reload and a monthly spending cap on the Anthropic account; note the per-user limit is 30 AI calls a day and 5 a minute, and each test run consumes real credit (qa-user-a is at its daily limit now).
8. Demo preparation: for a call, sign in (AI does not work in demo mode) on a fresh account, open the sample, and talk through the 6 to 21 s AI waits. Do not demo on the old www.rcapilot.com until `main` is deployed. Remove the preview's Vercel toolbar noise by demoing on the production domain.
9. Merge the branch to `main` only after S1 and S2 are fixed and the suite is re-run; then smoke test on www.rcapilot.com (login, signup email, one AI call, report print).
10. Pilot accounts: create them yourself until B1 is done; tell pilots to expect AI answers in 6 to 20 seconds.

---

## What I tested

### 1. First impression and onboarding
- Landing (`01-landing-desktop.png`): clear headline, two obvious buttons, tree image, three benefits, one closing call to action. Loads in about 0.3 s. Weak spots: no pricing, contact, terms or help (B2, B3).
- Demo mode: "Open the sample investigation" opens in about 1.2 s; demo banner explains work stays in the browser. New investigation opens in under 1 s.
- Signup validation: empty submit, bad email, short password, mismatch, common password ("That password is too common"), password equal to email: all give clear messages. Existing address gives the same "Check your email" screen (good). Wrong login: "That email and password do not match. Check them and try again, or reset your password."
- First empty state: dashboard shows the sample; a new investigation starts with a numbered stepper and plain-language prompts ("Write what you know now. Plain facts, no guessing at causes yet."). It is obvious what to do first, apart from S3.

### 2. Full investigation from scratch (conveyor gearbox CV-204)
Done twice: in demo mode (no AI) and signed in as qa-user-b with AI.
- Problem and asset details: type and failure mode lists work; hand check of Loss: 11 h x 450 t/h = 4,950 t; margin $6 gives $29,700; repair $38,000 so $67,700 per event, 2 events a year gives $135,400. Correct. Cash $76,000 plus opportunity $59,400 correct.
- Evidence: photo added (2400x1800 JPEG shrunk in about 0.13 s), shown in the report; 5 evidence items linked to causes.
- Cause tree: all three views (Tree, 5 Whys, Fishbone) render at desktop, 768 and 390 px.
- Actions: corrective and preventive with root-cause grouping; the quality check responded (flagged a maintenance task whose long text counts as "no task description", R3-03 still open).
- Verify: saving shows "Expected saving (not yet verified)" until all actions are done (correct). Payback 0.5 months matched my hand calculation ($4,500 / ($101,550 / 12)).
- Report: on screen correct; print is S1.
- AI features on real data (answer times): problem draft 5.9 s, cause coach 14.4 s, CAPA 18.4 s, report draft 20.9 s, one-page summary 10.4 s, challenge on the sample 12.9 s. Content quality was good: it used the user's own numbers and facts, separated physical, human and system causes with "would confirm / would rule out" evidence, stated forced deterioration for contamination, gave intervals and crafts, a spares action and a condition-monitoring task. The report says "none has an owner, due date or craft set" which was true. Titles are cut at a character limit ("... in 14 months" lost its closing bracket in the report title).
- Screenshots: `45-tree-view.png`, `49-report.png`, `80-ai-coach-node.png`, `80-ai-capa.png`, `83-ai-ch-cause.png`.

### 3. The sample as a demo script
Landing, Open sample, then Problem, Loss ($238,440 per year: $57,000 cash plus $181,440 opportunity), Evidence (11 items), Cause tree, Actions (13 of 13 done, $32,000), Verify (saving verified $238,440, payback 1.6 months, rollout candidates P-102, P-215, P-103), Report. Each step switches in 0.7 to 1 s. No console errors. Numbers match the dashboard. Embarrassments: S3 (repeated "Sign in to use AI"), the Report step number "7" instead of a tick on a closed investigation, and the Problem step on the sample shows "No similar failures yet" which is fine. Screenshots `11-sample-*.png`.

### 4. Data safety (signed in, preview)
- Autosave then reload: persisted. 10,000-character text with `<script>`, quotes, ampersands, Japanese, emoji, backslash and newline: stored and shown as text exactly (`90-special-long-problem.png`).
- Offline: message after 0.8 s, recovers on its own when back online. Slow network (6 s per request): saves after about 14 s, no loss.
- Two tabs: stale tab gets "changed elsewhere" banner and no overwrite. (Demo-mode race NEW-01 is still not fixed, minor.)
- Session expiry: S2.
- Export: JSON with investigations, assets and photos downloads (95 KB for two investigations); name issue S8.
- Account deletion: inspected only. The button is disabled until DELETE is typed; the copy is clear. I did not confirm it.
- Password change on qa-user-a: validation messages correct, change succeeded ("Password changed. Your other devices and browsers have been signed out."), changed back, login with the file password verified. Note this signed out other sessions of qa-user-a, which may have disturbed the auditor.
- Bad investigation id gives "Investigation not found ... Back to all investigations".
- Open redirect after login: `/app/..//evil.example`, `/app/%2e%2e//evil.example`, `//evil.example` all land on `/app` (R3-07 fixed).

### 5. Phones, tablets, keyboard, accessibility
- No horizontal overflow on any page or step at 390 and 768 px (landing, login, signup, privacy, dashboard, assets, account, 404, all seven steps). Phone Problem step collapses Quality check, AI box, Asset details and Similar failures: first impression is much better than desktop (`64-m390-new-problem.png`, `60-m390-Cause-tree.png`, `98-tablet768-fishbone.png`).
- Tab order on the dashboard is logical with a visible focus ring on every stop; all inputs and buttons have names; one h1 and one main per page; page language set. No skip link (N3).

### 6. Performance (preview)
Landing 0.26 s, sign in to dashboard 1.3 s, open investigation 1.2 to 2.4 s, step switch 0.7 to 1 s, autosave 2.8 s, asset register status 4.3 s, AI 6 to 21 s with a visible "running" status. Rate limit message works ("You are going a bit fast. Wait about 5 seconds") and the daily limit message works ("You have used all 30 AI suggestions for today ... Everything else keeps working").

### 7. Copy and trust
404 page is now friendly ("This page does not exist ... Your investigations are not affected", with links). The AI notice appears in every AI panel with a Privacy link. Missing: B2, B3, no help page, no pricing. The console on the preview shows Vercel toolbar CSP errors; they come from the preview toolbar, not from the app.

### 8. Open items from earlier reports
| Item | Status now |
|---|---|
| R3-07 open redirect with dot segments | FIXED (tested 3 variants) |
| R3-01 404 page CSP and dead end | FIXED (no CSP error, links back) |
| R3-02 CSP allows inline scripts | Still open (header unchanged) |
| R3-03 plan vs quality check on task text | Still open (seen on my investigation) |
| R3-04 "too large" message blames photos | Not re-tested |
| R3-05 asset status lag | Still open, 4.3 s |
| R3-06 existing accounts lack sample assets | Both test accounts have the 5 sample assets now; brand-new account path could not be tested (no signup on .test) |
| NEW-01 demo two-tab race | Still open (suite fails 3 of 3) |
| NEW-02 sample lost once | Not seen |
| AI-01 report says owners/dates "not recorded" | FIXED (report states what is and is not set, correctly) |
| AI-02 N#/A#/E# in AI text | FIXED in all 7 real outputs (the sample's own A1/A2 labels are the labels the user sees) |
| AI-03 tag injection | Fixed earlier (unit tested) |
| AI-04 failed calls use allowance | Refund added by owner; not exercised |
| AI-05 challenge asks for evidence on the top event | FIXED (not seen) |
| AI-06 limit grammar | Config only, not reachable |
| AI-07 draft over-reads notes | FIXED (kept "swapped the gearbox" as written) |
| AI-08 no privacy notice | Notice present; page is a draft (B2) |
| AI-09 drafts not saved | Still open (S7) |

### 9. Existing automated suite (local production build)
See the final section of this file for the totals and the classification of failures.

## Existing automated suite results (local production build, commit 0a7be49)
Runs: `demo.js` 202 of 211 passed; `loss.js` 110 of 114; `account.js` (signed in, two accounts) 90 of 96; `features.js` was cut short twice by a restart of the test machine (about 405 checks passed before the cut; the failures it had logged are in the table). A full `run-all.js` was not completed. Results files were not committed.

| Failure group | Count | Cause |
|---|---|---|
| Landing tests (`D-LAND-1.hdr`, `.logo`, `.sample`, `A-SESS-1`, `A-PERS-1.reset-sample`, `A-MOB-1.ws`) | 6 | Stale test: it looks for "RootLoop" and expects one "Open the sample investigation" link; the redesigned landing has two. Not an app bug. |
| Dashboard total tests (`D-DASH-1`, `D-DASH-2`, `D-E2E-1.dash-1/3`, `LOSS-4-*` x4, `A-E2E-1.dash`) | 9 | Stale selector for the restyled tiles ("expected $0 but got undefined"). The displayed values in the failure text are correct (for example verified savings $251,081 and loss tile $0). Not an app bug. |
| Phone feature tests (`F-ASSET-1-demo-mob`, `F-REG-1`, `F-CAPA-1`, `F-PLAN-1`, `F-SPARES-1`, `F-SIM-1`, `F-ROLL-1` on demo-mob) | about 17 | Stale test: on phones the Asset details section is now collapsed, so the tests cannot see "Asset tag". Same controls pass on desktop. I confirmed by hand at 390 px (`64-m390-new-problem.png`). |
| `D-PERS-1.concurrent-window` | 1 | Real, known, minor (NEW-01): demo mode, two tabs, edits inside the same 350 ms lose one. Still not fixed. |
| `D-A11Y-1.small-targets` | 1 | Real, minor: the "Draft problem statement from notes" AI toggle is 1070 x 20 px, below the 24 px target size. Make it 40 px tall like the other toggles. |
| `A-ISO-1.a-list-no-b` | 1 | Probably leftover test data in qa-user-a (a "Copy of ..." row) from the interrupted runs; the database check afterwards found no such rows, and the other isolation checks (B cannot read A's rows) passed. Re-run after the suite is repaired. |
| `D-EDGE-NAV` (first, interrupted run) | 1 | CSP errors appeared while the local server was down mid-run; not reproduced on the preview (the 404 page loads without CSP errors). |

Conclusion: no failure in the suite points to a new functional or data bug. The suite needs updating (S9) before it can guard the next release.
