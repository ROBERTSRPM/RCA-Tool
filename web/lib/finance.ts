import type { ActionItem, Investigation, Loss, Verification } from "./types";

const n = (v: number | null | undefined): number =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;

/* ------------------------------------------------------------------ */
/* What happened to the production that was lost                       */
/* ------------------------------------------------------------------ */

export interface Shares {
  /** % lost for good (costed as margin per unit) */
  lost: number;
  /** % made up later (costed as a recovery cost per event) */
  madeUp: number;
  /** % covered by buffer stock (no cost per event) */
  buffer: number;
}

export type ShareKey = keyof Shares;

export const DEFAULT_SHARES: Shares = { lost: 100, madeUp: 0, buffer: 0 };

/**
 * The three shares of a loss as fractions that total exactly 100%.
 * - Missing fields (old investigations) mean the old behaviour: 100% lost.
 * - Negative or non-numeric values count as 0.
 * - If the shares do not total 100 they are scaled proportionally, so the
 *   money maths can never invent or drop production.
 * - If they are all zero there is nothing to scale: 100% lost for good.
 */
export function resolveShares(loss: Partial<Loss>): Shares {
  const hasAny =
    loss.shareLost !== undefined ||
    loss.shareMadeUp !== undefined ||
    loss.shareBuffer !== undefined;
  if (!hasAny) return { ...DEFAULT_SHARES };
  const lost = n(loss.shareLost);
  const madeUp = n(loss.shareMadeUp);
  const buffer = n(loss.shareBuffer);
  const total = lost + madeUp + buffer;
  if (total <= 0) return { ...DEFAULT_SHARES };
  return {
    lost: (lost / total) * 100,
    madeUp: (madeUp / total) * 100,
    buffer: (buffer / total) * 100,
  };
}

const SHARE_ORDER: ShareKey[] = ["lost", "madeUp", "buffer"];

/**
 * Sets one share and rebalances the other two so the total stays 100.
 * Whole percentages only. The other two keep their relative proportion; if
 * both are zero the remainder goes to the first of them in the order
 * lost for good, made up later, buffer stock.
 */
export function setShare(current: Shares, key: ShareKey, requested: number | null): Shares {
  const raw = typeof requested === "number" && Number.isFinite(requested) ? requested : 0;
  const value = Math.min(100, Math.max(0, Math.round(raw)));
  const [a, b] = SHARE_ORDER.filter((k) => k !== key);
  const remaining = 100 - value;
  const sum = n(current[a]) + n(current[b]);
  let first: number;
  if (sum > 0) first = Math.round((n(current[a]) / sum) * remaining);
  else first = remaining;
  first = Math.min(remaining, Math.max(0, first));
  return { ...current, [key]: value, [a]: first, [b]: remaining - first } as Shares;
}

/** Shares to store, as whole numbers that total 100 (from whatever is stored). */
export function wholeShares(loss: Loss): Shares {
  const s = resolveShares(loss);
  const lost = Math.round(s.lost);
  const madeUp = Math.round(s.madeUp);
  return { lost, madeUp, buffer: 100 - lost - madeUp };
}

/* ------------------------------------------------------------------ */
/* Cost of one event and of a year                                     */
/* ------------------------------------------------------------------ */

export interface LossCalc {
  /** hours of production lost per year = downtime x events */
  hoursLostPerYear: number;
  /** units not produced during one event = downtime hours x rate */
  lostUnitsPerEvent: number;
  /** of which never made up */
  unitsLostForGoodPerEvent: number;
  unitsMadeUpPerEvent: number;
  unitsBufferedPerEvent: number;
  /** units not produced per year (all three kinds) */
  unitsLostPerYear: number;
  /** units never made up per year */
  unitsLostForGoodPerYear: number;

  /** cash cost lines per event */
  repairPerEvent: number;
  recoveryPerEvent: number;
  otherPerEvent: number;
  /** cash per event = repair + recovery + other lines */
  cashPerEvent: number;
  /** opportunity loss per event = units lost for good x margin per unit */
  lostMarginPerEvent: number;
  opportunityPerEvent: number;
  /** total cost of one event = cash + opportunity (buffer holding is yearly, see below) */
  costPerEvent: number;

  /** yearly cost of holding buffer stock (0 unless some production is covered by buffer) */
  bufferHoldingPerYear: number;
  /** annual cash costs = cash per event x events + buffer holding */
  annualCash: number;
  /** annual opportunity loss = opportunity per event x events */
  annualOpportunity: number;
  /** annual loss = annual cash + annual opportunity (or the rough yearly estimate when nothing else costs a year) */
  annualLoss: number;
  /** true when annualLoss is the user's single rough yearly estimate, not built from the detailed figures */
  usesEstimate: boolean;
}

/** The loss with every figure blanked, used when the user chose "Not known yet". */
function blankFigures(loss: Loss): Loss {
  return {
    ...loss,
    eventsPerYear: null,
    downtimeHours: null,
    ratePerHour: null,
    marginPerUnit: null,
    repairCost: null,
    annualEstimate: null,
    recoveryCost: null,
    bufferHoldingCostPerYear: null,
    otherCosts: [],
  };
}

export function calcLoss(rawLoss: Loss, eventsPerYear?: number | null): LossCalc {
  const loss = rawLoss.notKnown ? blankFigures(rawLoss) : rawLoss;
  const events = n(eventsPerYear === undefined ? loss.eventsPerYear : eventsPerYear);
  const shares = resolveShares(loss);

  const lostUnitsPerEvent = n(loss.downtimeHours) * n(loss.ratePerHour);
  const unitsLostForGoodPerEvent = (lostUnitsPerEvent * shares.lost) / 100;
  const unitsMadeUpPerEvent = (lostUnitsPerEvent * shares.madeUp) / 100;
  const unitsBufferedPerEvent = (lostUnitsPerEvent * shares.buffer) / 100;

  const lostMarginPerEvent = unitsLostForGoodPerEvent * n(loss.marginPerUnit);

  const repairPerEvent = n(loss.repairCost);
  // A recovery cost only exists if some production was made up later.
  const recoveryPerEvent = shares.madeUp > 0 ? n(loss.recoveryCost) : 0;
  const otherPerEvent = (loss.otherCosts ?? []).reduce((sum, c) => sum + n(c.amount), 0);
  const cashPerEvent = repairPerEvent + recoveryPerEvent + otherPerEvent;

  const bufferHoldingPerYear = shares.buffer > 0 ? n(loss.bufferHoldingCostPerYear) : 0;

  const detailedCash = cashPerEvent * events + bufferHoldingPerYear;
  const annualOpportunity = lostMarginPerEvent * events;

  // A single rough yearly figure stands in only when the detailed figures cost nothing for a year.
  // With "events per year after the fix" it scales with the number of events; with no events
  // on record it cannot be scaled, so it stays as entered.
  const estimate = n(loss.annualEstimate);
  const usesEstimate = estimate > 0 && detailedCash + annualOpportunity <= 0;
  let estimateAmount = 0;
  if (usesEstimate) {
    const base = n(loss.eventsPerYear);
    estimateAmount =
      eventsPerYear !== undefined && base > 0 ? (estimate * events) / base : estimate;
  }
  const annualCash = detailedCash + estimateAmount;

  return {
    hoursLostPerYear: n(loss.downtimeHours) * events,
    lostUnitsPerEvent,
    unitsLostForGoodPerEvent,
    unitsMadeUpPerEvent,
    unitsBufferedPerEvent,
    unitsLostPerYear: lostUnitsPerEvent * events,
    unitsLostForGoodPerYear: unitsLostForGoodPerEvent * events,
    repairPerEvent,
    recoveryPerEvent,
    otherPerEvent,
    cashPerEvent,
    lostMarginPerEvent,
    opportunityPerEvent: lostMarginPerEvent,
    costPerEvent: cashPerEvent + lostMarginPerEvent,
    bufferHoldingPerYear,
    annualCash,
    annualOpportunity,
    annualLoss: annualCash + annualOpportunity,
    usesEstimate,
  };
}

export type LossStatus = "costed" | "partial" | "unknown";

/**
 * "costed": there is a yearly money figure. "partial": some figures are entered but
 * they do not give a yearly cost yet (for example hours only). "unknown": nothing
 * usable, or the user chose "Not known yet".
 */
export function lossStatus(loss: Loss): LossStatus {
  if (loss.notKnown) return "unknown";
  if (calcLoss(loss).annualLoss > 0) return "costed";
  const anyFigure =
    n(loss.eventsPerYear) > 0 ||
    n(loss.downtimeHours) > 0 ||
    n(loss.ratePerHour) > 0 ||
    n(loss.marginPerUnit) > 0 ||
    n(loss.repairCost) > 0 ||
    n(loss.annualEstimate) > 0 ||
    (loss.otherCosts ?? []).some((c) => n(c.amount) > 0);
  return anyFigure ? "partial" : "unknown";
}

export const LOSS_NOT_COSTED = "Loss not costed yet";

/** Annual loss for display: the money figure, or "Loss not costed yet". Never "$0" for a missing figure. */
export function formatAnnualLoss(loss: Loss): string {
  return lossStatus(loss) === "costed"
    ? formatMoney(calcLoss(loss).annualLoss, loss.currency || "$")
    : LOSS_NOT_COSTED;
}

/** Names of the loss inputs that are still empty or zero. */
export function missingLossInputs(loss: Loss): string[] {
  const missing: string[] = [];
  if (!n(loss.eventsPerYear)) missing.push("events per year");
  if (!n(loss.downtimeHours)) missing.push("downtime hours per event");
  if (!n(loss.ratePerHour)) missing.push("production rate");
  // Margin only matters when some production is lost for good.
  if (!n(loss.marginPerUnit) && resolveShares(loss).lost > 0) missing.push("margin per unit");
  return missing;
}

export function isLossQuantified(loss: Loss): boolean {
  return lossStatus(loss) === "costed";
}

export function totalActionCost(actions: ActionItem[]): number {
  return actions.reduce((sum, a) => sum + n(a.cost), 0);
}

/* ------------------------------------------------------------------ */
/* Verification                                                        */
/* ------------------------------------------------------------------ */

export interface VerifyCalc {
  annualLossBefore: number;
  annualLossAfter: number;
  annualSaving: number;
  /** the same three figures, split into cash costs and opportunity loss */
  cashBefore: number;
  cashAfter: number;
  cashSaving: number;
  opportunityBefore: number;
  opportunityAfter: number;
  opportunitySaving: number;
  totalActionCost: number;
  /** months to repay the action cost from the saving; null if no saving */
  paybackMonths: number | null;
  /** true once the user has entered events per year after the fix and the loss can be compared */
  hasAfterFigure: boolean;
  /** false while the loss is not costed (so no saving can be claimed) */
  lossCosted: boolean;
}

export function calcVerification(
  inv: Pick<Investigation, "loss" | "actions" | "verification">,
): VerifyCalc {
  const beforeCalc = calcLoss(inv.loss);
  // Savings need a costed loss. A single rough yearly estimate can only be compared
  // after the fix if the number of events per year now is known.
  const lossOk =
    isLossQuantified(inv.loss) &&
    (!beforeCalc.usesEstimate || n(inv.loss.notKnown ? null : inv.loss.eventsPerYear) > 0);
  const hasAfterFigure = inv.verification.eventsPerYearAfter !== null && lossOk;
  const afterCalc = hasAfterFigure
    ? calcLoss(inv.loss, inv.verification.eventsPerYearAfter)
    : beforeCalc;
  const saving = hasAfterFigure ? beforeCalc.annualLoss - afterCalc.annualLoss : 0;
  const cashSaving = hasAfterFigure ? beforeCalc.annualCash - afterCalc.annualCash : 0;
  const opportunitySaving = hasAfterFigure
    ? beforeCalc.annualOpportunity - afterCalc.annualOpportunity
    : 0;
  const cost = totalActionCost(inv.actions);
  const paybackMonths = saving > 0 ? cost / (saving / 12) : null;
  return {
    annualLossBefore: beforeCalc.annualLoss,
    annualLossAfter: afterCalc.annualLoss,
    annualSaving: saving,
    cashBefore: beforeCalc.annualCash,
    cashAfter: afterCalc.annualCash,
    cashSaving,
    opportunityBefore: beforeCalc.annualOpportunity,
    opportunityAfter: afterCalc.annualOpportunity,
    opportunitySaving,
    totalActionCost: cost,
    paybackMonths,
    hasAfterFigure,
    lossCosted: isLossQuantified(inv.loss),
  };
}

/**
 * True only when every action is Done AND the review says the failure has not
 * recurred AND a review date is entered. This is also what "Closed" means.
 */
export function isVerifiedClosed(
  inv: Pick<Investigation, "actions" | "verification">,
): boolean {
  const v: Verification = inv.verification;
  return (
    inv.actions.length > 0 &&
    inv.actions.every((a) => a.status === "done") &&
    v.recurred === "no" &&
    v.reviewDate.trim() !== ""
  );
}

/** Savings only count as "verified" once the investigation is verified closed. */
export function verifiedSaving(
  inv: Pick<Investigation, "loss" | "actions" | "verification">,
): number {
  if (!isVerifiedClosed(inv)) return 0;
  return Math.max(0, calcVerification(inv).annualSaving);
}

/** The verified saving split into cash and opportunity parts (each never below 0). */
export function verifiedSavingSplit(
  inv: Pick<Investigation, "loss" | "actions" | "verification">,
): { cash: number; opportunity: number } {
  if (!isVerifiedClosed(inv)) return { cash: 0, opportunity: 0 };
  const v = calcVerification(inv);
  return { cash: Math.max(0, v.cashSaving), opportunity: Math.max(0, v.opportunitySaving) };
}

export function formatMoney(value: number, currency: string): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(Math.round(value));
  return `${sign}${currency}${abs.toLocaleString("en-US")}`;
}

export function formatNumber(value: number, maxDecimals = 1): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: maxDecimals });
}

export function formatMonths(months: number | null): string {
  if (months === null) return "n/a";
  if (months < 0.1) return "under 0.1 months";
  return `${formatNumber(months, 1)} months`;
}
