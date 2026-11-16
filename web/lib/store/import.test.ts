import { describe, expect, it } from "vitest";
import { blankInvestigation } from "../investigation";
import { buildSample } from "../sample";
import { decideImport, isUntouchedSample, prepareImport } from "./import";

describe("local to account import decision", () => {
  const sample = buildSample();
  const mine = blankInvestigation({ problem: { ...blankInvestigation().problem, title: "Mine" } });

  it("does not offer when the browser only holds the untouched sample", () => {
    expect(isUntouchedSample(sample)).toBe(true);
    expect(decideImport([sample], false)).toEqual({ offer: false, candidates: [] });
    expect(decideImport([], false).offer).toBe(false);
  });

  it("offers when there is real work, excluding the untouched sample", () => {
    const d = decideImport([sample, mine], false);
    expect(d.offer).toBe(true);
    expect(d.candidates).toEqual([mine]);
  });

  it("treats an edited sample as real work", () => {
    const edited = { ...sample, updatedAt: "2026-05-01T10:00:00.000Z" };
    expect(isUntouchedSample(edited)).toBe(false);
    expect(decideImport([edited], false).candidates).toEqual([edited]);
  });

  it("offers only once", () => {
    expect(decideImport([mine], true).offer).toBe(false);
  });

  it("prepares copies with fresh ids and no sample flag", () => {
    const edited = { ...sample, updatedAt: "2026-05-01T10:00:00.000Z" };
    const copy = prepareImport(edited);
    expect(copy.id).not.toBe(edited.id);
    expect(copy.isSample).toBe(false);
    expect(copy.problem).toEqual(edited.problem);
  });
});
