/**
 * JSON Schemas for the model's structured output (output_config.format).
 * Kept inside the subset structured outputs support: objects with required
 * properties and additionalProperties false, arrays, strings, enums, numbers.
 */
const str = { type: "string" } as const;
const strArray = { type: "array", items: str } as const;
const levels = ["physical", "human", "system"];

function obj(properties: Record<string, unknown>): Record<string, unknown> {
  return { type: "object", properties, required: Object.keys(properties), additionalProperties: false };
}

export const COACH_SCHEMA = obj({
  suggestions: {
    type: "array",
    items: obj({
      parent: str,
      level: { type: "string", enum: levels },
      text: str,
      why: str,
      confirmWith: str,
      ruleOutWith: str,
      deterioration: { type: "string", enum: ["natural", "forced", "unclear", "not_applicable"] },
    }),
  },
});

export const ISSUE_TYPES = [
  "stopped_at_physical",
  "no_evidence",
  "blame",
  "weak_logic",
  "unverified_root",
  "missing_level",
  "deterioration_undecided",
  "single_branch",
  "action_weak",
  "no_preventive",
  "no_task_interval",
  "other",
] as const;

export const CHALLENGE_SCHEMA = obj({
  summary: str,
  issues: {
    type: "array",
    items: obj({
      ref: str,
      type: { type: "string", enum: [...ISSUE_TYPES] },
      severity: { type: "string", enum: ["high", "medium", "low"] },
      message: str,
      question: str,
    }),
  },
});

export const CAPA_SCHEMA = obj({
  deterioration: { type: "string", enum: ["natural", "forced", "unclear", "not_applicable"] },
  deteriorationReason: str,
  actions: {
    type: "array",
    items: obj({
      kind: { type: "string", enum: ["corrective", "preventive"] },
      category: {
        type: "string",
        enum: [
          "repair",
          "design",
          "maintenance_task",
          "condition_monitoring",
          "spares",
          "procedure",
          "training",
          "operating_practice",
        ],
      },
      description: str,
      intervalValue: { type: "number" },
      intervalUnit: { type: "string", enum: ["hours_run", "days", "weeks", "months"] },
      craft: str,
      rationale: str,
    }),
  },
  horizontalExpansion: str,
});

export const PROBLEM_SCHEMA = obj({
  title: str,
  whatHappened: str,
  where: str,
  when: str,
  impact: str,
  missingFacts: strArray,
});

export const DOCUMENT_SCHEMA = obj({
  title: str,
  sections: { type: "array", items: obj({ heading: str, body: str }) },
});
