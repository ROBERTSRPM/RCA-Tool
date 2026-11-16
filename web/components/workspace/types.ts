import type { Investigation, StepId } from "@/lib/types";

export type Updater = (fn: (i: Investigation) => Investigation) => void;

export interface StepProps {
  inv: Investigation;
  update: Updater;
  go: (step: StepId, nodeId?: string) => void;
}
