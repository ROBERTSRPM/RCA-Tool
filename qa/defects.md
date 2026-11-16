# Defects

Round 1 (original build) text is kept below unchanged. Each defect has a **Round 2** line at its end; new round 2 defects are listed in the Round 2 section at the bottom.

Build tested: `web/` production build (Next 16.4.6), http://localhost:3555, Chromium. All items below were reproduced by the suite
(test id in brackets) unless marked "unconfirmed". Screenshots are in `shots/`.

Severity totals: Blocker 0, Major 3, Minor 8, Cosmetic 4, Unconfirmed 1.

## Major

### DEF-01 Major - Concurrent tabs/devices silently overwrite each other (demo and signed in)
Test: D-PERS-1.two-tabs, A-PERS-1.two-tabs.
Steps: open one investigation in two tabs. Tab 1: change Title, wait for "All changes saved". Tab 2 (opened before the change): change Asset, wait for save. Reload tab 1.
Expected: Title and Asset both keep their new values. Actual: Title reverts to the old value. Every save writes whole sections (`problem`, `tree`, ...) from the tab's stale copy. For the signed-in product ("available on any device") this loses edits with no warning.

**Round 2: FIXED** for the original reproduction. Signed in, the stale tab's save is refused with the banner "This investigation was changed elsewhere" and the buttons Load the latest version / Keep mine and overwrite; the other tab's data stayed intact in the database and both buttons behave as described (A-PERS-1.two-tabs, conflict-load-latest, conflict-keep-mine). Demo mode shows the notice "updated from another tab" (D-PERS-1.two-tabs passes). A narrower race remains: see NEW-01.

### DEF-03 Major - Actions disappear from the Actions step when no root cause is flagged
Test: D-EDGE-ACT.hidden-after-unflag. Screenshot: shots/demo-actions-hidden.png.
Steps: new investigation; add cause, tick "This is a root cause"; add an action (cost $500) linked to it; go back and untick the root-cause box (or delete the cause); open Actions.
Expected: the existing action is still listed and can be edited or deleted. Actual: the step shows only "Flag a root cause first" and zero action cards, but the action still exists and is counted in the report, action cost totals and the quality check. The user cannot see, edit or delete it.

**Round 2: FIXED.** Actions appear under "Not linked to a root cause" with a "Re-link to a root cause" control and still count in totals (D-EDGE-ACT, D-TREE-1.del-linked-action).

### DEF-02 Major (judgement) - "Verified annual savings" counts a saving while actions are still open
Test: D-E2E-1.dash-2.
Steps: investigation with 2 open actions, events-after = 1, recurrence = "No, it has not recurred". Open dashboard.
Expected (per tile hint "Failure confirmed stopped" and status logic): not verified until all actions are done and the investigation is Closed. Actual: the row is "Actions in progress" yet its $10,350 saving is added to "Verified annual savings" ($209,050 instead of $198,700). The dashboard headline money figure can therefore be overstated. Rated Major because it is a headline number; downgrade to Minor if the product owner intends it.

**Round 2: FIXED.** Saving reads "Expected saving (not yet verified)" and stays out of the dashboard total until all actions are Done, recurrence is "No" and a review date is set; all four missing-condition cases checked (D-E2E-1.dash-2, LOSS-4.not-verified-states).

## Minor

### DEF-04 Minor - Browser tab title never shows the investigation title
Tests: D-PERS-1.title-doc, D-EDGE-TEXT.doc-title. Steps: open any investigation; the tab title stays "RootLoop: the root cause tool that closes the loop" (code intends `<title> · RootLoop`). Expected: investigation title in the tab/history.

**Round 2: FIXED.** Tab title follows the investigation title (D-PERS-1.title-doc, D-EDGE-TEXT.doc-title).

### DEF-05 Minor - Rapid double-click creates two investigations / two copies
Tests: D-EDGE-NAV.dblclick-dashboard, -landing, -dup. Steps: double-click (two clicks within ~50 ms) "New investigation", "Start a new investigation" or Duplicate. Expected one. Actual two records (one blank/duplicate is left behind). A human-speed double click (120 ms apart) creates one (D-EDGE-NAV.dblclick-dashboard-human passes), so impact is limited.

**Round 2: FIXED.** Rapid double-click now creates exactly one record on dashboard, landing page and Duplicate (D-EDGE-NAV.dblclick-*).

### DEF-06 Minor - Changing only the URL #hash of an open investigation does not change the step
Test: D-EDGE-NAV.hashchange. Steps: open `/app/investigations/<id>#loss`, then edit the address to `#report` (same page). Expected the Report step; actual nothing (hash read once at load). Pasted deep links to a step only work on a fresh load.

**Round 2: FIXED.** Editing only the #hash switches the step (D-EDGE-NAV.hashchange).

### DEF-07 Minor - Very long unbroken text/numbers cause horizontal page overflow at 375px
Tests: D-EDGE-NUM.huge, D-EDGE-TEXT.overflow-loss/-evidence/-report/views. Screenshots: shots/demo-longtext-evidence.png, demo-longtext-report.png, demo-loss-huge-mobile.png.
Steps: enter a 3000-character word (e.g. a long URL) in an evidence title/note, a cause (Fishbone view), or a long unit name; or a 20-digit number in loss fields. Actual: page scrollWidth 1,200 to 42,000 px on a 375px screen (Evidence, Report, Fishbone, Loss step). Tree, Actions, Verify, Problem and the dashboard wrap correctly. Normal-length text is fine.

**Round 2: FIXED.** No horizontal page overflow at 375px with 3000-character words or 20-digit numbers on Loss, Evidence, Report, Fishbone (D-EDGE-TEXT, D-EDGE-NUM.huge, LOSS-3 long description, LOSS-6 huge).

### DEF-08 Minor - Offline save feedback is very slow
Test: A-OFF-1.retry-offline (timing note). With the network down the indicator reads "Saving…" about 8 s before "Could not save... no connection" appears; "Try again" offline again waits up to ~15 s. Edits are kept, recovery on reconnect works, and a beforeunload warning is shown (all passed).

**Round 2: FIXED.** The save error now appears about 40 ms after pressing Try again offline (was 8-15 s) (A-OFF-1.retry-offline timing note, local 41 ms, live 47 ms).

### DEF-09 Minor - Confirm dialog has no focus trap and does not restore focus
Tests: D-A11Y-1.keyboard-modal, modal-focus-return. Steps: focus a Delete button, press Enter, press Tab 5 times: focus leaves the dialog (aria-modal). After Escape focus is on `<body>`, not the trigger.

**Round 2: FIXED.** Focus stays inside the confirm dialog and returns to the trigger after Escape (D-A11Y-1.keyboard-modal, modal-focus-return).

### DEF-10 Minor - Workspace page has no `<main>` landmark
Test: D-A11Y-1.account-menu-kbd. `/app/investigations/<id>` has 0 `<main>` elements (dashboard has 1).

**Round 2: FIXED.** The workspace has one `<main>` landmark (D-A11Y-1.account-menu-kbd).

### DEF-11 Minor - Reset/Load sample is a destructive-looking dialog in the empty state
Test: D-DASH-2.empty (comment). "Load the sample investigation" on the empty dashboard opens "Reset the sample data? ... Any changes you made are lost." Confusing wording for a first load.

**Round 2: FIXED.** Loading the sample into an empty list/account shows no dialog, creates exactly one sample, even on double-click (D-DASH-2.empty, A-EMPTY-1).

## Cosmetic

### DEF-12 Cosmetic - Landing footer says "Your data stays in this browser for now"
Test: D-LAND-1.footer. Out of date now that accounts store data in the cloud.

**Round 2: FIXED.** Footer copy no longer claims data stays in the browser (D-LAND-1.footer).

### DEF-13 Cosmetic - Stepper accessible names read "Problem(complete)"
Test: D-A11Y-1.stepper-name. The hidden "(complete)" text has no space/separator before it.

**Round 2: FIXED.** Stepper names have a separator before "(complete)" (D-A11Y-1.stepper-name).

### DEF-14 Cosmetic - Muted text contrast slightly below 4.5:1
Test: D-A11Y-1.contrast-desktop. Slate-500 text on the slate-100 page background is 4.35:1 ("All changes saved", tile labels, report hint); landing footer is 4.23:1. No other contrast failures were found on any page or step.

**Round 2: FIXED.** No text below 4.5:1 (3:1 large) on any page or step, desktop (D-A11Y-1.contrast-desktop).

### DEF-15 Cosmetic - Some standalone links are shorter than 24 px
Test: D-A11Y-1.small-targets. "All investigations" is 136x20 px (inline demo-banner links are exempt).

**Round 2: FIXED.** All standalone controls are at least 24 px (D-A11Y-1.small-targets).

## Unconfirmed

### DEF-16 Unconfirmed - "Reset sample data" is not atomic (signed in)
Test: A-RESET-1. The store deletes the sample then inserts a new one. With the insert request aborted, one run left the account with no investigations at all (only the empty-state "Load the sample" button recovers it); the identical re-run kept the sample. Seen once, not reproducible on demand.

**Round 2: NOT REPRODUCED / assumed fixed.** Reset is now an upsert; with the POST aborted the account kept its sample and showed an error (A-RESET-1). The original was unconfirmed. See also the unexplained observation under NEW-02.

## Observations (not defects, no test failure)
- Photo helper text says "kept in this browser only" although signed in they are stored in the account database (not separately verified in the UI copy while signed in).
- No validation of event dates in the future or review dates before the event date (D-EDGE-DATE observations).
- Negative numbers, "1,000" and "1e3" are silently refused in number fields (no message).
- Step navigation uses replaceState, so browser Back leaves the investigation rather than going to the previous step.
- Corrupt demo storage shows an empty dashboard without a warning and is overwritten on next save.
- Aborted Next.js `_rsc` prefetches appear as ERR_ABORTED in the network log; they are benign and are filtered by the suite. No console errors and no failed requests on any page, signed in or out.
- Passed and worth noting: RLS isolation (B cannot read, update or delete A's rows by API; anonymous gets permission denied), open-redirect protection on `?next=`, script/HTML text is rendered as text everywhere, all computed money values match independent hand calculation, print layout hides app chrome.

## Not tested (with reasons)
- Real sign-up, confirmation email, resend-confirmation: rule against creating accounts.
- Forgot-password with a real address and the New-password form (needs an emailed link).
- First-sign-in "copy browser data to my account" offer (needs a fresh account).
- The native browser print dialog (print media emulation and PDF export used instead).
- Browsers other than Chromium, real touch devices.


---

# Round 2 (new build, local production build and https://rca-tool-omega.vercel.app)

Intentional changes (a) to (f) were verified as designed: see test ids D-E2E-1, LOSS-4 (a), D-DASH-2.empty / A-EMPTY-1 (b), D-TREE-1 / D-EDGE-ACT (c), A-PERS-1 / D-PERS-1 (d), A-RESET-1 (e) and LOSS-1..7, A-LOSS-1 (f). All hand-calculated figures for the new Loss feature matched: six share mixes (60/40/0, 48/32/20, 35/50/15, 0/100/0, 0/0/100, 25/0/75), recovery cost, yearly buffer holding cost (not multiplied by events, assumed to continue after the fix), other cost lines, the cash/opportunity split per event and per year, the carry-over into Verify, dashboard tiles, rows and Report, shares always totalling 100 (60 random operations), old records without the new fields (identical to the old maths), and negative stored values treated as 0.

## New defects

### NEW-01 Minor - Demo mode: two tabs editing within the same ~350 ms autosave window silently lose one edit
Test: D-PERS-1.concurrent-window (fails locally and live, reproduced 4 of 4 in a manual run and 3 of 3 in the test).
Steps: open one investigation in two tabs; edit Site in tab 1 and "When did it happen?" in tab 2 at (almost) the same moment. Expected: both edits kept, or a notice. Actual: both tabs keep showing their own text, no notice, but after reload only one of the two edits is stored. Slower, sequential edits across tabs are handled (notice appears; D-PERS-1.two-tabs passes) and signed in the same race is protected by the conflict banner (A-PERS-1.concurrent-window passes). Impact is low (needs two tabs and sub-second timing), demo mode only.

### NEW-02 Unconfirmed - account lost its seeded sample once between runs
At the start of the third local run, account A had no investigations at all and no sample (the cleanup step found nothing to reset). The previous run had ended with a passing cleanup that verified exactly one sample. Not reproduced since (live run and local re-runs clean), cause unknown; possibly connected to the offline-delete tests or the sample-reset flow. Listed so the team can check their logs.

## Observations (no failing test)
- The Loss step displays whole shares (a stored 50/50/50 shows 33/33/34) while the maths uses the exact thirds (33.33% each): annual loss $13,600 versus $13,560 from the displayed numbers. Only reachable with hand-edited stored data; the UI cannot create it.
- Typing a share one digit at a time rebalances the other two after every keystroke, so the final split of the other two depends slightly on the typing path (documented rule: they keep their ratio; visiting 100 resets them to 0/0 and the remainder then goes to "made up later").
- With downtime 0 but repair/other costs entered the annual loss still shows the cash costs ($13,202 in the test); the quality check correctly asks for downtime.
- Live site only: a request path containing `../` is answered with HTTP 403 by the hosting platform instead of the app's own "not found" page (acceptable; the test now accepts 403).
- Signed-in dashboard load, navigation to data shown, 7 cold runs: local median 1071 ms (606-1124), live median 1572 ms (1500-1784).
