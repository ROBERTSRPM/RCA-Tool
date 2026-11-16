import { describe, expect, it } from "vitest";
import {
  calcLoss,
  calcVerification,
  formatMoney,
  formatMonths,
  isLossQuantified,
  missingLossInputs,
  totalActionCost,
  verifiedSaving,
} from "./finance";
import { blankInvestigation } from "./investigation";
import { buildSample } from "./sample";

const loss = {
  eventsPerYear: 4,
  downtimeHours: 10,
  ratePerHour: 20,
  unitName: "units",
  marginPerUnit: 5,
  repairCost: 1000,
  currency: "$",
};

describe("calcLoss", () => {
  it("computes per-event and annual figures", () => {
    const c = calcLoss(loss);
    expect(c.lostUnitsPerEvent).toBe(200);
    expect(c.lostMarginPerEvent).toBe(1000);
    expect(c.costPerEvent).toBe(2000);
    expect(c.annualLoss).toBe(8000);
  });
  it("treats blanks as zero", () => {
    const c = calcLoss({ ...loss, eventsPerYear: null, repairCost: null });
    expect(c.annualLoss).toBe(0);
    expect(c.costPerEvent).toBe(1000);
  });
  it("allows overriding the event count", () => {
    expect(calcLoss(loss, 1).annualLoss).toBe(2000);
    expect(calcLoss(loss, 0).annualLoss).toBe(0);
  });
});

describe("loss completeness", () => {
  it("lists what is missing", () => {
    expect(missingLossInputs(blankInvestigation().loss)).toEqual([
      "events per year",
      "downtime hours per event",
      "production rate",
      "margin per unit",
    ]);
    expect(isLossQuantified(loss)).toBe(true);
    expect(isLossQuantified(blankInvestigation().loss)).toBe(false);
  });
});

describe("calcVerification", () => {
  const base = blankInvestigation({
    loss,
    actions: [
      { id: "a", causeId: "", description: "", owner: "", dueDate: "", status: "done", cost: 1000 },
      { id: "b", causeId: "", description: "", owner: "", dueDate: "", status: "done", cost: 500 },
    ],
  });
  it("totals action cost", () => {
    expect(totalActionCost(base.actions)).toBe(1500);
  });
  it("has no saving until an after-figure is entered", () => {
    const v = calcVerification(base);
    expect(v.annualSaving).toBe(0);
    expect(v.paybackMonths).toBeNull();
    expect(v.hasAfterFigure).toBe(false);
  });
  it("computes saving and payback", () => {
    const inv = {
      ...base,
      verification: { ...base.verification, recurred: "no" as const, eventsPerYearAfter: 1 },
    };
    const v = calcVerification(inv);
    expect(v.annualLossBefore).toBe(8000);
    expect(v.annualLossAfter).toBe(2000);
    expect(v.annualSaving).toBe(6000);
    expect(v.paybackMonths).toBeCloseTo(3, 5); // 1500 / (6000/12)
    expect(verifiedSaving(inv)).toBe(6000);
  });
  it("does not count savings as verified if the failure recurred", () => {
    const inv = {
      ...base,
      verification: { ...base.verification, recurred: "yes" as const, eventsPerYearAfter: 1 },
    };
    expect(verifiedSaving(inv)).toBe(0);
  });
});

describe("formatting", () => {
  it("formats money and months", () => {
    expect(formatMoney(356880, "$")).toBe("$356,880");
    expect(formatMoney(-1234.4, "€")).toBe("-€1,234");
    expect(formatMonths(null)).toBe("n/a");
    expect(formatMonths(0.686)).toBe("0.7 months");
  });
});

describe("sample investigation", () => {
  const s = buildSample();
  it("matches the figures quoted in the sample documentation", () => {
    const v = calcVerification(s);
    expect(calcLoss(s.loss).lostUnitsPerEvent).toBe(1190);
    expect(calcLoss(s.loss).costPerEvent).toBe(59480);
    expect(v.annualLossBefore).toBe(356880);
    expect(v.annualLossAfter).toBe(59480);
    expect(v.annualSaving).toBe(297400);
    expect(v.totalActionCost).toBe(17000);
    expect(v.paybackMonths).toBeCloseTo(0.686, 2);
  });
});
