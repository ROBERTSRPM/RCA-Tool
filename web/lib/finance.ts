import type { ActionItem, Investigation, Loss, Verification } from "./types";

const n = (v: number | null | undefined): number =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

export interface LossCalc {
  /** units of production lost in one event = downtime hours x rate */
  lostUnitsPerEvent: number;
  /** money margin lost in one event = lost units x margin per unit */
  lostMarginPerEvent: number;
  /** total cost of one event = lost margin + repair cost */
  costPerEvent: number;
  /** annual loss = cost per event x events per year */
  annualLoss: number;
}

export function calcLoss(loss: Loss, eventsPerYear?: number | null): LossCalc {
  const events = eventsPerYear === undefined ? loss.eventsPerYear : eventsPerYear;
  const lostUnitsPerEvent = n(loss.downtimeHours) * n(loss.ratePerHour);
  const lostMarginPerEvent = lostUnitsPerEvent * n(loss.marginPerUnit);
  const costPerEvent = lostMarginPerEvent + n(loss.repairCost);
  return {
    lostUnitsPerEvent,
    lostMarginPerEvent,
    costPerEvent,
    annualLoss: costPerEvent * n(events),
  };
}

/** Names of the loss inputs that are still empty or zero. */
export function missingLossInputs(loss: Loss): string[] {
  const missing: string[] = [];
  if (!n(loss.eventsPerYear)) missing.push("events per year");
  if (!n(loss.downtimeHours)) missing.push("downtime hours per event");
  if (!n(loss.ratePerHour)) missing.push("production rate");
  if (!n(loss.marginPerUnit)) missing.push("margin per unit");
  return missing;
}

export function isLossQuantified(loss: Loss): boolean {
  return calcLoss(loss).annualLoss > 0;
}

export function totalActionCost(actions: ActionItem[]): number {
  return actions.reduce((sum, a) => sum + n(a.cost), 0);
}

export interface VerifyCalc {
  annualLossBefore: number;
  annualLossAfter: number;
  annualSaving: number;
  totalActionCost: number;
  /** months to repay the action cost from the saving; null if no saving */
  paybackMonths: number | null;
  /** true once the user has entered events per year after the fix */
  hasAfterFigure: boolean;
}

export function calcVerification(
  inv: Pick<Investigation, "loss" | "actions" | "verification">,
): VerifyCalc {
  const before = calcLoss(inv.loss).annualLoss;
  const hasAfterFigure = inv.verification.eventsPerYearAfter !== null;
  const after = hasAfterFigure
    ? calcLoss(inv.loss, inv.verification.eventsPerYearAfter).annualLoss
    : before;
  const saving = hasAfterFigure ? before - after : 0;
  const cost = totalActionCost(inv.actions);
  const paybackMonths =
    saving > 0 ? cost / (saving / 12) : null;
  return {
    annualLossBefore: before,
    annualLossAfter: after,
    annualSaving: saving,
    totalActionCost: cost,
    paybackMonths,
    hasAfterFigure,
  };
}

/** Savings only count as "verified" once the review says no recurrence. */
export function verifiedSaving(
  inv: Pick<Investigation, "loss" | "actions" | "verification">,
): number {
  const v: Verification = inv.verification;
  if (v.recurred !== "no") return 0;
  return Math.max(0, calcVerification(inv).annualSaving);
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
