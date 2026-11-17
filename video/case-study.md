# Case study data sheet: slurry pump P-101 (ILLUSTRATIVE EXAMPLE)

All numbers on this page are illustrative. They were chosen to show the method and are not benchmarks, not from any real site and not from any study.

## 1. Assumptions

| Item | Value | Note |
|---|---|---|
| Equipment | Slurry feed pump, tag P-101 (illustrative tag) | Single pump, no standby |
| Buffer capacity | None | Pump stop = line stop, so lost hours = lost production hours |
| Failures in 12 months (before) | 6 | 3 mechanical seal events, 3 bearing events |
| Hours lost per failure | 14 h | Diagnose, isolate, drain, rebuild, restart |
| Production rate | 120 t/h | Line rate while running |
| Margin per tonne | $18/t | Contribution margin; lost tonnes are not made up later |
| Repair cost per event | $9,500 | Parts, labour, contractor and consumables |
| Failures per year (after) | 0 | Measured over 12 months after actions: no breakdowns, so no breakdown loss ($0) |
| Wear after the fix | Natural wear only | Bearings and seals still wear. The wear is monitored and the parts are changed in a planned shutdown (section 7) |
| Not counted | Secondary damage, overtime premium, delayed planned work, environmental clean-up | Conservative: real loss is higher |

## 2. Problem statement

P-101 slurry feed pump failed 6 times in 12 months (3 mechanical seal, 3 bearing), losing 84 hours of production and costing $238,440 per year in lost margin and repair.

## 3. Cause tree (level by level)

Levels: P = physical cause, H = human cause, S = system (latent) cause. Root causes are marked ROOT.

- PROBLEM: Repeat bearing and mechanical seal failures on P-101
  - A. Bearings fail early
    - A1. (P) Pump runs at about 60% of best efficiency flow, so radial load on the shaft is high
      - (H) Operators throttle the discharge valve to match downstream demand
        - (S) ROOT 1: Pump duty was never reviewed after throughput changed; the pump is sized for the old, higher throughput; no management-of-change trigger for duty changes
    - A2. (P) Coupling misalignment and a soft foot after rebuilds
      - (H) Fitters align by straight edge and feel; soft foot is not checked
        - (S) ROOT 2: No precision alignment standard (method, tolerance, record), no laser tool, fitters not trained
        - (S) ROOT 4: No verification after repair (alignment record, vibration reading) before handover
    - A3. (P) Bearing oil contaminated with water and solids (worn housing seals, open breather)
      - (H) Wash-down hose aimed at bearing housings; oil topped up from open containers
        - (S) ROOT 3: Rebuild procedure gaps: reuses worn housing seals, no sealed-breather or isolator standard, no soft foot check
        - (S) ROOT 5b: Oil condition not on any inspection route
  - B. Mechanical seals fail early
    - B1. (P) Seal faces run dry or hot because flush flow is restricted (strainer packed, flush valve part closed)
      - (H) Flush strainer not checked; flush valve position not verified after maintenance
        - (S) ROOT 5a: Flush is on no inspection route; no flow indicator or low-flow alarm
    - B2. (P) Seal faces and sleeve see excess shaft movement
      - Driven by A1 (off best efficiency point) and A2 (misalignment); same roots 1, 2 and 4
    - B3. (P) Seal set length not controlled on rebuild
      - (H) Seal set by experience, not recorded
        - (S) ROOT 3 (again): rebuild procedure has no seal setting step or check
  - C. Cross-cutting
    - C1. (S) ROOT 6: Failures coded only as "bearing failure" or "seal failure" in the maintenance system, so the repeat pattern and causes were invisible

Summary of system-level root causes: 1 duty not reviewed after process change; 2 no precision alignment standard; 3 rebuild procedure gaps; 4 no post-repair verification; 5 flush and oil condition not inspected (5a flush, 5b oil); 6 failure coding hides repeats.

## 4. Evidence for each cause

| Cause | Evidence gathered | How it verifies the cause |
|---|---|---|
| A1 Off best efficiency point | DCS flow trend, discharge valve position log, pump curve overlay | Flow sits at about 60% of best efficiency flow for most operating hours; the pump is run away from the point it was selected for |
| A2 Misalignment and soft foot | Off-centre wear track on bearing races; soft foot check on installed pump; maintenance system search | Wear pattern is typical of misalignment; one foot lifts when its bolt is loosened; no alignment record exists for 4 of 6 rebuilds |
| A3 Contaminated oil | Oil samples at teardown; inspection of housing seals and breather | Water and solids found at teardown; housing seals worn; breather vent open to wash-down |
| B1 Restricted flush | Seal face inspection; flush flow reading; strainer inspection | Faces scored and heat cracked (ran dry or hot); measured flush flow below design; strainer found packed with solids |
| B2 Excess shaft movement | Same as A1 and A2 | Seal damage pattern consistent with shaft deflection and misalignment |
| B3 Seal set length | Rebuild job cards and fitter interview | No set length recorded on any of the 3 seal rebuild cards |
| Root 1 Duty not reviewed | Throughput change history, pump size vs current duty, change records | Throughput changed with no pump duty review on file |
| Root 2 No alignment standard | Work instructions and training records | No document stating method, tolerance or record; no laser tool on site; no training records |
| Root 3 Rebuild procedure gaps | Review of rebuild procedure | No seal setting step, no soft foot check, housing seals reused |
| Root 4 No verification | Job close-out records | Pump returned to service without alignment or vibration reading |
| Root 5 Flush and oil not inspected | Inspection route and PM list | Neither flush flow nor oil condition appears on any route |
| Root 6 Failure coding | Maintenance system history | Six events logged under two generic codes with no cause field filled |

Test used for each cause: "If this cause is true, what else must be true?" Then look for that evidence. A cause with no supporting evidence is dropped (example: a suspected bad bearing batch was dropped because bearings from other batches failed the same way).

## 5. Action list

| # | Action | Fixes | Owner (role) | Due (weeks from sign-off) | Cost |
|---|---|---|---|---|---|
| 1 | Fit a variable speed drive (VSD) and slow the pump, so it runs near its best efficiency point with the discharge valve wide open | Root 1 | Reliability engineer with process engineer | Week 8 (needs shutdown) | $28,000 |
| 2 | Upgrade seal flush: flow indicator, clean strainer, add to inspection route | Root 5a | Mechanical supervisor | Week 4 | $12,000 |
| 3 | Write alignment standard, buy laser alignment tool, train fitters | Root 2 | Maintenance manager | Standard week 4; training week 8 | $8,000 |
| 4 | Fit bearing housing isolators and sealed breathers; add oil condition check to route; write rebuild checklist with seal setting, soft foot check, alignment record and vibration reading before handover | Roots 3, 4, 5b | Mechanical supervisor and planner | Week 6 | $7,000 |
| 5 | Engineering and project time | All | Reliability engineer | Weeks 1 to 8 | $5,000 |
| 6 | Add pump duty to the management-of-change checklist | Root 1 | Plant engineering manager | Week 3 | $0 |
| 7 | Add cause and failure-mode fields to repair coding | Root 6 | Maintenance planner | Week 3 | $0 |
| 8 | Effectiveness check: report failures, hours and cost at 90 days and 12 months | All | Reliability engineer, reported to plant manager | Week 13 and week 52 | $0 |

Total one-time cost: $28,000 + $12,000 + $8,000 + $7,000 + $5,000 = $60,000.

## 6. Calculations (all recomputed and checked)

Cost items in the fix: Variable speed drive on the pump (slow the pump, valve wide open) $28,000; Seal flush upgrade (flow indicator, strainer, piping) $12,000; Laser alignment tool, alignment standard, fitter training $8,000; Bearing housing isolators, sealed breathers, rebuild checklist and verification kit $7,000; Engineering and project time $5,000.

**Per failure**
- Lost production per failure = 14 h x 120 t/h = 1,680 t
- Lost margin per failure = 1,680 t x $18/t = $30,240
- Repair cost per failure = $9,500
- Total cost per failure = $30,240 + $9,500 = $39,740

**Before**
- Hours lost per year = 6 x 14 h = 84 h
- Annual loss before = 6 x $39,740 = $238,440
  - Check: 6 x $30,240 = $181,440; 6 x $9,500 = $57,000; sum = $238,440

**After (12 months later: zero breakdowns)**
- Annual breakdown loss after = 0 x $39,740 = $0

**Saving and payback**
- Annual saving = $238,440 - $0 = $238,440
- Payback = $60,000 / $238,440 = 0.25 years (0.2516) = 0.2516 x 12 = about 3 months (3.0 months, about 13 weeks)

**Capacity released (hidden plant)**
- Hours recovered = 6 x 14 h = 84 h
- Tonnes recovered = 84 h x 120 t/h = 10,080 t
- Margin on recovered tonnes = 10,080 t x $18/t = $181,440
- Repair cost avoided = 6 x $9,500 = $57,000
- Cross-check: $181,440 + $57,000 = $238,440, which equals the annual saving of $238,440.

Simple payback ignores the time value of money, tax and the cost of capital. It is used here only to show the order of magnitude.

## 7. Natural versus forced deterioration (scene 16 closing beat)

Bearings and seals still wear after the fix. That is natural deterioration and no analysis removes it. What the RCA removed was forced deterioration: the wear the plant was causing itself (running off the best efficiency point, misalignment and soft foot, contaminated oil, a starved seal flush).

| | Natural deterioration | Forced deterioration |
|---|---|---|
| Status after the fix | Managed | Removed |
| What it is | Normal wear of bearings and seals | Wear we caused ourselves |
| Handled by | Vibration, oil and flush checks; parts changed in a planned shutdown, before they fail | Roots 1 to 5 fixed (variable speed drive, alignment standard, sealed housings, flush indicator, rebuild checklist) |

## 8. Presenter story (scene 2, not part of the case data)

The presenter tells a real experience: a bucket conveyor feeding the packaging lines failed about 4 times in one year, each time stopping production and packaging. There were no spare buckets on site, so the least worn buckets were stripped out of damaged sets to get running. New buckets had to be made to order and air freighted, adding cost and waiting, and the lines ran on salvaged parts and were exposed to the next failure. No dollar figures are given for the story, so none appear on screen. The animation card shows only: "4 failures in 12 months", "No spares on site", "Made to order, air freighted".

## 9. Final numbers at a glance

Per failure $39,740. Before: 6 failures, 84 h, $238,440 a year. After: 0 failures, $0 breakdown loss. Saving $238,440 a year. Cost $60,000. Payback $60,000 / $238,440 = 0.25 years = about 3 months. Recovered: 84 h and 10,080 t.
