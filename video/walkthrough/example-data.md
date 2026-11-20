# Walkthrough example data: everything typed on screen

One example, kept consistent across the voice, the screen and the maths. All figures are illustrative. Labels below are the exact labels in the live app (https://www.rcapilot.com). Type the values exactly as shown so the recording matches the voiceover.

Scenario: Line 3 tray sealer at a chilled ready-meal plant (ready-meal tray, 480 g, modified-atmosphere pack). A process or quality failure: weak seals, leaking packs found at the operator's end-of-line seal check (3 packs every 2 hours, leak tester). 6 events in 12 months.

## The numbers (computed the way `web/lib/finance.ts` does)

| Item | Value |
|---|---|
| Events per year | 6 |
| Downtime per event | 8 hours (line stopped, held product sorted, jaws checked and reset, line restarted) |
| Production rate | 3,000 packs/hour |
| Margin per unit | $0.45 per pack |
| Repair cost per event (maintenance call-out and parts) | $1,200 |
| Other costs per event | Scrapped product $14,500 (about 4,800 packs); Product on hold $3,200 (sorting and testing 6,000 packs);  Customer claims and credits $6,800 (slack packs that slipped through between checks); Retailer penalties $5,000; Rework $2,400 (about 1,200 packs repacked) (total $31,900) |
| Packs on hold per event | About 6,000 (2 hours at 3,000 an hour since the last good check): about 4,800 scrapped, about 1,200 reworked (repacked) |
| Shares | 100% lost for good, 0% made up, 0% buffer (the line runs at capacity) |
| Lost production per event | 8 x 3,000 = 24,000 packs |
| Opportunity loss per event | 24,000 x $0.45 = $10,800 |
| Cash per event | $1,200 + $31,900 = $33,100 |
| Cost per event | $33,100 + $10,800 = $43,900 |
| **Annual loss** | 6 x $43,900 = **$263,400** (cash $198,600 + opportunity $64,800) |
| Hours lost per year | 48 (144,000 packs) |
| Total action cost | $0 + $1,500 + $6,500 + $2,000 + $1,000 + $9,200 = **$20,200** |
| Events per year after the fix (cautious) | 1 |
| Annual loss after | $43,900 (cash $33,100 + opportunity $10,800) |
| **Annual saving (verified)** | $263,400 - $43,900 = **$219,500** (cash $165,500 + opportunity $54,000) |
| Payback | $20,200 / ($219,500 / 12) = 1.10 months, about 5 weeks |
| Hours back | 48 - 8 = 40 hours = 120,000 packs |

Check of the split: cash saving = $198,600 - $33,100 = $165,500. Opportunity saving = $64,800 - $10,800 = $54,000. Total $219,500.

## Scene 3: account

- Show the sign-up form (Email, Password, Confirm password, "Create account") with no real email visible. Do not submit it on camera.
- Cut to a prepared, signed-in, empty account (no investigations). No email visible. Then "New investigation".

## Scene 4: Problem step

First, under "Type of failure", click "Process or quality failure" (the other choice is "Equipment failure"). Card "Draft problem statement from notes", field "Rough notes". Type:

```
Thurs 4:00am end-of-line seal check Line 3 trays. Took 3 packs to leak tester, 2 bubbling from the flange. Last good check was 2:00am so about 6,000 packs on hold. Seals look weak along one side. Retailer complained about slack packs last month. 6th time this year. New film batch started Tues. Changeover Wed night.
```

Click "Draft problem statement from notes". The draft varies each run. Expect it to list "Not in your notes. Worth finding out:" items (for example the seal temperature log, the check results since 2:00 am, the earlier five events). If the draft is poor, edit the fields in the draft box to these values, then click "Use this draft".

| Field | Final value |
|---|---|
| Title | Repeat leaking packs from Line 3 tray sealer |
| Line or process (labelled "Line or process" for a process failure) | Line 3 tray sealer |
| Site / area | Chilled ready-meals, Packing hall, Line 3 |
| Date of event | 2026-10-15 |
| What happened? | At the 4:00 am end-of-line seal check, 2 of 3 packs leaked in the leak tester. Weak seals along the tray flange. About 6,000 packs packed since the last good check at 2:00 am put on hold. This is the 6th event in twelve months. |
| Where in the process? | Heat seal of the lidding film to the tray flange on the Line 3 tray sealer. |
| When did it happen? | Made on night shift since 2:00 am, found at the 4:00 am seal check on Thursday 15 October 2026. 6th time in twelve months. |
| What was the impact? | About 6,000 packs on hold, line stopped for investigation, and a retailer complaint about slack packs last month. Money is added in the next step. |

## Scene 5: Quality reference and Line / process details

In the "1. Describe the problem" card, directly under "Type of failure", is the optional "Quality reference (NCR / CAPA number)" (placeholder "e.g. NCR-2291"): type `NCR-2291`. Spoken: the RCA can feed the site's QA / CAPA system through this reference.

Then scroll to the card "Line / process details" (it replaces "Asset details" for a process failure). Fill:

| Field | Value |
|---|---|
| Line | Line 3 |
| Product | Ready meal, 480 g tray |
| Pack type | Modified-atmosphere tray, lidding film |
| Process step | Tray sealing (heat seal) |
| Asset tag (optional) | leave empty |
| Failure mode | Seal failure (leaking pack) (pick it from the list; you can also type your own) |

The card also has Asset type, Make and model, Duty or service and Criticality. They are optional: leave them empty.

## Scene 6: Loss step

Show "I have figures (rough is fine)" and "Not known yet". Then fill:

| Field | Value |
|---|---|
| How many times a year does it happen? | 6 |
| Downtime per event | 8 |
| Production rate | 3000 |
| Unit name | packs |
| Margin per unit | 0.45 |
| Repair cost per event | 1200 |
| Currency symbol | $ |

Leave "Or one rough cost per year" empty. Under "Other costs per event (optional)", use the quick-add presets (Category, Description, Amount per event):

| Preset | Amount per event |
|---|---|
| Scrapped product | 14500 |
| Product on hold | 3200 |
| Customer claims and credits | 6800 |
| Retailer penalties | 5000 |
| Rework | 2400 |

Keep "Lost for good" at 100%. Slide it briefly to show the other two, then return to 100%. Expected panel: Lost production per event 24,000 packs; Cash costs $33,100; Opportunity loss $10,800; Cost per event $43,900; Annual loss $263,400; Hours lost 48.

## Scene 7: Evidence step ("Add evidence", six times)

| # | Title | Type | Date | Note |
|---|---|---|---|---|
| E1 | Leaking pack, seal cut open | Photo | 2026-10-15 | Bubbles from the flange in the leak tester; cut open, unsealed channel about 6 mm wide, no seal pattern on one side. |
| E2 | Sealing jaw temperature log, Line 3 | Data / Trend | 2026-10-15 | Jaw surface reads 158 degrees against a setpoint of 175. Drifted down over 3 weeks. |
| E3 | Sealing jaw and seal plate inspection | Inspection | 2026-10-15 | Silicone insert cut and flattened, uneven pressure; marks on the seal plate. |
| E4 | PLC settings and changeover record | Document | 2026-10-16 | After Wednesday changeover, dwell cut from 1.2 to 0.9 seconds and speed raised to 34 cycles a minute. Settings not locked. |
| E5 | Film specification, maintenance and QA records | Document | 2026-10-16 | New film batch has a different seal layer, no change notice. Silicone last replaced 14 months ago. PM has no jaw temperature check. Seal check: 3 packs every 2 hours. |
| E6 | Operator and QA interviews | Interview | 2026-10-16 | Behind on the order, so speed was raised. Seal check is only 3 packs every 2 hours. Nobody was told the film had changed. |

For E1 optionally click "Add a photo" and upload any image (do not use a real customer photo).

## Scene 8: Cause tree

Top box (failure event) text if empty: `Line 3 tray sealer produced leaking packs, found at the end-of-line seal check`

Click "Why?" under the box shown. New boxes inherit the parent's type, so set "Type of cause" on each. Also tap one "Cause area" button on each cause (optional: Equipment, Materials, Method, Measurement, People or Environment; tap again to clear). The area shows on the card as, for example, "Physical · Materials", and the Fishbone tab can group by it.

| Box | Under | Type of cause | Cause area | Text | How sure are you? | Evidence that supports it |
|---|---|---|---|---|---|---|
| A1 | Failure event | Physical | Equipment | Seals were weak or incomplete along the tray flange | Verified | E1 |
| A2 | A1 | Physical | Equipment | Sealing jaw ran 17 degrees below setpoint, with worn silicone | Verified | E2, E3 |
| A3 | A2 | System / Latent | Method | The maintenance plan has no jaw temperature check and no silicone replacement interval | Verified | E3, E5 |
| B1 | Failure event | Physical | Method | Seal temperature and dwell were below the recipe for this film | Verified | E4 |
| B2 | B1 | Human | People | Operators raised speed and cut dwell to keep up with the order | Verified | E4, E6 |
| B3 | B2 | System / Latent | Method | Sealing settings are not locked, and the shift target counts packs per hour only | Verified | E4, E6 |
| C1 | Failure event | Physical | Materials | New film batch has a different seal layer that needs more heat | Verified | E5 |
| C2 | C1 | Human | Method | The new film batch was accepted without telling QA or production | Hypothesis | E6 |
| C3 | C2 | System / Latent | Method | No change control for film supplier or specification | Hypothesis | none yet (link E5 during the Challenge step) |
| D1 | Failure event | Human | Measurement | Seal check is 3 packs every 2 hours, so leakers made between checks reach customers and the whole 2 hours goes on hold | Verified | E5, E6 |
| D2 | D1 | System / Latent | Measurement | Check frequency and sample size are not based on risk, with no check at changeover or after a jaw or film change, and no in-line detection | Verified | E5, E6 |

Tick "This is a root cause" on A3, B3, C3 and D2 (the four roots).

## Scene 9: natural, forced and not applicable

- A2 (jaw and silicone): under "Type of wear" choose "Forced deterioration". Spoken reason: silicone wear is natural, but running it 14 months past a sensible life with no prompt is wear we allowed. Show "Natural deterioration" as the alternative. Do not set it.
- B1 (recipe settings below spec): choose "Not applicable" (a process cause, no wear).
- Click the "5 Whys" and "Fishbone" tabs. The Fishbone has "Group by: Level / Cause area" and opens by Cause area for a process failure (columns Equipment, Materials, Method, Measurement, People, Environment). Show it by Cause area, click "Level" to show Physical / Human / System, then back to "Tree".

## Scene 10: Cause coach and Challenge my analysis

AI output varies and cannot be scripted. Run "Suggest causes for ..." on A1 or "Review the whole tree". Likely suggestions: product or sauce on the tray flange, gas flush mix, film tension. Choose:

- Accept ("Add to tree") one that is genuinely new (for example product contaminating the flange).
- Dismiss "gas mix" if offered, and say why: residual oxygen readings were in spec. If it is not offered, dismiss whichever suggestion the evidence does not support and change the spoken reason.
- "Challenge my analysis": the expected point is that C3 has no evidence or is not verified. Act on it: select C3, tick E5 under "Evidence that supports it", set it to Verified. If the challenge raises something else, act on that and adapt the spoken line.

## Scene 11: Actions step

Corrective:

| Field | Value |
|---|---|
| What will be done? | Replace jaw silicone and seal plate, recalibrate jaw temperature controllers, re-test and release or scrap held product |
| Linked to | The failure event |
| Corrective or preventive? | Corrective |
| Category | Repair or restore |
| Owner | Dana Kovacs |
| Due date | 2026-10-20 |
| Status | In progress (later Done) |
| Cost | 0 (the call-out and parts are already counted in Loss) |

Preventive (use "Add preventive action" under each root cause):

| # | Fixes root cause | What will be done? | Category | Task description | Do this every | Interval unit | Craft or trade | New task or a change? | Owner | Due | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 | A3 | Check jaw temperature with a probe and inspect the silicone; replace the silicone every 3 months | Maintenance task | Probe jaw surface temperature against setpoint 175, inspect silicone and seal plate | 1 | weeks | Maintenance fitter | New task | Sam Ortiz | 2026-11-06 | 1500 |
| P2 | B3 | Lock sealing settings by product recipe with recall at changeover, set speed and dwell limits, and change the shift target to good packs | Design or equipment change | (none) | | | | | Priya Rao | 2026-12-04 | 6500 |
| P3 | C3 | Introduce change control for film supplier and specification, with an incoming seal-layer check and QA sign-off | Procedure or standard | (none) | | | | | Lee Tran | 2026-11-20 | 2000 |
| P4 | D2 | Seal check every hour on 3 packs, plus a check at start-up, after changeover and after any jaw or film change, with records | Procedure or standard | (none) | | | | | Lee Tran | 2026-11-06 | 1000 |
| P5 | D2 | Buy a faster bench leak tester for Line 3 (shorter check time, so checks can be more frequent) | Design or equipment change | (none) | | | | | Priya Rao | 2026-12-11 | 9200 |

Total action cost: $20,200. Six actions.

"Maintenance plan changes" should list P1 with its interval (1 weeks) and craft.

## Scene 12: Suggested actions and Quality check

On root cause C3 click "Suggested actions" (output varies). Click "Add to actions" on one useful suggestion (if it duplicates P3, add it and then delete the duplicate, or dismiss it and say so). Dismiss another. Then open the Quality check panel and fix any "Fix first" or "Should fix" point.

## Scene 13: Verify step (recorded as if some months later)

First set Status to Done on every action (Actions step).

| Field | Value |
|---|---|
| Review date | 2027-05-18 |
| Has the failure recurred since the actions were completed? | No, it has not recurred |
| Expected events per year after the fix | 1 |
| What did you find? | No leaking packs from Line 3 since the actions were completed. Jaw temperature within 3 degrees of setpoint at each weekly check. Hourly seal checks and changeover checks all passed. Settings locked by recipe. No film change without QA sign-off. |

Expected on screen: Annual loss before $263,400 (cash $198,600, opportunity $64,800); Annual loss after $43,900; "Annual saving (verified)" $219,500; Total action cost $20,200; Payback period about 1.1 months (1.10).

"Roll this fix out" (click "Add a similar asset that is not listed", then the "Add a similar asset" form): tag `L1-TS` (Line 1 tray sealer) and `L2-TS` (Line 2 tray sealer), duty `Tray sealing`, "Add to the register". Then click "Create 2 rollout checks". What to check: `Check jaw temperature, silicone, locked settings, hourly seal check and changeover check`. Who will check it: `Sam Ortiz`. Check due: `2027-06-30`.

## Scene 14: Report step

In the "Write-up drafting" card, the audience note box (placeholder "e.g. The audience is the site manager. Keep it short."): type `The audience is the general manager. Keep it short.` Click "Management summary (1 page)". Edit one sentence. Click "Print / Save as PDF".
