import { runQualityCheck, type Finding } from "./quality";
import type { Investigation } from "./types";

/**
 * Seam for an AI assistant. Phase A ships only the rule-based implementation;
 * a later phase can provide an LLM-backed Coach with the same interface.
 */
export interface Coach {
  /** Review the whole investigation and return findings to show the user. */
  review(inv: Investigation): Promise<Finding[]>;
  /** Suggest possible answers to "Why?" for a node. */
  suggestWhys(inv: Investigation, nodeId: string): Promise<string[]>;
}

export const ruleBasedCoach: Coach = {
  async review(inv) {
    return runQualityCheck(inv);
  },
  async suggestWhys() {
    return []; // no suggestions without AI
  },
};
