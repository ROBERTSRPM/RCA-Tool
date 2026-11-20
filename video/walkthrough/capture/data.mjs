// Values typed on screen: video/walkthrough/example-data.md
export const NOTES = "Thurs 4:00am end-of-line seal check Line 3, chicken and rice trays. Took 3 packs to leak tester, 2 bubbling from the flange. Last good check was 2:00am so about 6,000 packs on hold. Seals look weak along one side. Retailer complained about slack packs last month. 6th time this year. New film batch started Tues. Changeover Wed night.";
export const PROBLEM = {
  title: "Repeat leaking packs from Line 3 tray sealer",
  asset: "Line 3 tray sealer",
  site: "Chilled ready-meals, Packing hall, Line 3",
  date: "2026-10-15",
  what: "At the 4:00 am end-of-line seal check, 2 of 3 chicken and rice packs leaked in the leak tester. Weak seals along the tray flange. About 6,000 packs packed since the last good check at 2:00 am put on hold. This is the 6th event in twelve months.",
  where: "Heat seal of the lidding film to the tray flange on the Line 3 tray sealer.",
  when: "Made on night shift since 2:00 am, found at the 4:00 am seal check on Thursday 15 October 2026. 6th time in twelve months.",
  impact: "About 6,000 packs on hold, line stopped for investigation, and a retailer complaint about slack packs last month. Money is added in the next step.",
};
export const LINE = { line: "Line 3", product: "Chicken and rice, 480 g tray", pack: "Modified-atmosphere tray, lidding film", step: "Tray sealing (heat seal)", mode: "Seal failure (leaking pack)" };
export const LOSS = { events: "6", hours: "8", rate: "3000", unit: "packs", margin: "0.45", repair: "1200", cur: "$" };
export const OTHER = [["Scrapped product", "14500"], ["Product on hold", "3200"], ["Customer claims and credits", "6800"], ["Retailer penalties", "5000"], ["Rework", "2400"]];
export const EVIDENCE = [
  ["Leaking pack, seal cut open", "Photo", "2026-10-15", "Bubbles from the flange in the leak tester; cut open, unsealed channel about 6 mm wide, no seal pattern on one side."],
  ["Sealing jaw temperature log, Line 3", "Data / Trend", "2026-10-15", "Jaw surface reads 158 degrees against a setpoint of 175. Drifted down over 3 weeks."],
  ["Sealing jaw and seal plate inspection", "Inspection", "2026-10-15", "Silicone insert cut and flattened, uneven pressure; marks on the seal plate."],
  ["PLC settings and changeover record", "Document", "2026-10-16", "After Wednesday changeover, dwell cut from 1.2 to 0.9 seconds and speed raised to 34 cycles a minute. Settings not locked."],
  ["Film specification, maintenance and QA records", "Document", "2026-10-16", "New film batch has a different seal layer, no change notice. Silicone last replaced 14 months ago. PM has no jaw temperature check. Seal check: 3 packs every 2 hours."],
  ["Operator and QA interviews", "Interview", "2026-10-16", "Behind on the order, so speed was raised. Seal check is only 3 packs every 2 hours. Nobody was told the film had changed."],
];
export const FAILURE = "Line 3 tray sealer produced leaking packs, found at the end-of-line seal check";
// id, parent id (null = failure event, "sib:X" = sibling of X), type, area, text, status, evidence numbers, root
export const TREE = [
  ["A1", null, "Physical", "Equipment", "Seals were weak or incomplete along the tray flange", "Verified", [1]],
  ["A2", "A1", "Physical", "Equipment", "Sealing jaw ran 17 degrees below setpoint, with worn silicone", "Verified", [2, 3]],
  ["A3", "A2", "System / Latent", "Method", "The maintenance plan has no jaw temperature check and no silicone replacement interval", "Verified", [3, 5], true],
  ["B1", "sib:A1", "Physical", "Method", "Seal temperature and dwell were below the recipe for this film", "Verified", [4]],
  ["B2", "B1", "Human", "People", "Operators raised speed and cut dwell to keep up with the order", "Verified", [4, 6]],
  ["B3", "B2", "System / Latent", "Method", "Sealing settings are not locked, and the shift target counts packs per hour only", "Verified", [4, 6], true],
  ["C1", "sib:A1", "Physical", "Materials", "New film batch has a different seal layer that needs more heat", "Verified", [5]],
  ["C2", "C1", "Human", "Method", "The new film batch was accepted without telling QA or production", "Hypothesis", [6]],
  ["C3", "C2", "System / Latent", "Method", "No change control for film supplier or specification", "Hypothesis", [], true],
  ["D1", "sib:A1", "Human", "Measurement", "Seal check is 3 packs every 2 hours, so leakers made between checks reach customers and the whole 2 hours goes on hold", "Verified", [5, 6]],
  ["D2", "D1", "System / Latent", "Measurement", "Check frequency and sample size are not based on risk, with no check at changeover or after a jaw or film change, and no in-line detection", "Verified", [5, 6], true],
];
export const ACTIONS = {
  corrective: { what: "Replace jaw silicone and seal plate, recalibrate jaw temperature controllers, re-test and release or scrap held product", link: "The failure event", cat: "Repair or restore", owner: "Dana Kovacs", due: "2026-11-27", status: "In progress", cost: "0" },
  preventive: [
    { root: "A3", what: "Check jaw temperature with a probe and inspect the silicone; replace the silicone every 3 months", cat: "Maintenance task", task: "Probe jaw surface temperature against setpoint 175, inspect silicone and seal plate", every: "1", unit: "weeks", craft: "Maintenance fitter", change: "A new task", owner: "Sam Ortiz", due: "2026-12-04", cost: "1500" },
    { root: "B3", what: "Lock sealing settings by product recipe with recall at changeover, set speed and dwell limits, and change the shift target to good packs", cat: "Design or equipment change", owner: "Priya Rao", due: "2027-01-15", cost: "6500" },
    { root: "C3", what: "Introduce change control for film supplier and specification, with an incoming seal-layer check and QA sign-off", cat: "Procedure or standard", owner: "Lee Tran", due: "2026-12-18", cost: "2000" },
    { root: "D2", what: "Seal check every hour on 3 packs, plus a check at start-up, after changeover and after any jaw or film change, with records", cat: "Procedure or standard", owner: "Lee Tran", due: "2026-12-11", cost: "1000" },
    { root: "D2", what: "Buy a faster bench leak tester for Line 3 (shorter check time, so checks can be more frequent)", cat: "Design or equipment change", owner: "Priya Rao", due: "2027-01-29", cost: "9200" },
  ],
};
export const VERIFY = { date: "2027-05-18", recurred: "No, it has not recurred", events: "1", found: "No leaking packs from Line 3 since the actions were completed. Jaw temperature within 3 degrees of setpoint at each weekly check. Hourly seal checks and changeover checks all passed. Settings locked by recipe. No film change without QA sign-off." };
export const ROLL = { tags: ["L1-TS", "L2-TS"], duty: "Tray sealing", what: "Check jaw temperature, silicone, locked settings, hourly seal check and changeover check", who: "Sam Ortiz", due: "2027-06-30" };
export const AUDIENCE = "The audience is the general manager. Keep it short.";
