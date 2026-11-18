/**
 * Canned model answers for local development and UI tests, so the AI screens
 * can be exercised without an API key. It only ever runs when AI_MOCK is set
 * AND NODE_ENV is not "production": `next build` and `next start` always run
 * with NODE_ENV=production, so a deployed build can never use it.
 */
import { AiError } from "./anthropic";
import { makeAliases } from "./prompts";
import type { AiRequest } from "./requests";

export function isMockEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== "production" && (env.AI_MOCK === "1" || env.AI_MOCK === "fail");
}

export async function mockModel(req: AiRequest, env: NodeJS.ProcessEnv = process.env): Promise<unknown> {
  if (!isMockEnabled(env)) throw new AiError("unavailable", "mock disabled");
  if (env.AI_MOCK === "fail") throw new AiError("unavailable", "mock failure");
  await new Promise((r) => setTimeout(r, 600));
  const a = makeAliases(req.context);
  const nodes = req.context.nodes;
  const ref = (i: number) => a.nodeAlias.get(nodes[Math.min(i, nodes.length - 1)].id) ?? "N1";
  switch (req.feature) {
    case "coach": {
      const parent = req.scope === "node" ? (a.nodeAlias.get(req.nodeId) ?? "N1") : ref(1);
      const second = req.scope === "node" ? parent : ref(2);
      return {
        suggestions: [
          {
            parent,
            level: "physical",
            text: "Bearing housing seal let slurry and water into the bearing",
            why: "Contaminated grease is the most common reason a bearing fails well before its calculated life on a slurry pump.",
            confirmWith: "Inspect the failed bearing and grease for grit and water; send a grease sample for analysis.",
            ruleOutWith: "Clean grease, no pitting from contamination, and the seal lip is undamaged.",
            deterioration: "forced",
          },
          {
            parent,
            level: "physical",
            text: "Shaft and motor out of alignment after the last pump rebuild",
            why: "Misalignment loads the bearing unevenly and shows up as early fatigue on one side.",
            confirmWith: "Check the alignment records and re-measure the coupling with a laser tool.",
            ruleOutWith: "Alignment within tolerance and no wear pattern on one side of the races.",
            deterioration: "forced",
          },
          {
            parent: second,
            level: "human",
            text: "Bearing was greased by hand with no measure of how much was added",
            why: "Too much or too little grease both shorten bearing life, and nothing in the task controls the amount.",
            confirmWith: "Ask the lubrication crew how much grease is added; look at the job plan.",
            ruleOutWith: "The job plan states a quantity and the crew follow it.",
            deterioration: "not_applicable",
          },
          {
            parent: second,
            level: "system",
            text: "No vibration or temperature trending on this pump, so wear was not seen before failure",
            why: "Without condition monitoring, the first sign of trouble is the trip.",
            confirmWith: "Check whether any vibration route or temperature trend exists for this tag.",
            ruleOutWith: "Trend data exists and showed no change before the failure.",
            deterioration: "not_applicable",
          },
          {
            parent: second,
            level: "system",
            text: "Rebuild procedure has no alignment check or sign-off step",
            why: "If the procedure does not ask for the check, whether it happens depends on who does the job.",
            confirmWith: "Read the current rebuild procedure and the last rebuild work order.",
            ruleOutWith: "The procedure has a recorded alignment step and it was signed off.",
            deterioration: "not_applicable",
          },
        ],
      };
    }
    case "challenge": {
      const root = nodes.find((n) => n.isRootCause);
      const rootRef = root ? (a.nodeAlias.get(root.id) ?? "none") : "none";
      const noEv = nodes.find((n, i) => i > 0 && n.evidenceIds.length === 0 && n.text.trim());
      return {
        summary:
          "The tree is a good start, but at least one branch stops at the physical cause and some causes have no evidence behind them yet.",
        issues: [
          {
            ref: rootRef,
            type: "stopped_at_physical",
            severity: "high",
            message: "This root cause describes what broke, not why the system let it break. There is no human or system cause beneath it.",
            question: "What procedure, training or planning gap allowed this to happen?",
          },
          ...(noEv
            ? [
                {
                  ref: a.nodeAlias.get(noEv.id) ?? "none",
                  type: "no_evidence",
                  severity: "medium",
                  message: "No evidence is linked to this cause, so it is still an opinion.",
                  question: "What measurement, photo or record would show this is true?",
                },
              ]
            : []),
          {
            ref: "none",
            type: "no_preventive",
            severity: "low",
            message: "Check that every flagged root cause has a preventive action, not only a repair.",
            question: "What stops this happening again, not just fixes it this time?",
          },
        ],
      };
    }
    case "capa": {
      return {
        deterioration: "forced",
        deteriorationReason:
          "The evidence points to contamination and misalignment, which we cause. Removing those causes comes first; a shorter bearing change interval would only hide them.",
        actions: [
          {
            kind: "preventive",
            category: "procedure",
            description: "Add a laser alignment check with recorded tolerances and a supervisor sign-off to the pump rebuild procedure.",
            intervalValue: 0,
            intervalUnit: "months",
            craft: "",
            rationale: "Makes the alignment check part of the job instead of depending on who does it.",
          },
          {
            kind: "preventive",
            category: "condition_monitoring",
            description: "Take vibration and bearing temperature readings on the drive-end and non-drive-end bearings and trend them against the baseline.",
            intervalValue: 2,
            intervalUnit: "weeks",
            craft: "Reliability technician",
            rationale: "Starting point only: set the interval from this pump's failure history and the manufacturer's guidance.",
          },
          {
            kind: "preventive",
            category: "maintenance_task",
            description: "Grease the bearings with a measured quantity from a grease gun with a counted dose, and inspect the housing seals for slurry ingress.",
            intervalValue: 4,
            intervalUnit: "weeks",
            craft: "Lubrication technician",
            rationale: "Starting point only: adjust after the first grease analysis results.",
          },
          {
            kind: "preventive",
            category: "spares",
            description: "Hold one complete bearing and seal kit for this pump in stores, with a minimum level of one.",
            intervalValue: 0,
            intervalUnit: "months",
            craft: "",
            rationale: "Cuts repair time if the cause is not fully removed and it fails again.",
          },
          {
            kind: "preventive",
            category: "training",
            description: "Train the fitters and lubrication crew on laser alignment and the greasing quantity for this pump.",
            intervalValue: 0,
            intervalUnit: "months",
            craft: "",
            rationale: "Supports the procedure change so the new steps are done the same way every time.",
          },
        ],
        horizontalExpansion:
          "Check the other slurry pumps of the same make on the same duty for grease contamination and alignment, and add them to the vibration route.",
      };
    }
    case "draft": {
      const p = req.context.problem;
      if (req.kind === "problem") {
        return {
          title: p.title || "Repeat bearing failure on slurry pump",
          whatHappened:
            "The drive-end bearing of the slurry pump seized and the pump tripped on high temperature. This is the third bearing failure on this pump in twelve months.",
          where: "Drive-end bearing housing.",
          when: "",
          impact: "The slurry feed stopped and had to be cut back until the pump was repaired.",
          missingFacts: ["What time of day and which shift did it fail?", "What was the bearing temperature before it tripped?"],
        };
      }
      if (req.kind === "summary") {
        return {
          title: `Management summary: ${p.title || "failure review"}`,
          sections: [
            { heading: "What happened", body: "The slurry pump failed again and stopped the feed. This is a repeat failure." },
            { heading: "What it cost", body: req.context.loss || "The cost has not been quantified yet." },
            { heading: "Why it happened", body: "The likely causes are contamination of the bearing and no alignment check in the rebuild procedure. Some of these are still hypotheses." },
            { heading: "What we are doing", body: "- Add an alignment check to the rebuild procedure.\n- Start vibration and temperature trending.\n- Hold a spare bearing and seal kit." },
            { heading: "What we need from you", body: "None identified yet." },
            { heading: "How we will know it worked", body: req.context.verification || "Not yet verified. We will review after the actions are done." },
          ],
        };
      }
      return {
        title: p.title || "Root cause analysis report",
        sections: [
          { heading: "Summary", body: "The pump failed repeatedly. The analysis points to system causes in the rebuild procedure and condition monitoring. Some causes are still hypotheses." },
          { heading: "What happened", body: p.whatHappened || "See the problem statement." },
          { heading: "Root causes", body: "- No alignment check in the rebuild procedure (hypothesis).\n- No condition monitoring on this pump (hypothesis)." },
          { heading: "Actions", body: "See the action list in the investigation." },
          { heading: "Still to confirm", body: "- Grease analysis results.\n- Alignment records from the last rebuild." },
        ],
      };
    }
  }
}
