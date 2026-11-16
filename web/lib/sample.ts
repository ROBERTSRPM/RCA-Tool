import type {
  ActionItem,
  CauseNode,
  EvidenceItem,
  Investigation,
} from "./types";

export const SAMPLE_ID = "sample-p201";
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
    id: "ev-vibration",
    type: "data",
    title: "Vibration and bearing temperature trend, last 4 failures",
    note: "Drive-end bearing temperature climbs from 62 C to over 95 C in the 2 to 3 weeks before each failure. Vibration spectrum shows bearing defect frequencies only. No cavitation or flow-related signature at any point.",
    date: "2025-02-14",
    image: null,
  },
  {
    id: "ev-oil",
    type: "photo",
    title: "Failed drive-end bearing and oil sample",
    note: "Oil milky and grey, laboratory result shows 8% water and fine silica (slurry solids). Bearing races pitted and discoloured by heat. Photo held in the maintenance share, ref BRG-0211.",
    date: "2025-02-12",
    image: null,
  },
  {
    id: "ev-seal",
    type: "inspection",
    title: "Bearing housing labyrinth seal inspection",
    note: "Lip wear of 3.5 mm against a 0.5 mm limit. The CMMS shows no replacement of these seals in the last 5 years. Pump rebuilt 4 times in that period.",
    date: "2025-02-18",
    image: null,
  },
  {
    id: "ev-wo",
    type: "document",
    title: "Last three P-201 rebuild work orders",
    note: "None record a shaft alignment reading or a tolerance. The work order template has no alignment step and no supervisor sign-off.",
    date: "2025-02-20",
    image: null,
  },
  {
    id: "ev-interview",
    type: "interview",
    title: "Operator interviews, all four crews",
    note: "Three of four crews admit to turning the gland water down 'to save water', as the shift water-use KPI counts pump gland water. Nobody knew a minimum flow existed. The strainer is only cleaned when someone notices.",
    date: "2025-02-25",
    image: null,
  },
  {
    id: "ev-glandflow",
    type: "data",
    title: "Gland water flow log vs failures",
    note: "Flow was below 8 L/min in the week before 5 of 6 failures. Pump data sheet minimum is 12 L/min. Strainer pressure drop doubled over the same weeks.",
    date: "2025-02-27",
    image: null,
  },
];

const tree: CauseNode = node(
  "n-root",
  "Slurry pump P-201 stops with a failed bearing and leaking gland seal, about 6 times a year",
  "physical",
  "verified",
  [],
  [
    node(
      "n-bearing",
      "Drive-end bearing overheats and seizes",
      "physical",
      "verified",
      ["ev-vibration", "ev-oil"],
      [
        node(
          "n-contam",
          "Slurry and water get into the bearing oil",
          "physical",
          "verified",
          ["ev-oil"],
          [
            node(
              "n-labyrinth",
              "Bearing housing labyrinth seal is worn out",
              "physical",
              "verified",
              ["ev-seal"],
              [
                node(
                  "n-nopm",
                  "Housing seal replacement is not in the PM plan, so it only changes if someone happens to notice",
                  "system",
                  "verified",
                  ["ev-seal"],
                  [],
                  true,
                ),
              ],
            ),
            node(
              "n-oilcan",
              "Oil is topped up from a shared open can that has been left in the dusty pump area",
              "human",
              "verified",
              ["ev-oil"],
              [
                node(
                  "n-nolube",
                  "There is no lubrication standard and no labelled sealed containers for this area",
                  "system",
                  "hypothesis",
                  [],
                ),
              ],
            ),
            node(
              "n-wronggrade",
              "Wrong grade of oil used in the bearing housing",
              "physical",
              "ruled_out",
              ["ev-oil"],
            ),
          ],
        ),
        node(
          "n-misalign",
          "Shaft is misaligned after rebuilds, loading the bearing",
          "physical",
          "verified",
          ["ev-vibration", "ev-wo"],
          [
            node(
              "n-noalign",
              "Fitters rebuild the pump without checking alignment",
              "human",
              "verified",
              ["ev-wo"],
              [
                node(
                  "n-notemplate",
                  "The rebuild work order has no alignment step, tolerance or supervisor sign-off",
                  "system",
                  "verified",
                  ["ev-wo"],
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
      "n-gland",
      "Gland seal leaks and slurry reaches the bearing housing",
      "physical",
      "verified",
      ["ev-glandflow"],
      [
        node(
          "n-lowflow",
          "Gland water flow is too low to keep slurry out of the seal",
          "physical",
          "verified",
          ["ev-glandflow"],
          [
            node(
              "n-strainer",
              "Gland water strainer is blocked with scale and solids",
              "physical",
              "verified",
              ["ev-glandflow"],
              [
                node(
                  "n-noalarm",
                  "There is no low-flow alarm and no routine for cleaning the strainer",
                  "system",
                  "verified",
                  ["ev-glandflow", "ev-interview"],
                  [],
                  true,
                ),
              ],
            ),
            node(
              "n-throttle",
              "Operators turn the gland water down to save water",
              "human",
              "verified",
              ["ev-interview"],
              [
                node(
                  "n-kpi",
                  "No minimum gland flow is defined, and the water-use KPI rewards turning it down",
                  "system",
                  "verified",
                  ["ev-interview", "ev-glandflow"],
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
      "n-cavitation",
      "Pump runs away from its best efficiency point and cavitates",
      "physical",
      "ruled_out",
      ["ev-vibration"],
    ),
  ],
);

const actions: ActionItem[] = [
  {
    id: "act-1",
    causeId: "n-nopm",
    description:
      "Fit bearing isolators to P-201 and add housing seal inspection and replacement to the 6-monthly PM plan",
    owner: "Thandi Mokoena (Planner)",
    dueDate: "2025-04-30",
    status: "done",
    cost: 4200,
  },
  {
    id: "act-2",
    causeId: "n-notemplate",
    description:
      "Add a laser alignment reading, tolerance and supervisor sign-off to the pump rebuild work order, and brief all 8 fitters",
    owner: "Pieter van Wyk (Mechanical Supervisor)",
    dueDate: "2025-04-15",
    status: "done",
    cost: 2600,
  },
  {
    id: "act-3",
    causeId: "n-noalarm",
    description:
      "Install a gland water flow meter with a low-flow alarm in the control room",
    owner: "Sipho Dlamini (Instrument Technician)",
    dueDate: "2025-05-31",
    status: "done",
    cost: 5400,
  },
  {
    id: "act-4",
    causeId: "n-noalarm",
    description:
      "Fit a duplex strainer and add a weekly strainer clean to operator rounds",
    owner: "Anna Botha (Operations Lead)",
    dueDate: "2025-05-15",
    status: "done",
    cost: 3300,
  },
  {
    id: "act-5",
    causeId: "n-kpi",
    description:
      "Set a minimum gland flow of 12 L/min on the pump data sheet and remove gland water from the shift water-use KPI",
    owner: "Marcus Reid (Plant Manager)",
    dueDate: "2025-03-31",
    status: "done",
    cost: 600,
  },
  {
    id: "act-6",
    causeId: "n-nopm",
    description:
      "Introduce a lubrication standard with labelled, sealed oil containers for the pump area",
    owner: "Thandi Mokoena (Planner)",
    dueDate: "2025-06-30",
    status: "done",
    cost: 900,
  },
];

/**
 * Figures, worked through the app's own formulas:
 *  lost units/event   = 14 h x 85 t/h            = 1,190 t
 *  lost margin/event  = 1,190 t x $42            = $49,980
 *  cost/event         = $49,980 + $9,500 repair  = $59,480
 *  annual loss        = $59,480 x 6              = $356,880
 *  after fix (1/yr)   = $59,480                  ; saving = $297,400
 *  action cost        = $17,000                  ; payback = 0.7 months
 */
export function buildSample(): Investigation {
  return {
    id: SAMPLE_ID,
    schemaVersion: 1,
    createdAt: "2025-02-11T08:00:00.000Z",
    updatedAt: "2026-02-02T08:00:00.000Z",
    isSample: true,
    problem: {
      title: "Repeat bearing and seal failures on slurry pump P-201",
      asset: "Slurry pump P-201 (tailings transfer)",
      site: "Concentrator plant, thickener area",
      eventDate: "2025-02-11",
      whatHappened:
        "The drive-end bearing seized and the gland seal leaked slurry onto the floor. The pump tripped on high bearing temperature and had to be stripped and rebuilt. This is the sixth failure of this type in the last 12 months.",
      where:
        "Drive-end bearing housing and gland seal of P-201, which transfers tailings from the thickener to the tailings dam.",
      when: "Early shift, during normal operation at full throughput. Previous failures were spread across all shifts and all seasons.",
      impact:
        "Tailings transfer stops and the thickener fills within about 6 hours, so plant feed is cut back until the pump is repaired. Each failure also costs a bearing set, a seal kit and a clean-up crew.",
    },
    loss: {
      eventsPerYear: 6,
      downtimeHours: 14,
      ratePerHour: 85,
      unitName: "tonnes",
      marginPerUnit: 42,
      repairCost: 9500,
      currency: "$",
    },
    evidence,
    tree,
    actions,
    verification: {
      reviewDate: "2026-02-02",
      recurred: "no",
      eventsPerYearAfter: 1,
      notes:
        "No bearing or seal failure on P-201 for 9 months since the last action closed. Gland water flow has held above 12 L/min and the low-flow alarm has fired twice and was cleared by operators within the hour. We count 1 failure a year to stay conservative.",
    },
  };
}
