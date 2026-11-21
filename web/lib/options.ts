/**
 * Fixed lists and plain-English labels for the asset, CAPA, deterioration,
 * spares and rollout features. Pure data: no React, no storage.
 */
import type {
  ActionCategory,
  ActionKind,
  CauseArea,
  Criticality,
  Deterioration,
  FailureType,
  IntervalUnit,
  OtherCostCategory,
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
  { value: "corrective", label: "Corrective", help: "Deal with this failure and its damage." },
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
  { value: "not_applicable", label: "Not applicable", help: "Not wear: for example a setting, a method or a material." },
];

export const DETERIORATION_GUIDANCE =
  "Forced deterioration is removed by dealing with its cause. Natural deterioration is managed by inspection, condition monitoring and planned replacement.";

/** Quick-add money spent lines for process and quality losses. The user fills the amount. */
export const COST_PRESETS: { label: string; category: OtherCostCategory }[] = [
  { label: "Scrapped product", category: "scrap" },
  { label: "Rework", category: "other" },
  { label: "Product on hold", category: "other" },
  { label: "Customer claims and credits", category: "penalties" },
  { label: "Retailer penalties", category: "penalties" },
];

export const CAUSE_AREAS: { value: Exclude<CauseArea, "">; label: string }[] = [
  { value: "equipment", label: "Equipment" },
  { value: "materials", label: "Materials" },
  { value: "method", label: "Method" },
  { value: "measurement", label: "Measurement" },
  { value: "people", label: "People" },
  { value: "environment", label: "Environment" },
];

export const causeAreaLabel = (a: CauseArea | undefined): string =>
  CAUSE_AREAS.find((x) => x.value === a)?.label ?? "";

export const FAILURE_TYPES: { value: FailureType; label: string; help: string }[] = [
  { value: "equipment", label: "Equipment failure", help: "A machine or asset broke or stopped." },
  { value: "process", label: "Process or quality failure", help: "A line, method or product quality went wrong, for example leaking packs." },
];

/** Failure modes that suit a process or quality failure. */
export const PROCESS_FAILURE_MODES: string[] = [
  "Seal failure (leaking pack)",
  "Underweight / overfill",
  "Foreign body",
  "Labelling error",
  "Temperature excursion",
  "Contamination",
  "Out of specification",
  "Changeover error",
  "Other",
];

export const ROLLOUT_STATUS: { value: RolloutStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "no_issue", label: "Checked: no issue" },
  { value: "same_problem", label: "Checked: same problem found" },
  { value: "fixed", label: "Countermeasure in place" },
];

export const categoryLabel = (c: ActionCategory | undefined): string =>
  ACTION_CATEGORIES.find((x) => x.value === c)?.label ?? "";
export const kindLabel = (k: ActionKind | undefined): string =>
  ACTION_KINDS.find((x) => x.value === k)?.label ?? "";
export const criticalityLabel = (c: Criticality | undefined): string =>
  CRITICALITY_OPTIONS.find((x) => x.value === c)?.label ?? "";
export const rolloutStatusLabel = (s: RolloutStatus): string =>
  ROLLOUT_STATUS.find((x) => x.value === s)?.label ?? s;
