/**
 * Fixed lists and plain-English labels for the asset, CAPA, deterioration,
 * spares and rollout features. Pure data: no React, no storage.
 */
import type {
  ActionCategory,
  ActionKind,
  Criticality,
  Deterioration,
  IntervalUnit,
  RolloutStatus,
} from "./types";

export const ASSET_TYPES: string[] = [
  "Centrifugal pump",
  "Slurry pump",
  "Positive displacement pump",
  "Belt conveyor",
  "Bucket conveyor/elevator",
  "Screw conveyor",
  "Gearbox",
  "Electric motor",
  "Fan/blower",
  "Compressor",
  "Valve/actuator",
  "Filler",
  "Packaging machine",
  "Screen",
  "Crusher",
  "Mill",
  "Heat exchanger",
  "Boiler",
  "Tank/vessel",
  "Pipework",
  "Electrical/instrumentation",
  "Other",
];

export const FAILURE_MODES: string[] = [
  "Bearing failure",
  "Seal or gland leak",
  "Misalignment",
  "Wear/erosion",
  "Corrosion",
  "Fatigue or cracking",
  "Blockage",
  "Overheating",
  "Electrical fault",
  "Instrumentation or control fault",
  "Lubrication failure",
  "Belt or chain failure",
  "Structural failure",
  "Operating error",
  "Other",
];

export const CRITICALITY_OPTIONS: { value: Exclude<Criticality, "">; label: string; help: string }[] = [
  { value: "A", label: "A: Critical", help: "A failure stops the plant or line, or is a safety or environmental risk." },
  { value: "B", label: "B: Important", help: "A failure slows production or has a workaround that costs money." },
  { value: "C", label: "C: General", help: "A failure has little effect on production and is easy to work around." },
];

export const ACTION_KINDS: { value: Exclude<ActionKind, "">; label: string; help: string }[] = [
  { value: "corrective", label: "Corrective", help: "Fix this failure and its damage." },
  { value: "preventive", label: "Preventive", help: "Stop it happening again." },
];

export const ACTION_CATEGORIES: { value: Exclude<ActionCategory, "">; label: string }[] = [
  { value: "repair", label: "Repair or restore" },
  { value: "design", label: "Design or equipment change" },
  { value: "maintenance_task", label: "Maintenance task" },
  { value: "condition_monitoring", label: "Condition monitoring" },
  { value: "spares", label: "Spares holding" },
  { value: "procedure", label: "Procedure or standard" },
  { value: "training", label: "Training" },
  { value: "operating_practice", label: "Operating practice" },
];

export const INTERVAL_UNITS: { value: IntervalUnit; label: string }[] = [
  { value: "hours_run", label: "hours run" },
  { value: "days", label: "days" },
  { value: "weeks", label: "weeks" },
  { value: "months", label: "months" },
];

export const DETERIORATION_OPTIONS: { value: Exclude<Deterioration, "">; label: string; help: string }[] = [
  { value: "natural", label: "Natural", help: "Normal wear in service." },
  {
    value: "forced",
    label: "Forced",
    help: "Wear we caused: contamination, misalignment, overload, poor lubrication, wrong operation.",
  },
];

export const DETERIORATION_GUIDANCE =
  "Forced deterioration is removed by fixing its cause. Natural deterioration is managed by inspection, condition monitoring and planned replacement.";

export const ROLLOUT_STATUS: { value: RolloutStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "no_issue", label: "Checked: no issue" },
  { value: "same_problem", label: "Checked: same problem found" },
  { value: "fixed", label: "Fixed" },
];

export const categoryLabel = (c: ActionCategory | undefined): string =>
  ACTION_CATEGORIES.find((x) => x.value === c)?.label ?? "";
export const kindLabel = (k: ActionKind | undefined): string =>
  ACTION_KINDS.find((x) => x.value === k)?.label ?? "";
export const criticalityLabel = (c: Criticality | undefined): string =>
  CRITICALITY_OPTIONS.find((x) => x.value === c)?.label ?? "";
export const rolloutStatusLabel = (s: RolloutStatus): string =>
  ROLLOUT_STATUS.find((x) => x.value === s)?.label ?? s;
