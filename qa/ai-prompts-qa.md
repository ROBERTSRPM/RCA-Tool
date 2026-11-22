# AI prompts QA (commit c06bde8, web/lib/ai/prompts.ts)

Tested on the Vercel branch preview (branch head d7c0ea5, which contains the c06bde8 prompt text and the new report heading) as `qa-user-a`, real AI (no mock; the preview has an API key). App code was not changed. Preview URL and password were not written anywhere.

**AI calls used: 7** (problem draft 1, cause coach 1, challenge 1, CAPA wear-out 1, report 1, management summary 1, CAPA process failure 1).

## Test data (all created through the UI)
Equipment failure "Conveyor C-12 return idler failed": 1 evidence item (bearing races worn evenly, no overload or misalignment), 1 loss figure set. Tree: bearing seized, then "Bearing worn out at end of its normal life" (Physical, root cause, Verified, linked to the evidence), plus hypotheses (grease contaminated by dust, roller end seal damaged, no grease check on the round). Type of wear was left unset so the AI had to classify it.

## Results
| Feature | Result | Evidence |
|---|---|---|
| Problem statement | Pass | 6.4 s, no error. Accept applied the draft. Numbers ($11,400 = $1,800 + $9,600, 4 hours, 1 event) all come from the loss inputs. |
| Cause coach | Pass | 5 suggestions, all hypotheses with confirmWith and ruleOutWith. None said verified. Dismiss removed one (5 to 4). Accept added a cause to the tree (6 to 7). |
| Challenge | Pass | 7 issues. "Verified" used only for the verified wear-out node ("Verified as natural end of life from one photo..."). Hypotheses called "a hypothesis with no evidence". Dismiss removed one (7 to 6). |
| CAPA, wear-out node | Pass with notes | `deterioration: natural`. Condition monitoring ("Check return idlers on C-12 for noise, heat and roller rotation..., weekly, operator"; vibration trend 3 months). No forcing-cause action. Accept created actions (2 rows), Dismiss worked. |
| Report | Pass | Heading "Rolling the countermeasure out to similar assets" present, "Rolling the fix" absent. No "fix", no bullets, no markdown, no N#/A#/E# labels. Hypotheses called "hypotheses" / "not yet verified". Numbers (12, 14, 5, 2026, 4, 1, $11,400, $1,800, $9,600) all in input; idler interval written as "No replacement interval ... is to be set from the site's failure history". |
| Management summary | Pass | No "fix", bullets or markdown. "Other causes are hypotheses, not yet verified". "no saving is claimed". Numbers all from input. |
| CAPA, process failure (sealing temperature set low after changeover) | Pass | `deterioration: not_applicable`. 7 actions: procedure, design, condition_monitoring (in-process check), maintenance_task (calibration), training, operating_practice, repair. No spares action. |

Nothing errored: no `ai-error`, all responses HTTP 200. The only console error is the Vercel feedback script blocked by CSP (preview only, already known as D7).

## Notes (not failures)
1. CAPA for natural wear: `deteriorationReason` says "Check the failed bearing grease and seal before closing this out" and one procedure action says to keep the old bearing and grease to confirm or rule out dust. This is a soft nudge toward the dust hypothesis already in the tree, not a forcing-cause hunt action, so it passes. If the rule should be stricter, it is the place to look.
2. CAPA returned `intervalValue: null` (not 0) for non-interval categories, and null for a maintenance task whose interval is "to be set". The UI handled it without errors.
3. CAPA spares action says "Hold at least 2 complete return idler rollers". The no-invented-numbers rule applies to the report and summary, and the prompt asks CAPA for a suggested holding, so this is allowed. The report said "The 4 hours down suggests the part was available, but this is not confirmed", a mild inference that is clearly flagged.

## Cleanup
Test investigations (the idler one and the process one, plus empty "AIQA" drafts left by two failed script attempts of mine) were deleted through the dashboard Delete button. Only the sample investigation remains. No SQL.

## Verdict
PASS
