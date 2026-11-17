import { describe, expect, it } from "vitest";
import {
  assetFromProblem,
  assetStats,
  blankAsset,
  canonicalType,
  filterAssets,
  findAssetByTag,
  parseAssetList,
  planEnsureAsset,
  sortAssets,
  tagKey,
} from "./assets";
import { inv } from "./testing";

const pump = (tag: string, extra = {}) => blankAsset({ tag, type: "Slurry pump", ...extra });

describe("tag matching", () => {
  it("matches case-insensitively, trimmed", () => {
    const list = [pump("P-101")];
    expect(findAssetByTag(list, "  p-101  ")?.tag).toBe("P-101");
    expect(findAssetByTag(list, "P-102")).toBeUndefined();
  });
  it("never matches an empty tag", () => {
    expect(findAssetByTag([pump("")], "")).toBeUndefined();
    expect(findAssetByTag([pump("P-1")], "   ")).toBeUndefined();
    expect(tagKey(undefined)).toBe("");
  });
  it("collapses inner spaces", () => {
    expect(tagKey("P  101")).toBe(tagKey("p 101"));
  });
});

describe("canonicalType", () => {
  it("uses the list label for a known type and keeps free text", () => {
    expect(canonicalType("slurry PUMP ")).toBe("Slurry pump");
    expect(canonicalType("Vacuum furnace")).toBe("Vacuum furnace");
    expect(canonicalType(undefined)).toBe("");
  });
});

describe("creating assets from an investigation", () => {
  it("creates nothing without a tag", () => {
    expect(assetFromProblem({ assetType: "Slurry pump" })).toBeNull();
    expect(planEnsureAsset([], {})).toEqual({ action: "none" });
  });
  it("creates a new asset from the tag and details", () => {
    const plan = planEnsureAsset([], {
      assetTag: " P-101 ",
      assetType: "slurry pump",
      makeModel: "Warman",
      duty: "feed",
      criticality: "A",
      site: "Plant",
    });
    expect(plan.action).toBe("create");
    if (plan.action === "create") {
      expect(plan.asset).toMatchObject({ tag: "P-101", type: "Slurry pump", makeModel: "Warman", duty: "feed", criticality: "A", site: "Plant" });
    }
  });
  it("does not duplicate an existing tag, and only fills blanks", () => {
    const existing = pump("P-101", { duty: "Original duty" });
    expect(planEnsureAsset([existing], { assetTag: "p-101", assetType: "Slurry pump", duty: "Different" })).toEqual({ action: "none" });
    const plan = planEnsureAsset([existing], { assetTag: "p-101", makeModel: "Warman", duty: "Different" });
    expect(plan.action).toBe("update");
    if (plan.action === "update") {
      expect(plan.asset.makeModel).toBe("Warman");
      expect(plan.asset.duty).toBe("Original duty");
      expect(plan.asset.id).toBe(existing.id);
    }
  });
});

describe("parseAssetList", () => {
  it("reads tag, type, duty from commas, tabs, semicolons or pipes", () => {
    const r = parseAssetList("P-102, slurry pump, Tailings transfer\nC-1\tBelt conveyor\tOre feed\nF-1;Fan/blower;Mill ventilation\nT-1|Tank/vessel|Buffer");
    expect(r.assets).toEqual([
      { tag: "P-102", type: "Slurry pump", duty: "Tailings transfer" },
      { tag: "C-1", type: "Belt conveyor", duty: "Ore feed" },
      { tag: "F-1", type: "Fan/blower", duty: "Mill ventilation" },
      { tag: "T-1", type: "Tank/vessel", duty: "Buffer" },
    ]);
  });
  it("allows only a tag, keeps commas inside the duty, skips blank lines", () => {
    const r = parseAssetList("\nP-9\n\nP-10, Slurry pump, Feed, line 2\n");
    expect(r.assets).toEqual([
      { tag: "P-9", type: "", duty: "" },
      { tag: "P-10", type: "Slurry pump", duty: "Feed, line 2" },
    ]);
  });
  it("skips tags already registered or repeated, and lines with no tag", () => {
    const r = parseAssetList("p-101, Slurry pump\nP-102\nP-102\n, Slurry pump, x", [pump("P-101")]);
    expect(r.assets.map((a) => a.tag)).toEqual(["P-102"]);
    expect(r.duplicates).toEqual(["p-101", "P-102"]);
    expect(r.blankLines).toBe(1);
  });
});

describe("assetStats", () => {
  const loss = { eventsPerYear: 2, downtimeHours: 10, ratePerHour: 100, unitName: "t", marginPerUnit: 1, repairCost: 500, currency: "$" };
  const a = pump("P-101");
  it("counts investigations, failures per year and annual loss for the matching tag", () => {
    const i1 = inv("1", { assetTag: "p-101", title: "One" }, { loss });
    const i2 = inv("2", { assetTag: "P-101" }, { loss: { ...loss, eventsPerYear: 1 } });
    const other = inv("3", { assetTag: "P-102" }, { loss });
    const s = assetStats(a, [i1, i2, other]);
    expect(s.investigations.map((i) => i.id)).toEqual(["1", "2"]);
    expect(s.failuresPerYear).toBe(3);
    // (10h x 100 x $1 + $500) = 1500 per event
    expect(s.annualLoss).toBe(1500 * 3);
    expect(s.currency).toBe("$");
    expect(s.mixedCurrency).toBe(false);
  });
  it("is empty for an asset with no investigations or no tag", () => {
    expect(assetStats(a, []).annualLoss).toBe(0);
    expect(assetStats(pump(""), [inv("1", { assetTag: "" })]).investigations).toEqual([]);
  });
  it("flags mixed currencies and sums only the most common", () => {
    const i1 = inv("1", { assetTag: "P-101" }, { loss });
    const i2 = inv("2", { assetTag: "P-101" }, { loss });
    const i3 = inv("3", { assetTag: "P-101" }, { loss: { ...loss, currency: "EUR" } });
    const s = assetStats(a, [i1, i2, i3]);
    expect(s.mixedCurrency).toBe(true);
    expect(s.annualLoss).toBe(1500 * 2 * 2);
  });
});

describe("sorting and filtering", () => {
  it("sorts by tag naturally and searches several fields", () => {
    const list = [pump("P-10"), pump("P-2"), pump("C-1", { type: "Belt conveyor", duty: "Ore feed" })];
    expect(sortAssets(list).map((a) => a.tag)).toEqual(["C-1", "P-2", "P-10"]);
    expect(filterAssets(list, "ore").map((a) => a.tag)).toEqual(["C-1"]);
    expect(filterAssets(list, "  ")).toHaveLength(3);
  });
});
