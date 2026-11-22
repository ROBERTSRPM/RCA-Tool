# Actions tracker QA (commit 44daa14)

Branch claude/new-session-tdmk2t. Tested 22 Nov 2026 in Chromium (Playwright) against production builds.
Demo mode on a build with no Supabase config. Signed in as qa-user-a on a build pointed at the project's Supabase.
Screenshots: scratchpad `qa-actions-*.png`.

## Automated checks
- `npm run lint`: clean. `npx tsc --noEmit`: clean. `npm test`: 31 files, 382 tests pass. `npm run build`: passes, `/app/actions` is built.

## 1. Demo mode
Seeded two extra investigations (9 actions) beside the sample, which has 13 actions, all done.
- Page loads with sample data and after "Reset sample data". Seeded investigations survive the reset.
- Default view is Open (7 rows, 2 overdue). Sorted overdue first, then by due date.
- Filters and counts all match what was expected from the data:
  - Done: 15. All: 22.
  - Due this week: 3 open, 4 with done. Today and today+6 are in; today+7 is out; overdue is not "this week".
  - Type: corrective 2, preventive 4, not set 1.
  - Owner: Alice 2, "Bob, Carol" 2, no owner 1.
  - Asset: with an asset 4, none 3. Combined filters, "Reset filters" and the empty state work.
- Overdue is right against 22 Nov 2026: 21 Nov is overdue; 22 Nov is not.
- Dashboard "Open actions" and "Overdue actions" tiles link with the filter preset (7 and 2 rows).
- Tick done on an overdue action:
  - The list drops to 6.
  - The investigation's Actions step shows "2 of 5 done", overdue 0 and the row as Done.
  - The dashboard goes from open 7 / overdue 2 to 6 / 1.
- Untick reverts all three (7 / 2, "1 of 5 done").
- Row links open `/app/investigations/<id>#actions`.
- CSV:
  - File name `rca-pilot-actions-2026-11-22.csv`.
  - UTF-8 BOM (EF BB BF), CRLF line ends.
  - Headers: Action, Type, Owner, Due date, Status, Asset, Investigation.
  - Rows match the filter. Dates are ISO (2026-11-25).
  - Commas and quotes are escaped (`"Fit guard, ""double"" and check"`).
  - `=HYPERLINK(...)`, `+1`, `-negative` and `@mention` all get a leading apostrophe.

## 2. Signed in
- Created 1 investigation with 2 corrective actions through the UI.
- Ticked one on the Actions page (a PATCH went out and returned 200).
  - It persisted after reload and in a fresh browser context.
  - The investigation showed "1 of 2 done", overdue 0.
  - The dashboard went from open 2 / overdue 1 to open 1 / overdue 0.
- Deleted the test investigation with the app's Delete button. It is gone from the dashboard and the Actions page. No SQL, no AI features used.

## 3. Concurrency
- Tab A has the investigation open. Tab B ticks an action. Tab A then edits: it shows "Not saved: changed elsewhere", says nothing has been overwritten and offers a choice. The tick stayed on the server.
- Reverse order: an investigation edit is saved, then a stale Actions tab ticks. The tick re-reads the latest version first, so both changes are kept and no error is shown.

## 4. Layout and keyboard
- 390, 768 and 1440 px: no page-wide horizontal scroll on the dashboard, Actions, Assets or investigation page, in demo and signed in.
- Phone nav shows 3 links (Investigations, Assets, Actions), and navigating works with the current page marked. Account is not in the phone row; that was already the case.
- All tick boxes have labels ("Mark done: <action>").
- Tab reaches a tick box and Space toggles it.

## 5. Wording
No "fix" or "free", no spelled-out numbers, plain sentences. The page says "countermeasure".

## 6. Regressions
Investigation steps (problem, verify, report, cause tree), Dashboard and Assets render with no console errors, signed in and in demo.

## Defects (all minor, none block release)
1. Low: keyboard focus is lost after a tick. With the Open filter the row disappears, so focus drops to `<body>` and a keyboard user has to tab from the top again. Steps: Actions page, Tab to a tick box, press Space, check `document.activeElement`.
2. Low: unticking an "In progress" action sets it to "Open", so "In progress" is lost. Steps: tick then untick an In progress action with the Status filter on All. The code comment says this is intended.
3. Low: a signed-in tick takes about 1.9 seconds, and the only feedback is the box going disabled. Reloading in that window drops the tick with no message. Steps: tick, reload within 2 seconds, and the action is still open.
4. Cosmetic: the asset label doubles up when the name does not start with the tag. For example "C-2 Conveyor C-2", and the sample's "P-101 Slurry pump P-101".

## Not tested
- Internet Explorer and Safari (only Chromium).
- Excel opening the CSV.
- Another user's investigations (the user B account).
- Offline behaviour.
- Screen readers.
- Very large lists.

## Result
PASS
