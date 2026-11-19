# Process or quality failure: independent QA

Change under test: commit 5e7604a and later on `claude/new-session-tdmk2t` (checked against HEAD 6d8dda6, which includes the revised walkthrough files). Tested on the Vercel branch preview (production settings, real AI; it served the new landing wording "from failure to verified solution") as `qa-user-b`, plus a local production build for the suites. App code was not changed.

## Verdict: GO

No blocking or high-severity defects. Every check in the brief passed, and the headline numbers match example-data.md. The defects below are low severity (polish and consistency). The two worth fixing before the video is recorded are D1 and D3, because the script and example data describe screens that do not exist as written.

## Automated runs
- Unit tests (`npx vitest run` in `web`): 29 files, 323 tests, all pass.
- Production build with `QA_LOCAL_SIGNOUT=1`: `qa/prelaunch-fixes.js` 31/31 pass, `qa/loss.js` 114/114 pass (results and screenshots restored afterwards, nothing committed from them).
- Preview headers (`/`, `/app`, `/help`, `/api/ai/draft` GET 405): CSP, X-Frame-Options DENY, HSTS preload, nosniff, referrer-policy and permissions-policy all present.

## 1. Full process-failure investigation (preview, signed in)
Everything below was done in the UI and re-checked after a full page reload.
- Type of failure = "Process or quality failure", Quality reference `NCR-2291`, Line or process, Asset tag, Asset type, Make and model, Duty, Criticality, Failure mode, dates and the four narrative fields: all save and reload.
- Loss, using the quick-add presets (Scrapped product, Rework, Product on hold, Customer claims and credits, Retailer penalties; each adds one line with the preset as description and an empty amount): lost production 24,000 packs, cash $33,100, opportunity $10,800, cost per event $43,900, annual loss $263,400 (cash $198,600, opportunity $64,800), hours lost 48. All match example-data.md exactly (the later revision changed wording, not figures). Five lines persist after reload.
- Evidence: six items save (my own first attempt closed the browser before autosave, which lost them; not an app fault).
- Cause tree of 11 causes with all four roots: Cause area saves, shows on the card ("Physical · Materials"), shows on the report ("[Physical, method, evidence E4]"). Forced on the jaw and "Not applicable" on the settings cause persist. Not applicable adds no Quality check nag (only unmanaged natural wear does), and the report omits the "deterioration" wording for it.
- Actions: six actions, total $20,200, "0 of 6 done"; Maintenance plan changes lists the weekly jaw task with its craft.
- Verify: before the actions are Done and the review is entered the panel says "Expected saving (not yet verified) $219,500"; once all are Done and "not recurred" is set it becomes "Annual saving (verified) $219,500" (cash $165,500, opportunity $54,000), after-loss $43,900, payback 1.1 months. Savings count only when verified.
- Report and print: Type of failure, Quality reference NCR-2291 and the "Line / process details" section appear on screen and in the PDF text (checked with pdftotext).

## 2. Real AI (6 calls: problem draft x2, coach on one cause, challenge, CAPA on one root, management summary)
Judged as a food plant or QA manager.
- Problem draft (rough notes): faithful, no invented cause, sensible "Not in your notes" list (earlier five events, film batch, what changed at the changeover, extent on hold). It follows the notes only on an empty investigation; on a populated one it also pulls in existing fields, which is expected.
- Cause coach (A1): specific and food-relevant (flange contamination by sauce or rice, flange out of spec, tray misaligned in the die, gas flush or pack pressure, no changeover first-off seal check, no incoming film and tray check), each with confirm and rule-out tests. It did not repeat what was in the tree. It did not mention seal temperature, dwell or jaw wear because those were already in the tree.
- Challenge: very good. It flagged the unevidenced film change-control root as a hypothesis, asked whether 158 vs 175 was confirmed with an independent probe, noted that a visual check cannot see leaks, and flagged the operator-blame wording. No compliance claims.
- CAPA for the film change-control root: concrete (supplier change notification, first-run film trial at recipe settings, goods-in certificate and batch check, film code in the recipe, training, retained reel sample). It correctly said "Not applicable" for wear. No HACCP or standards claims. Weaknesses: the rationale text of one item contains an awkward meta sentence ("may feed the site's QA or CAPA system under NCR-2291, without any claim that it meets a particular standard"), and "Spares holding" is stretched for a retained film sample.
- Management summary: accurate to the data and calls the film cause a hypothesis, but see D4. No invented facts and no compliance claims.
- Nits: the coach tagged "flange contaminated by product" with deterioration "forced", but that is not wear, so "not applicable" would be correct (D6). Dismiss and "Add to tree" on a suggestion were not exercised.

## 3. Regression
- Equipment failure (new): defaults to "Equipment failure", labels unchanged (Asset, Asset details, Where on the equipment?), Natural, Forced and Not applicable wear options shown, loss maths correct, report shows "natural deterioration".
- Sample P-101: opens, Equipment failure, annual loss $238,440 (dashboard row too).
- Demo mode (signed out, 390px): process type, quality reference and presets work and persist after reload, one quiet "Sign in to get AI suggestions" note, no horizontal scroll.
- Older investigation (the account's sample copy) loads.
- 390px: no horizontal scroll on any of the seven steps of the process investigation; the Cause area buttons are not clipped.
- Landing shows "from failure to verified solution" and no "breakdown to verified fix" remains. `/help` has the "Process and quality failures" section including "does not replace your HACCP, SQF or BRC system".
- Console: no app errors. The only error is the preview-only Vercel feedback script (D7).

## Defects
| # | Sev | Description | Steps |
|---|---|---|---|
| D1 | Low | Fishbone does not use Cause area. The tab still shows only Physical / Human / System columns, yet its help text says to tag causes by area. Area appears only as a chip on tree cards and in the report. | Tag causes, open the Fishbone tab. |
| D2 | Low | At 1440px the "Measurement" Cause area button breaks mid-word ("Measureme / nt") in the three-column grid. Fine at 390px. | Select any cause at desktop width. |
| D3 | Low | Process mode is only half process-aware. "Where on the equipment?" is unchanged. "Line / process details" holds Asset tag, Asset type, Make and model, Duty or service, Criticality (A/B/C wording is about plant stoppage) and Failure mode, with no Line, Product, Pack type or Process step. Failure mode suggestions are "Seal leak" and similar. Quality reference sits near the top, not in Line / process details. | Problem step, choose Process. |
| D4 | Low | AI management summary says "No separate cost for this one event was given" and omits the verified saving and payback, because the AI context carries only events, hours and annual loss. Pre-existing, but it hurts the walkthrough's final scene. | Verified investigation, Report, Management summary. |
| D5 | Info | Preset categories: "Customer claims and credits" and "Retailer penalties" both map to "Customer penalties"; "Rework" and "Product on hold" map to "Other". The report reads "Cash: Customer penalties (Customer claims and credits)". Fine, but slightly clumsy. | Loss step presets, then the report. |
| D6 | Low | AI coach can tag non-wear causes (contamination) as "forced". | Coach on a physical cause. |
| D7 | Info | The preview logs a CSP error for the Vercel feedback script. It is not present in a production deployment. | Any page on the preview. |

## 4. Walkthrough script and example-data against the app
Latest versions pulled (HEAD 6d8dda6). Figures are unchanged by the revision, so every figure in example-data.md matches the app. Mismatches:
1. Scene 5 (script and example-data): "Line / process details: the line, product, pack type, film and the process step" and the fields `Line`, `Product`, `Pack type`, `Process step` do not exist. Real fields: Asset tag (optional), Asset type, Make and model, Duty or service, Criticality, Failure mode.
2. Failure mode value "Seal failure (leaking pack)" is not an option. Suggestions are Seal leak, Foreign matter, Wrong weight or fill, Labelling or coding error, Out of specification, Contamination, Changeover error, Other (free text is allowed, so typing "Seal leak" is easiest).
3. Scene 5 order: Quality reference (NCR / CAPA number) is a Problem-card field right after Type of failure, above Line or process, not below Line / process details.
4. Scene 4: the example data says to fill "Asset"; for a process failure that field is labelled "Line or process". "Where on the equipment?" keeps its equipment wording (correct per script, but see D3).
5. Scene 9: buttons are "Forced deterioration" and "Natural deterioration" (script says tap "Forced" and "Natural"); "Not applicable" is correct.
6. Fishbone (Scene 9): the script says nothing about Cause area, and the fishbone tab shows Physical / Human / System, not equipment, materials, method, measurement and so on (D1). The "Cause area" row (Equipment, Materials, Method, Measurement, People, Environment) is a new optional control in each cause's panel that neither document mentions; the cause table has no column for it.
7. Scene 13: "Create the checks" is "Create N rollout checks" (for example "Create 2 rollout checks"); "Add a similar asset" is both the form heading and a button "Add a similar asset that is not listed".
8. Scene 6 presets appear in the app order Scrapped product, Rework, Product on hold, Customer claims and credits, Retailer penalties (the script reads them in a different order, which is fine). The preset adds an empty-amount line, as the script describes.
9. Scene 14: the audience box has no visible label "Audience note"; the placeholder reads "e.g. The audience is the site manager. Keep it short." (card title "Write-up drafting", as the script says).
10. Scene 4: the AI draft calls the failure "domed" only if the notes say so; with the revised notes (end-of-line check) the draft pulled "42 packs at dispatch" only because my test investigation already held the old text. Not a mismatch on an empty investigation.
Untested: typing the top box (failure event) text from example-data.md; the Quality check "Fix first" flow in Scene 12; AI Add to tree / Dismiss.

## Notes
- AI usage: 6 real calls. The two QA accounts' `ai_usage` rows were deleted once (both accounts only) because the daily limit was reached.
- The QA account now holds one process investigation and one equipment investigation created by this run (plus its sample). They were left in place.

## Retest (fixes at 503a3ea)
Preview confirmed serving 503a3ea (process mode shows "Where in the process?" and Line / Product / Pack type / Process step). 3 real AI calls (coach x2, management summary) as `qa-user-b`; no rows needed clearing.

**Verdict: GO.** D1, D2, D3, D4 and D6 are fixed. D5 and D7 were left deliberately.

| # | Result |
|---|---|
| D1 | Fixed. Fishbone has "Group by: Level / Cause area". It opens by Cause area for a process failure, with columns per area, counts and "Because of: ..." context on each card; "Level" restores the Physical / Human / System columns. Counts matched the tags (one cause showed under "Not tagged yet" because my script toggled its area off). |
| D2 | Fixed. "Measurement" is one line, 44px tall, at 1440px. Also fine at 390px. |
| D3 | Fixed. "Where in the process?", Line, Product, Pack type and Process step save and reload and appear on the report. "Seal failure (leaking pack)" is in the Failure mode list (list also has Underweight / overfill, Foreign body, Labelling error, Temperature excursion, Out of specification, Changeover error). |
| D4 | Fixed. The summary now says "Each event costs $43,900 ($33,100 cash, $10,800 lost margin)... about $263,400 per year" and, once verified, "Verified saving is $219,500 per year against action cost of $20,200, a payback of 1.1 months". The film change-control cause is still called a hypothesis; no compliance claims. |
| D6 | Fixed. The coach returned "not applicable" for flange contamination, flange distortion and every system or human cause across two runs (A1 and the seal-check cause); only a jaw-pressure cause had no wear tag. No material or method cause was tagged forced. Quality of suggestions stayed good (seal acceptance standard, tooling inspection, limit samples, extra checks after a film or setting change, no leak test on the line). |

Quick regression, all pass: new equipment investigation (default Equipment failure, labels unchanged, loss $3,900 correct), sample P-101 $238,440, an older investigation loads, demo mode (process type, presets, persistence, one AI sign-in note), 390px no horizontal scroll on all seven steps, landing and help wording.

Script and example-data against the app (latest 503a3ea): the earlier mismatches 1 to 9 are resolved in the docs ("Line or process", "Where in the process?", Quality reference under Type of failure, Line / Product / Pack type / Process step fields, "Forced deterioration", the Cause area column, Fishbone Group by, "Create 2 rollout checks", audience box placeholder). Remaining nits only: the top box is labelled "Failure event text" and is prefilled from the problem, so "if empty" rarely applies; Scene 12 Quality check "Fix first" flow and coach Add to tree / Dismiss were still not exercised.

## Retest 2: "countermeasure" wording (dd75110)

**Verdict: GO.**

**The 23/28 local result is a configuration artefact, not a regression.** `qa/prelaunch-fixes.js` needs the Supabase public URL and publishable key at build time (`NEXT_PUBLIC_SUPABASE_*`).

| Build | Supabase env | Result |
|---|---|---|
| dd75110 | not set | 23/28 (the P-DEMO-1 AI-note checks and P-AUTH-1 "no Email field" fail, because the app runs in local-only mode with no accounts and no AI sign-in note) |
| 41b1190 | set | 31/31 |
| dd75110 | set | 31/31 |

Same script, same conditions. A first attempt with a leftover server on the port gave misleading failures and was discarded. Unit tests at dd75110: 327/327 pass.

**Warning for QA runs:** the signed-in parts of that script clean up the shared qa-user-b account, which deleted my process-failure test investigation. Do not run it against the shared Supabase project while someone else is testing.

**Preview (serving dd75110), spot-check, all pass.** Landing "Prove the countermeasure held" and "from failure to verified solution" (a fresh test investigation was used). Actions heading "5. Countermeasures: track every action". Quality check shows "Address first" / "Should address", with no "Fix first" or "Should fix". Verify "Expected events per year after the countermeasure", "Annual saving (verified)", "Roll out this countermeasure" panel and "The countermeasure is verified." Report has a "Countermeasures" column. No remaining "fix" word on the report, dashboard or help text. Rollout status wording ("Countermeasure in place") was checked in the source, not clicked. Sample P-101 $238,440, demo mode (process type, presets, one AI note), 390px no horizontal scroll on all seven steps.

**Real AI (1 call, CAPA on a process root cause):** still good and specific (jaw deviation alarm and interlock, thermocouple and controller calibration, signed changeover check, increased leak-test sampling as verification). Marks deterioration "not applicable". It uses "countermeasure" naturally ("only call the countermeasure proven if there are no leaking packs...") and has no compliance claims. The older `qa/flows.js` already uses the new Verify label.
