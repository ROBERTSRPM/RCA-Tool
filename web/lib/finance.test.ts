import { describe, expect, it } from "vitest";
import {
  calcLoss,
  calcVerification,
  isVerifiedClosed,
  resolveShares,
  setShare,
  verifiedSavingSplit,
  wholeShares,
  formatMoney,
  formatMonths,
  isLossQuantified,
  missingLossInputs,
  totalActionCost,
  verifiedSaving,
} from "./finance";
import { blankInvestigation } from "./investigation";
import { buildSample } from "./sample";
import { rootCauses } from "./tree";
import type { ActionItem, Verification } from "./types";

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
      verification: {
        ...base.verification,
        recurred: "no" as const,
        reviewDate: "2026-05-01",
        eventsPerYearAfter: 1,
      },
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
  it("matches the case study data sheet (video/case-study.md)", () => {
    const v = calcVerification(s);
    expect(s.loss.eventsPerYear).toBe(6);
    expect(s.loss.downtimeHours).toBe(14);
    expect(s.loss.ratePerHour).toBe(120);
    expect(s.loss.marginPerUnit).toBe(18);
    expect(s.loss.repairCost).toBe(9500);
    expect(s.verification.eventsPerYearAfter).toBe(1);
    expect((s.loss.eventsPerYear ?? 0) * (s.loss.downtimeHours ?? 0)).toBe(84);
    expect(calcLoss(s.loss).lostUnitsPerEvent).toBe(1680);
    expect(calcLoss(s.loss).lostMarginPerEvent).toBe(30240);
    expect(calcLoss(s.loss).costPerEvent).toBe(39740);
    expect(v.annualLossBefore).toBe(238440);
    expect(v.annualLossAfter).toBe(39740);
    expect(v.annualSaving).toBe(198700);
    expect(v.totalActionCost).toBe(60000);
    expect(v.paybackMonths).toBeCloseTo(3.62, 2);
  });
  it("keeps the asset and has the 7 root-cause nodes of the case study", () => {
    expect(s.problem.asset.toLowerCase()).toContain("slurry pump p-101");
    expect(rootCauses(s.tree)).toHaveLength(7);
  });
});

describe("verified saving (DEF-02)", () => {
  const done: ActionItem = { id: "a", causeId: "", description: "", owner: "", dueDate: "", status: "done", cost: 0 };
  const open: ActionItem = { ...done, id: "b", status: "open" };
  const verification: Verification = {
    reviewDate: "2026-05-01",
    recurred: "no",
    eventsPerYearAfter: 1,
    notes: "",
  };
  const mk = (actions: ActionItem[], v = verification) => blankInvestigation({ loss, actions, verification: v });
  it("counts only when all actions are done, no recurrence and a review date", () => {
    expect(isVerifiedClosed(mk([done]))).toBe(true);
    expect(verifiedSaving(mk([done]))).toBe(6000);
    expect(verifiedSaving(mk([done, open]))).toBe(0);
    expect(verifiedSaving(mk([done], { ...verification, reviewDate: "" }))).toBe(0);
    expect(verifiedSaving(mk([done], { ...verification, recurred: "unreviewed" }))).toBe(0);
    expect(verifiedSaving(mk([]))).toBe(0);
    expect(verifiedSavingSplit(mk([done, open]))).toEqual({ cash: 0, opportunity: 0 });
  });
});

describe("loss shares", () => {
  it("old investigations (no share fields) are 100% lost for good", () => {
    expect(resolveShares(loss)).toEqual({ lost: 100, madeUp: 0, buffer: 0 });
    expect(wholeShares(loss)).toEqual({ lost: 100, madeUp: 0, buffer: 0 });
  });
  it("scales shares that do not total 100", () => {
    expect(resolveShares({ shareLost: 30, shareMadeUp: 30, shareBuffer: 0 })).toEqual({
      lost: 50,
      madeUp: 50,
      buffer: 0,
    });
    const s = resolveShares({ shareLost: 10, shareMadeUp: 10, shareBuffer: 10 });
    expect(s.lost + s.madeUp + s.buffer).toBeCloseTo(100, 9);
  });
  it("treats all-zero, negative and non-numeric shares safely", () => {
    expect(resolveShares({ shareLost: 0, shareMadeUp: 0, shareBuffer: 0 })).toEqual({ lost: 100, madeUp: 0, buffer: 0 });
    expect(resolveShares({ shareLost: -50, shareMadeUp: 50, shareBuffer: NaN })).toEqual({ lost: 0, madeUp: 100, buffer: 0 });
    expect(resolveShares({ shareLost: undefined, shareMadeUp: 40, shareBuffer: undefined })).toEqual({ lost: 0, madeUp: 100, buffer: 0 });
  });
  it("setShare keeps the total at 100 and the others in proportion", () => {
    const start = { lost: 100, madeUp: 0, buffer: 0 };
    expect(setShare(start, "madeUp", 30)).toEqual({ lost: 70, madeUp: 30, buffer: 0 });
    expect(setShare({ lost: 50, madeUp: 30, buffer: 20 }, "lost", 70)).toEqual({ lost: 70, madeUp: 18, buffer: 12 });
    expect(setShare({ lost: 50, madeUp: 30, buffer: 20 }, "lost", 100)).toEqual({ lost: 100, madeUp: 0, buffer: 0 });
    expect(setShare({ lost: 0, madeUp: 0, buffer: 100 }, "buffer", 40)).toEqual({ lost: 60, madeUp: 0, buffer: 40 });
    expect(setShare(start, "lost", 250)).toEqual({ lost: 100, madeUp: 0, buffer: 0 });
    expect(setShare(start, "lost", null)).toEqual({ lost: 0, madeUp: 100, buffer: 0 });
    expect(setShare(start, "lost", 33.6)).toEqual({ lost: 34, madeUp: 66, buffer: 0 });
    for (const a of [0, 1, 7, 33, 50, 99, 100]) {
      const r = setShare({ lost: 20, madeUp: 55, buffer: 25 }, "buffer", a);
      expect(r.lost + r.madeUp + r.buffer).toBe(100);
    }
  });
});

describe("calcLoss with the new cost model", () => {
  it("is unchanged for old data: all lost for good, repair is cash", () => {
    const c = calcLoss(loss);
    expect(c.cashPerEvent).toBe(1000);
    expect(c.opportunityPerEvent).toBe(1000);
    expect(c.annualCash).toBe(4000);
    expect(c.annualOpportunity).toBe(4000);
    expect(c.annualLoss).toBe(8000);
    expect(c.hoursLostPerYear).toBe(40);
    expect(c.unitsLostPerYear).toBe(800);
    expect(c.unitsLostForGoodPerYear).toBe(800);
  });
  it("splits lost units into lost, made up and buffered", () => {
    const c = calcLoss({
      ...loss,
      shareLost: 50,
      shareMadeUp: 30,
      shareBuffer: 20,
      recoveryCost: 600,
      bufferHoldingCostPerYear: 2000,
      otherCosts: [
        { id: "1", category: "scrap", description: "", amount: 300 },
        { id: "2", category: "penalties", description: "", amount: 100 },
      ],
    });
    expect(c.lostUnitsPerEvent).toBe(200);
    expect(c.unitsLostForGoodPerEvent).toBe(100);
    expect(c.unitsMadeUpPerEvent).toBe(60);
    expect(c.unitsBufferedPerEvent).toBe(40);
    expect(c.opportunityPerEvent).toBe(500); // 100 units x $5
    expect(c.cashPerEvent).toBe(1000 + 600 + 400);
    expect(c.costPerEvent).toBe(2500);
    expect(c.annualCash).toBe(2000 * 4 + 2000);
    expect(c.annualOpportunity).toBe(2000);
    expect(c.annualLoss).toBe(12000);
    expect(c.unitsLostForGoodPerYear).toBe(400);
    expect(c.unitsLostPerYear).toBe(800);
  });
  it("buffer stock has no cost per event and no recovery cost without made-up production", () => {
    const c = calcLoss({ ...loss, shareLost: 0, shareMadeUp: 0, shareBuffer: 100, recoveryCost: 999 });
    expect(c.opportunityPerEvent).toBe(0);
    expect(c.recoveryPerEvent).toBe(0);
    expect(c.costPerEvent).toBe(1000); // repair only
  });
  it("ignores holding cost when no production is buffered, and recovery when none is made up", () => {
    const c = calcLoss({ ...loss, bufferHoldingCostPerYear: 5000, recoveryCost: 700 });
    expect(c.bufferHoldingPerYear).toBe(0);
    expect(c.recoveryPerEvent).toBe(0);
    expect(c.annualLoss).toBe(8000);
  });
  it("handles zeros and blanks", () => {
    const zero = { ...loss, eventsPerYear: 0, downtimeHours: 0, repairCost: 0 };
    const c = calcLoss({ ...zero, otherCosts: [{ id: "1", category: "other", description: "", amount: null }] });
    expect(c.annualLoss).toBe(0);
    expect(c.hoursLostPerYear).toBe(0);
    expect(c.costPerEvent).toBe(0);
  });
  it("holding cost stays when events are overridden to 0", () => {
    const l = { ...loss, shareLost: 0, shareMadeUp: 0, shareBuffer: 100, bufferHoldingCostPerYear: 1500 };
    expect(calcLoss(l, 0).annualLoss).toBe(1500);
    expect(calcLoss(l).annualLoss).toBe(4000 + 1500);
  });
  it("margin is not required when nothing is lost for good", () => {
    const l = { ...loss, marginPerUnit: null, shareLost: 0, shareMadeUp: 100, shareBuffer: 0 };
    expect(missingLossInputs(l)).toEqual([]);
    expect(missingLossInputs({ ...l, shareLost: 100, shareMadeUp: 0 })).toEqual(["margin per unit"]);
  });
  it("carries the split through verification", () => {
    const l = { ...loss, shareLost: 50, shareMadeUp: 50, shareBuffer: 0, recoveryCost: 400 };
    const v = calcVerification({
      loss: l,
      actions: [],
      verification: { reviewDate: "", recurred: "no", eventsPerYearAfter: 1, notes: "" },
    });
    // per event: cash 1400, opportunity 500 -> 1900; 4 events before, 1 after
    expect(v.cashBefore).toBe(5600);
    expect(v.cashAfter).toBe(1400);
    expect(v.cashSaving).toBe(4200);
    expect(v.opportunityBefore).toBe(2000);
    expect(v.opportunityAfter).toBe(500);
    expect(v.opportunitySaving).toBe(1500);
    expect(v.annualSaving).toBe(v.cashSaving + v.opportunitySaving);
  });
  it("sample totals are unchanged and 100% lost for good", () => {
    const s = buildSample();
    const c = calcLoss(s.loss);
    expect(c.annualCash).toBe(57000);
    expect(c.annualOpportunity).toBe(181440);
    expect(c.annualLoss).toBe(238440);
    expect(verifiedSaving(s)).toBe(198700);
    expect(isVerifiedClosed(s)).toBe(true);
  });
});
