# Walkthrough example data: everything typed on screen

One example, kept consistent across the voice, the screen and the maths. All figures are illustrative. Labels below are the exact labels in the live app (https://www.rcapilot.com). Type the values exactly as shown so the recording matches the voiceover.

Scenario: overland conveyor CV-204 at a mine, drive gearbox, high-speed pinion bearing failing from hot, dirty oil and misalignment. Four failures in twelve months.

## The numbers (computed the way `web/lib/finance.ts` does)

| Item | Value |
|---|---|
| Events per year | 4 |
| Downtime per event | 18 hours |
| Production rate | 900 tonnes/hour |
| Margin per unit | $12 per tonne |
| Repair cost per event | $38,000 |
| Shares | 100% lost for good, 0% made up, 0% buffer |
| Lost production per event | 18 x 900 = 16,200 tonnes |
| Opportunity loss per event | 16,200 x $12 = $194,400 |
| Cost per event | $194,400 + $38,000 = $232,400 |
| **Annual loss** | 4 x $232,400 = **$929,600** (cash $152,000 + opportunity $777,600) |
| Hours lost per year | 72 (64,800 tonnes) |
| Total action cost | $2,000 + $6,000 + $3,000 + $14,000 + $25,000 = **$50,000** |
| Events per year after the fix (cautious) | 1 |
| Annual loss after | $232,400 |
| **Annual saving (verified)** | $929,600 - $232,400 = **$697,200** (cash $114,000 + opportunity $583,200) |
| Payback | $50,000 / ($697,200 / 12) = 0.86 months, about 4 weeks |
| Hours back | 72 - 18 = 54 hours = 48,600 tonnes |

Check of the split: after the fix, cash = 1 x $38,000 = $38,000 and opportunity = 1 x $194,400. Cash saving = $152,000 - $38,000 = $114,000. Opportunity saving = $777,600 - $194,400 = $583,200. Total $697,200. The app shows the split under "Annual saving (verified)".

## Scene 3: account

- Create account with a recording-only email and a throwaway password (not recorded in this file). Blur the email in the edit.
- Fields: Email, Password, Confirm password. Button: "Create account". Then "New investigation".

## Scene 4: Problem step

Card "Draft problem statement from notes", field "Rough notes". Type:

```
CV204 drive gearbox tripped on high oil temp 2:50am Tues, 4th time this year. Fitter says HS pinion bearing cooked, oil black and smells burnt. Cooler fins looked caked with dust. Stockpile feed stopped, belt down about 18 hrs. Motor was swapped in March.
```

Click "Draft problem statement from notes". The draft varies each run. Expect it to read roughly like the values below and to list "Not in your notes. Worth finding out:" items (for example the asset's operating hours, whether oil samples exist, the earlier three failures). If the draft is poor, edit the fields in the draft box to these values, then click "Use this draft".

| Field | Final value |
|---|---|
| Title | Repeat gearbox failures on overland conveyor CV-204 |
| Asset | Overland conveyor CV-204 drive gearbox |
| Site / area | Mine site, Pit 2 overland conveyor drive house |
| Date of event | 2026-10-13 |
| What happened? | The drive gearbox tripped on high oil temperature at 2:50 am. The high-speed pinion bearing had failed and the oil was black and smelled burnt. This is the fourth failure in twelve months. |
| Where on the equipment? | High-speed pinion bearing and oil system of the drive gearbox. |
| When did it happen? | 2:50 am on Tuesday 13 October 2026. Fourth time in twelve months. |
| What was the impact? | Conveyor and stockpile feed stopped for about 18 hours. Crews pulled off planned work for the call-out. Money is added in the next step. |

Asset details:

| Field | Value |
|---|---|
| Asset tag | CV-204 |
| Asset type | Gearbox |
| Make and model | Helical-bevel reducer, 315 kW |
| Duty or service | Overland conveyor drive |
| Criticality | A: Critical |
| Failure mode | Bearing failure |

## Scene 6: Loss step

Show "I have figures (rough is fine)" and "Not known yet". Then fill:

| Field | Value |
|---|---|
| How many times a year does it happen? | 4 |
| Downtime per event | 18 |
| Production rate | 900 |
| Unit name | tonnes |
| Margin per unit | 12 |
| Repair cost per event | 38000 |
| Currency symbol | $ |

Leave "Or one rough cost per year" empty. In "What happened to the production you lost?" keep "Lost for good" at 100%. Slide it briefly to show "Made up later" and "Covered by buffer stock", then return to 100%.

## Scene 7: Evidence step ("Add evidence", six times)

| # | Title | Type | Date | Note |
|---|---|---|---|---|
| E1 | Failed high-speed pinion bearing | Photo | 2026-10-14 | Cage broken, rollers blued from heat, wear track off centre. |
| E2 | Gearbox oil temperature trend, last 4 failures | Data / Trend | 2026-10-14 | Sump temperature climbs from 62 to 85 degrees over about three weeks before each trip. |
| E3 | Oil cooler inspection | Inspection | 2026-10-14 | About 70% of the cooler fins blocked with fine dust. |
| E4 | Oil sample after failure | Data / Trend | 2026-10-15 | Black oil, water 0.4%, silica 90 ppm. Breather element split. |
| E5 | Maintenance history, CV-204 | Document | 2026-10-15 | No alignment record after the motor change in March. No oil sample on file for two years. Cooler cleaning is not a PM task. |
| E6 | Operator and fitter interviews | Interview | 2026-10-15 | Cooler is behind a guard and not on the weekly round. Motor was aligned with a straight edge. |

For E1 optionally click "Add a photo" and upload any image (do not use a real customer photo).

## Scene 8: Cause tree

Top box (failure event) text if empty: `Overland conveyor CV-204 drive gearbox failed; conveyor tripped on high oil temperature`

Click "Why?" under the box shown. New boxes inherit the parent's type, so set "Type of cause" on each.

| Box | Under | Type of cause | Text | How sure are you? | Evidence that supports it |
|---|---|---|---|---|---|
| A1 | Failure event | Physical | Gearbox oil overheated and lost its protective film | Verified | E1, E2, E4 |
| A2 | A1 | Physical | Oil cooler fins were blocked with dust | Verified | E3 |
| A3 | A2 | Human | Cooler cleaning was missed on the weekly round | Verified | E6 |
| A4 | A3 | System / Latent | Cooler cleaning is not a scheduled task with an owner, and the cooler is behind a guard | Verified | E5, E6 |
| B1 | Failure event | Physical | Dust and water got into the gearbox oil | Verified | E4 |
| B2 | B1 | Physical | Breather element was saturated and split | Verified | E4 |
| B3 | B2 | Human | Breather condition was not checked and no oil sample was taken | Hypothesis | E5 |
| B4 | B3 | System / Latent | No oil sampling programme, and the breather is on no inspection route | Verified | E4, E5 |
| C1 | Failure event | Physical | High-speed bearing carried a side load from shaft misalignment | Hypothesis | E1 |
| C2 | C1 | Human | Motor was re-aligned with a straight edge after replacement in March | Hypothesis | E6 |
| C3 | C2 | System / Latent | No alignment standard, and no alignment check after a motor change | Hypothesis | none yet (link E5 during the Challenge step) |

Tick "This is a root cause" on A4, B4 and C3 (the three roots, R1, R2, R3).

## Scene 9: natural and forced

- A2 (cooler fins blocked): "Type of wear (optional)" -> "Forced deterioration".
- Show "Natural deterioration" as the alternative (for example, bearing end-of-life on A1 would be natural if the oil had been clean). Do not set it.
- Click the "5 Whys" and "Fishbone" tabs, then back to "Tree".

## Scene 10: Cause coach and Challenge my analysis

AI output varies and cannot be scripted. Run "Suggest causes for ..." on A1 or "Review the whole tree". Likely suggestions to look for: wrong oil grade or low oil level, cooling fan or airflow problem, belt over-tension or overload. Choose:

- Accept ("Add to tree") one that is genuinely new (for example oil level or grade).
- Dismiss "Overload or belt over-tension" if offered, and say why: the motor current trend shows no overload. If it is not offered, dismiss whichever suggestion the evidence does not support and change the spoken reason to match.
- "Challenge my analysis": the expected point is that C3 has no evidence or is not verified ("No evidence" or "Root cause not verified", marked "Fix first" or "Should fix"). Act on it: select C3, tick E5 under "Evidence that supports it", set it to Verified. If the challenge raises something else, act on that instead and adapt the spoken line.

## Scene 11: Actions step

Corrective:

| Field | Value |
|---|---|
| What will be done? | Rebuild gearbox with new high-speed pinion and bearings, flush the oil system and refill |
| Linked to | The failure event |
| Corrective or preventive? | Corrective |
| Category | Repair or restore |
| Owner | Mark Evans |
| Due date | 2026-10-30 |
| Status | In progress (later Done) |
| Cost | 0 (the repair cost is already counted in Loss) |

Preventive (use "Add preventive action" under each root cause):

| # | Fixes root cause | What will be done? | Category | Task description | Do this every | Interval unit | Craft or trade | New task or a change? | Owner | Due | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 | R1 (A4) | Clean oil cooler fins and record sump oil temperature | Maintenance task | Clean cooler fins and record sump oil temperature against the limit of 75 degrees | 4 | weeks | Mechanical fitter | New task | Jo Nguyen | 2026-12-11 | 2000 |
| P2 | R2 (B4) | Take gearbox oil sample and check the breather | Condition monitoring | Oil sample for water, particle count and wear metals; check breather element | 3 | months | Lubrication technician | New task | Priya Rao | 2026-12-18 | 6000 |
| P3 | R2 (B4) | Fit desiccant breathers on the gearbox | Design or equipment change | (none) | | | | | Priya Rao | 2027-01-15 | 3000 |
| P4 | R3 (C3) | Issue a laser alignment standard, buy a laser tool, train the fitters, and require an alignment record after any motor or gearbox change | Procedure or standard | (none) | | | | | Mark Evans | 2027-01-29 | 14000 |
| P5 | R2 (B4) | Hold one spare high-speed pinion and bearing set | Spares holding | (none) | | | | | Jo Nguyen | 2027-02-26 | 25000 |

Total action cost: $50,000. Six actions.

Spares check card ("Was the right spare there when it failed?"):

| Field | Value |
|---|---|
| Was a spare part needed? | Yes |
| Was it in stock? | No |
| Supplier lead time | 112 (days, about 16 weeks) |
| How was the gap covered? | Borrowed a pinion set from the sister gearbox on CV-205 |

"Maintenance plan changes" should then list P1 and P2 with their intervals (4 weeks, 3 months) and craft.

## Scene 12: Suggested actions and Quality check

On root cause R3 click "Suggested actions" (output varies). Click "Add to actions" on one useful suggestion (if it duplicates P4, add it and then delete the duplicate, or dismiss it and say so). Dismiss another. Then open the Quality check panel and fix any "Fix first" or "Should fix" point (for example a missing interval or an unlinked action).

## Scene 13: Verify step (recorded as if some months later)

First set Status to Done on every action (Actions step).

| Field | Value |
|---|---|
| Review date | 2027-05-18 |
| Has the failure recurred since the actions were completed? | No, it has not recurred |
| Expected events per year after the fix | 1 |
| What did you find? | No gearbox trips since the actions were completed. Oil temperature steady at 64 to 68 degrees. Cooler clean at each 4-weekly check. Two oil samples within limits. Alignment record on file. |

Expected on screen: Annual loss before $929,600 (cash $152,000, opportunity $777,600); Annual loss after $232,400; "Annual saving (verified)" $697,200; Total action cost $50,000; Payback period about 0.9 months (0.86).

"Roll this fix out" (Add a similar asset): tag `CV-205`, duty `Overland conveyor drive`, "Add to the register"; then tag `CV-206`, same duty. Create the checks. What to check: `Check oil cooler fins, breather and oil sample; confirm an alignment record exists`. Who will check it: `Jo Nguyen`. Check due: `2027-06-30`.

## Scene 14: Report step

Write-up drafting box, audience note: `The audience is the general manager. Keep it short.` Click "Management summary (1 page)". Edit one sentence. Click "Print / Save as PDF".
