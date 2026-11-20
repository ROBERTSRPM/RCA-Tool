# QA: "Line time back" (commit a4a74c0, branch claude/new-session-tdmk2t)

Verdict: PASS (no Blocker or High findings; 4 Low/Medium polish items below).

## Scope and method
- Independent diff review of `git show a4a74c0` (finance.ts, status.ts, VerifyStep, ReportStep, Dashboard, tests).
- Automated: vitest 333/333 passed, `tsc --noEmit` clean, `npm run lint` clean, `npm run build` succeeds.
- Browser (Playwright/Chromium, 1280x900 and 390x844, scale 1): run against a LOCAL dev server in local-only mode (no Supabase env). The Vercel preview is behind Vercel SSO (302 to vercel.com/sso-api) and no share link was available, so the preview and a4a74c0 deployment were not checked, and sign-in as qa-user-a was not done. Branch head on origin is f8f7f1a (includes a4a74c0).

## What passed
- 8 h, 6 events/yr, 1 after: "40 h a year" with sub text "8 h x (6 - 1) events a year."
  - Verify card reads "Line time back (expected)" with "Not yet verified." while review is "Not yet reviewed", and "(verified)" after closing (all actions done, not recurred, review date).
  - Report headline card: expected / verified label correct, "40 h a year".
  - Report sentence ("Line time back: 40 h a year.") appears for a costed loss.
  - Dashboard tile: "124 h of line time back a year" = 84 h sample + 40 h; the open (unverified) one did not count; tile line absent when there are no verified hours.
- Missing downtime, events after blank, after >= before (6->6, 2->5), negative after (-2), Not known yet: nothing shown anywhere, no NaN/0/negative/undefined text.
- Decimals: 7.5 h x (5.5 - 1.25) = "31.9 h a year" (one decimal). After = 0 gives 48 h.
- "Not costed yet" behaviour unchanged ("Loss not costed yet" tiles, money text identical); hours show independently of costing.
- Mobile 390px: no horizontal overflow on Verify, Report, Dashboard; card grids wrap to 2 columns cleanly. Desktop: cards wrap cleanly.
- Unit tests in the diff are meaningful and cover null, not-known, no-recovery, and verified-only counting.

## Findings
1. Medium: when the loss is not costed, the Report's verification section says "Savings cannot be calculated while the loss is not costed" and does NOT include the "Line time back: N h a year" sentence (the sentence lives inside the `hasAfterFigure` branch), although the headline card shows 40 h. The brief says the Report has the sentence; it is missing exactly in the case where hours are the only result. Suggest putting the sentence outside the costed branch.
2. Low: very small values print "0 h a year" (e.g. 0.001 h x (3-1) = 0.002 h/yr shows "0 h a year" and the sub text "0 h x (3 - 1)" since downtime is formatted to 2 decimals). Contradicts the "never 0" intent. Suggest returning null below a display threshold (e.g. < 0.05) or using more decimals.
3. Low: no sanity bound. 1,000,000 h x 1,000,000 events shows "1,000,000,000,000 h a year"; also hours exceed the 8,760 h in a year with no warning (e.g. 8 h x 5,000 events). The Verify sub text prints the raw event counts unformatted ("1000000"). Cosmetic/data-entry only.
4. Low: Verify metric grid now has 6 tiles on desktop (5 columns), leaving "Payback period" alone on a second row; works but a bit unbalanced. Dev-only overlay badge covers part of a card on mobile (not an app issue).
5. Observation (not a defect): dashboard hours are summed across all currencies and include investigations with "Loss not costed yet", while the money total is only the selected currency and excludes uncosted ones. Hours are currency-independent so this is defensible, but the tile can show hours next to "$0".

## Not tested
- Vercel preview (SSO-protected) and real sign-in as qa-user-a; Supabase-backed persistence. Local-only mode uses the same components and finance code, but the store layer differs.
- No test data was created in the cloud account; local browser data was in throwaway Playwright contexts, so nothing needed cleanup. AI buttons not used.
- Print/PDF output of the report; Dashboard with multiple currencies.

Screenshots (scratchpad): v1_verify_desktop.png, a_expected_verify.png, a_expected_report.png, a_verified_report.png, dash_after_A.png, k_report.png, k_verify.png, m_verify.png, m_report.png, m_dash.png.

## Retest (fix commit 268d166, real Vercel preview + Supabase)

Verdict: PASS. Fixes 1-4 confirmed; no regressions; no new defects.

Method: Vercel preview opened via the share link (bypass cookie set), signed in as qa-user-a (Supabase), desktop 1280px. The preview behaved as 268d166 (new behaviours below are only in that commit; the exact deployed SHA could not be read from the page). Created 7 investigations through the UI, verified and closed them, checked Verify, Report and Dashboard, then deleted all of them via the row Delete buttons; the dashboard returned to the original sample only (84 h, $238,440). Browser contexts were discarded at the end (local sign-out only, no server-side sign-out call). qa-user-b not used, no AI buttons.

Fix checks
1. Report sentence when not costed: PASS. Not-costed 8 h, 6 -> 1 shows "Savings cannot be calculated while the loss is not costed..." followed by "Line time back: 40 h a year." Costed case shows the sentence too (separate paragraph).
2. No "0 h": PASS. 0.001 h x (3 - 1) now shows no card on Verify, Report or Dashboard.
3. Number formatting: PASS. Verify sub text is "1,000,000 h x (1,000,000 - 0) events a year." (was raw "1000000").
4. Verify grid at desktop: PASS. Six tiles lay out 3 x 2 (screenshot p_costed_verify.png); no orphan tile.

Regression (all as before): 8 h x (6 - 1) = 40 h a year, "(verified)" label after closing; decimals 7.5 h x (5.5 - 1.25) = 31.9 h; no downtime and after = before show nothing; "Not costed yet" text unchanged; the dashboard tile summed hours of verified investigations only and was back to 84 h after cleanup. Headline report card shows 40 h in both costed and not-costed cases.

Still open (Low, unchanged by design): no upper bound, so 10^6 h x 10^6 events shows "1,000,000,000,000 h a year" and the dashboard total follows it; hours above 8,760 a year are not flagged. Not retested: mobile 390px on the preview (the grid change is lg-only; mobile was fine on the earlier local run), "Not known yet" on the preview (covered earlier locally and by unit tests).
