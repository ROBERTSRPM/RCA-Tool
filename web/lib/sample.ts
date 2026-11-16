import type {
  ActionItem,
  CauseNode,
  EvidenceItem,
  Investigation,
} from "./types";

export const SAMPLE_ID = "sample-p101";
/** updatedAt of a sample nobody has edited (every edit stamps a new time). */
export const SAMPLE_UPDATED_AT = "2026-02-02T08:00:00.000Z";
export const SAMPLE_NOTE =
  "Illustrative sample. Names, figures and events are invented to show how a finished investigation looks.";

function node(
  id: string,
  text: string,
  category: CauseNode["category"],
  status: CauseNode["status"],
  evidenceIds: string[],
  children: CauseNode[] = [],
  isRootCause = false,
): CauseNode {
  return { id, text, category, status, evidenceIds, isRootCause, collapsed: false, children };
}

const evidence: EvidenceItem[] = [
  {
    id: "ev-a1",
    type: "data",
    title: "A1: DCS flow trend, discharge valve log and pump curve overlay",
    note: "Flow sits at about 60% of best efficiency flow for most operating hours. The pump is run away from the point it was selected for. Discharge valve position log shows it throttled most of the time.",
    date: "2025-02-14",
    image: null,
  },
  {
    id: "ev-a2",
    type: "inspection",
    title: "A2: Bearing race wear track, soft foot check, maintenance history search",
    note: "Off-centre wear track on the bearing races, typical of misalignment. One foot lifts when its bolt is loosened. No alignment record exists for 4 of the 6 rebuilds.",
    date: "2025-02-18",
    image: null,
  },
  {
    id: "ev-a3",
    type: "photo",
    title: "A3: Oil samples at teardown, housing seal and breather inspection",
    note: "Water and solids found in the oil at teardown. Housing seals are worn and the breather vent is open to wash-down.",
    date: "2025-02-12",
    image: null,
  },
  {
    id: "ev-b1",
    type: "inspection",
    title: "B1: Seal face inspection, flush flow reading, strainer inspection",
    note: "Seal faces scored and heat cracked (ran dry or hot). Measured flush flow is below design. Strainer found packed with solids.",
    date: "2025-02-19",
    image: null,
  },
  {
    id: "ev-b3",
    type: "document",
    title: "B3: Rebuild job cards and fitter interview",
    note: "No set length is recorded on any of the 3 seal rebuild cards. Fitters set the seal by experience.",
    date: "2025-02-21",
    image: null,
  },
  {
    id: "ev-r1",
    type: "document",
    title: "Root 1: Throughput change history, impeller size vs current duty, change records",
    note: "Throughput changed with no pump duty review on file. The impeller is oversized for the current duty.",
    date: "2025-02-24",
    image: null,
  },
  {
    id: "ev-r2",
    type: "document",
    title: "Root 2: Work instructions and training records",
    note: "No document states an alignment method, tolerance or record. No laser tool on site and no training records.",
    date: "2025-02-24",
    image: null,
  },
  {
    id: "ev-r3",
    type: "document",
    title: "Root 3: Review of the rebuild procedure",
    note: "No seal setting step, no soft foot check, and housing seals are reused.",
    date: "2025-02-25",
    image: null,
  },
  {
    id: "ev-r4",
    type: "document",
    title: "Root 4: Job close-out records",
    note: "The pump was returned to service without an alignment or vibration reading.",
    date: "2025-02-25",
    image: null,
  },
  {
    id: "ev-r5",
    type: "document",
    title: "Root 5: Inspection route and PM list",
    note: "Neither flush flow nor oil condition appears on any inspection route.",
    date: "2025-02-26",
    image: null,
  },
  {
    id: "ev-r6",
    type: "data",
    title: "Root 6: Maintenance system history",
    note: "Six events were logged under two generic codes (bearing failure, seal failure) with no cause field filled, so the repeat pattern was invisible.",
    date: "2025-02-26",
    image: null,
  },
];

const tree: CauseNode = node(
  "n-root",
  "Repeat bearing and mechanical seal failures on P-101",
  "physical",
  "verified",
  [],
  [
    node(
      "n-a",
      "A. Bearings fail early",
      "physical",
      "verified",
      ["ev-a1", "ev-a2", "ev-a3"],
      [
        node(
          "n-a1",
          "A1. Pump runs at about 60% of best efficiency flow, so radial load on the shaft is high",
          "physical",
          "verified",
          ["ev-a1"],
          [
            node(
              "n-a1h",
              "Operators throttle the discharge valve to match downstream demand",
              "human",
              "verified",
              ["ev-a1"],
              [
                node(
                  "n-root1",
                  "ROOT 1: Pump duty was never reviewed after throughput changed; impeller is oversized for current duty; no management-of-change trigger for duty changes",
                  "system",
                  "verified",
                  ["ev-r1"],
                  [],
                  true,
                ),
              ],
            ),
          ],
        ),
        node(
          "n-a2",
          "A2. Coupling misalignment and a soft foot after rebuilds",
          "physical",
          "verified",
          ["ev-a2"],
          [
            node(
              "n-a2h",
              "Fitters align by straight edge and feel; soft foot is not checked",
              "human",
              "verified",
              ["ev-a2"],
              [
                node(
                  "n-root2",
                  "ROOT 2: No precision alignment standard (method, tolerance, record), no laser tool, fitters not trained",
                  "system",
                  "verified",
                  ["ev-r2"],
                  [],
                  true,
                ),
                node(
                  "n-root4",
                  "ROOT 4: No verification after repair (alignment record, vibration reading) before handover",
                  "system",
                  "verified",
                  ["ev-r4"],
                  [],
                  true,
                ),
              ],
            ),
          ],
        ),
        node(
          "n-a3",
          "A3. Bearing oil contaminated with water and solids (worn housing seals, open breather)",
          "physical",
          "verified",
          ["ev-a3"],
          [
            node(
              "n-a3h",
              "Wash-down hose aimed at bearing housings; oil topped up from open containers",
              "human",
              "verified",
              ["ev-a3"],
              [
                node(
                  "n-root3",
                  "ROOT 3: Rebuild procedure gaps: reuses worn housing seals, no sealed-breather or isolator standard, no soft foot check",
                  "system",
                  "verified",
                  ["ev-r3"],
                  [],
                  true,
                ),
                node(
                  "n-root5b",
                  "ROOT 5b: Oil condition not on any inspection route",
                  "system",
                  "verified",
                  ["ev-r5"],
                  [],
                  true,
                ),
              ],
            ),
          ],
        ),
      ],
    ),
    node(
      "n-b",
      "B. Mechanical seals fail early",
      "physical",
      "verified",
      ["ev-b1", "ev-a1", "ev-a2", "ev-b3"],
      [
        node(
          "n-b1",
          "B1. Seal faces run dry or hot because flush flow is restricted (strainer packed, flush valve part closed)",
          "physical",
          "verified",
          ["ev-b1"],
          [
            node(
              "n-b1h",
              "Flush strainer not checked; flush valve position not verified after maintenance",
              "human",
              "verified",
              ["ev-b1"],
              [
                node(
                  "n-root5a",
                  "ROOT 5a: Flush is on no inspection route; no flow indicator or low-flow alarm",
                  "system",
                  "verified",
                  ["ev-r5"],
                  [],
                  true,
                ),
              ],
            ),
          ],
        ),
        node(
          "n-b2",
          "B2. Seal faces and sleeve see excess shaft movement",
          "physical",
          "verified",
          ["ev-a1", "ev-a2"],
          [
            node(
              "n-b2s",
              "Driven by A1 (off best efficiency point) and A2 (misalignment); same roots 1, 2 and 4",
              "system",
              "verified",
              ["ev-a1", "ev-a2"],
            ),
          ],
        ),
        node(
          "n-b3",
          "B3. Seal set length not controlled on rebuild",
          "physical",
          "verified",
          ["ev-b3"],
          [
            node(
              "n-b3h",
              "Seal set by experience, not recorded",
              "human",
              "verified",
              ["ev-b3"],
              [
                node(
                  "n-b3s",
                  "ROOT 3 (again): rebuild procedure has no seal setting step or check",
                  "system",
                  "verified",
                  ["ev-r3"],
                ),
              ],
            ),
          ],
        ),
      ],
    ),
    node(
      "n-c",
      "C. Cross-cutting: failures are not recorded in a way that shows the pattern",
      "system",
      "verified",
      ["ev-r6"],
      [
        node(
          "n-root6",
          "ROOT 6: Failures coded only as \"bearing failure\" or \"seal failure\" in the maintenance system, so the repeat pattern and causes were invisible",
          "system",
          "verified",
          ["ev-r6"],
          [],
          true,
        ),
      ],
    ),
  ],
);

/** Sign-off date 2025-03-03; due dates are the case study's weeks from sign-off. */
const actions: ActionItem[] = [
  {
    id: "act-1",
    causeId: "n-root1",
    description:
      "Trim impeller / re-rate duty so the operating point sits near best efficiency (needs shutdown)",
    owner: "Reliability engineer with process engineer",
    dueDate: "2025-04-28",
    status: "done",
    cost: 28000,
  },
  {
    id: "act-2",
    causeId: "n-root5a",
    description:
      "Upgrade seal flush: flow indicator, clean strainer, add to inspection route",
    owner: "Mechanical supervisor",
    dueDate: "2025-03-31",
    status: "done",
    cost: 12000,
  },
  {
    id: "act-3",
    causeId: "n-root2",
    description:
      "Write alignment standard, buy laser alignment tool, train fitters (standard week 4, training week 8)",
    owner: "Maintenance manager",
    dueDate: "2025-04-28",
    status: "done",
    cost: 8000,
  },
  {
    id: "act-4",
    causeId: "n-root3",
    description:
      "Fit bearing housing isolators and sealed breathers; write rebuild checklist with seal setting, soft foot check, alignment record and vibration reading before handover. Also fixes Roots 4 and 5b, see the next two lines; cost counted once here",
    owner: "Mechanical supervisor and planner",
    dueDate: "2025-04-14",
    status: "done",
    cost: 7000,
  },
  {
    id: "act-4b",
    causeId: "n-root4",
    description:
      "Require alignment record and vibration reading before handover (part of the action above, cost included there)",
    owner: "Mechanical supervisor and planner",
    dueDate: "2025-04-14",
    status: "done",
    cost: 0,
  },
  {
    id: "act-4c",
    causeId: "n-root5b",
    description:
      "Add oil condition check to the inspection route (part of the action above, cost included there)",
    owner: "Mechanical supervisor and planner",
    dueDate: "2025-04-14",
    status: "done",
    cost: 0,
  },
  {
    id: "act-5",
    causeId: "",
    description: "Engineering and project time across all actions",
    owner: "Reliability engineer",
    dueDate: "2025-04-28",
    status: "done",
    cost: 5000,
  },
  {
    id: "act-6",
    causeId: "n-root1",
    description: "Add pump duty to the management-of-change checklist",
    owner: "Plant engineering manager",
    dueDate: "2025-03-24",
    status: "done",
    cost: 0,
  },
  {
    id: "act-7",
    causeId: "n-root6",
    description: "Add cause and failure-mode fields to repair coding",
    owner: "Maintenance planner",
    dueDate: "2025-03-24",
    status: "done",
    cost: 0,
  },
  {
    id: "act-8",
    causeId: "",
    description:
      "Effectiveness check: report failures, hours and cost at 90 days and 12 months",
    owner: "Reliability engineer, reported to plant manager",
    dueDate: "2026-03-02",
    status: "done",
    cost: 0,
  },
];

/**
 * Figures follow the case study sheet (video/case-study.md), worked through
 * the app's own formulas:
 *  lost units/event   = 14 h x 120 t/h           = 1,680 t
 *  lost margin/event  = 1,680 t x $18            = $30,240
 *  cost/event         = $30,240 + $9,500 repair  = $39,740
 *  annual loss        = $39,740 x 6              = $238,440 (84 h lost)
 *  after fix (1/yr)   = $39,740                  ; saving = $198,700
 *  action cost        = $60,000                  ; payback = 3.6 months
 */
export function buildSample(): Investigation {
  return {
    id: SAMPLE_ID,
    schemaVersion: 1,
    createdAt: "2025-02-11T08:00:00.000Z",
    updatedAt: SAMPLE_UPDATED_AT,
    isSample: true,
    problem: {
      title: "Repeat bearing and mechanical seal failures on slurry pump P-101",
      asset: "Slurry pump P-101",
      site: "Concentrator plant, slurry feed area",
      eventDate: "2025-02-11",
      whatHappened:
        "P-101 slurry feed pump failed 6 times in 12 months (3 mechanical seal, 3 bearing), losing 84 hours of production and costing $238,440 per year in lost margin and repair.",
      where:
        "Drive-end and non-drive-end bearings and the mechanical seal of P-101, a single slurry feed pump with no standby.",
      when: "Spread across all shifts and seasons over the last 12 months: 3 mechanical seal events and 3 bearing events.",
      impact:
        "There is no buffer capacity, so a pump stop is a line stop and lost hours are lost production hours. Each failure takes 14 hours to diagnose, isolate, drain, rebuild and restart, losing 1,680 tonnes at 120 t/h, which is $30,240 of margin plus $9,500 of repair. Secondary damage, overtime premium, delayed planned work and environmental clean-up are not counted, so the real loss is higher.",
    },
    loss: {
      eventsPerYear: 6,
      downtimeHours: 14,
      ratePerHour: 120,
      unitName: "tonnes",
      marginPerUnit: 18,
      repairCost: 9500,
      currency: "$",
    },
    evidence,
    tree,
    actions,
    verification: {
      reviewDate: "2026-03-02",
      recurred: "no",
      eventsPerYearAfter: 1,
      notes:
        "Failures measured over 12 months after the actions: 1 per year, down from 6. Cost and hours per event are held at the same values as before so the comparison is fair. Capacity released: 70 hours, 8,400 tonnes, $151,200 of margin plus $47,500 of repair cost avoided, which equals the $198,700 annual saving. Simple payback ignores the time value of money, tax and cost of capital. All figures are illustrative.",
    },
  };
}
