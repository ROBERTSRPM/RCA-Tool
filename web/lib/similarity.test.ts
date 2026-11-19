import { describe, expect, it } from "vitest";
import { copyOfCause, describingWords, MIN_SCORE, rankSimilar, scoreSimilarity, WEIGHTS } from "./similarity";
import { significantWords } from "./text";
import { action, inv, withCause } from "./testing";
import { updateNode } from "./tree";
import { newNode } from "./tree";

describe("significantWords", () => {
  it("drops stop-words, short words and plain numbers, keeps each word once", () => {
    expect(significantWords("The pump and the Pump failed in 2025 with a bearing")).toEqual(["pump", "bearing"]);
  });
  it("copes with non-strings", () => {
    expect(significantWords(undefined)).toEqual([]);
    expect(significantWords(null)).toEqual([]);
  });
});

describe("scoreSimilarity", () => {
  const cur = inv("a", {
    title: "Seal leak on slurry pump",
    assetTag: "P-101",
    assetType: "Slurry pump",
    failureMode: "Seal or gland leak",
  });

  it("gives the asset tag the strongest weight, ignoring case and spaces", () => {
    const other = inv("b", { assetTag: "  p-101 " });
    const s = scoreSimilarity(cur, other);
    expect(s.score).toBe(WEIGHTS.sameTag);
    expect(s.reasons.map((r) => r.code)).toEqual(["tag"]);
  });

  it("ranks tag above type above failure mode above a shared word", () => {
    const tag = scoreSimilarity(cur, inv("1", { assetTag: "P-101" })).score;
    const type = scoreSimilarity(cur, inv("2", { assetType: "slurry pump" })).score;
    const mode = scoreSimilarity(cur, inv("3", { failureMode: "seal or gland leak" })).score;
    const word = scoreSimilarity(cur, inv("4", { title: "Another slurry problem" })).score;
    expect(tag).toBeGreaterThan(type);
    expect(type).toBeGreaterThan(mode);
    expect(mode).toBeGreaterThan(word);
  });

  it("adds the signals up and explains each one", () => {
    const other = inv("b", {
      title: "Slurry pump seal leaking again",
      assetTag: "P-101",
      assetType: "Slurry pump",
      failureMode: "Seal or gland leak",
    });
    const s = scoreSimilarity(cur, other);
    expect(s.reasons.map((r) => r.code)).toEqual(["tag", "type", "failure_mode", "words"]);
    expect(s.score).toBe(s.reasons.reduce((n, r) => n + r.points, 0));
    expect(s.sharedWords).toEqual(expect.arrayContaining(["slurry", "pump", "seal"]));
  });

  it("caps the points from shared words", () => {
    const words = "alpha bravo charlie delta echo foxtrot golf hotel";
    const a = inv("a", { title: words });
    const b = inv("b", { title: words });
    expect(scoreSimilarity(a, b).score).toBe(WEIGHTS.maxWordPoints);
  });

  it("does not match empty or 'Other' values with each other", () => {
    const a = inv("a", { assetType: "Other", failureMode: "other" });
    const b = inv("b", { assetType: "Other", failureMode: "Other" });
    expect(scoreSimilarity(a, b).score).toBe(0);
    expect(scoreSimilarity(inv("c"), inv("d")).score).toBe(0);
  });

  it("uses the failure event text as well as the title and description", () => {
    const a = withCause(inv("a"), null, {});
    a.tree = { ...a.tree, text: "Gearbox overheated" };
    expect(describingWords(a)).toContain("gearbox");
  });
});

describe("rankSimilar", () => {
  const cur = inv("cur", { title: "Seal leak", assetTag: "P-101", assetType: "Slurry pump" });

  it("excludes itself, drops weak matches and sorts best first", () => {
    const strong = inv("strong", { assetTag: "P-101", title: "Old seal leak" });
    const medium = inv("medium", { assetType: "Slurry pump" });
    const weak = inv("weak", { title: "Conveyor belt" });
    const oneWord = inv("one", { title: "Seal only" }); // 1 shared word = 3 points < MIN_SCORE
    const out = rankSimilar(cur, [weak, medium, cur, strong, oneWord]);
    expect(out.map((o) => o.inv.id)).toEqual(["strong", "medium"]);
    expect(MIN_SCORE).toBeGreaterThan(WEIGHTS.perSharedWord);
  });

  it("breaks ties by newest event date and respects the limit", () => {
    const older = inv("older", { assetType: "Slurry pump", eventDate: "2024-01-01" });
    const newer = inv("newer", { assetType: "Slurry pump", eventDate: "2025-01-01" });
    expect(rankSimilar(cur, [older, newer]).map((o) => o.inv.id)).toEqual(["newer", "older"]);
    expect(rankSimilar(cur, [older, newer], 1)).toHaveLength(1);
  });

  it("returns root causes, done actions and whether the fix is verified", () => {
    let o = inv("o", { assetTag: "P-101" });
    o = withCause(o, null, { id: "rc", text: "No alignment standard", isRootCause: true, category: "system" });
    o = {
      ...o,
      actions: [
        action({ id: "a1", causeId: "rc", status: "done", description: "Write standard" }),
        action({ id: "a2", causeId: "rc", status: "open" }),
      ],
    };
    const r = rankSimilar(cur, [o])[0];
    expect(r.rootCauses.map((c) => c.text)).toEqual(["No alignment standard"]);
    expect(r.doneActions.map((a) => a.id)).toEqual(["a1"]);
    expect(r.fixVerified).toBe(false);

    const closed = {
      ...o,
      actions: [action({ id: "a1", causeId: "rc", status: "done" })],
      verification: { ...o.verification, recurred: "no" as const, reviewDate: "2026-01-01" },
    };
    expect(rankSimilar(cur, [closed])[0].fixVerified).toBe(true);
  });
});

describe("copyOfCause", () => {
  it("is always a fresh hypothesis, never verified, with no evidence or children", () => {
    let src = newNode({ id: "x", text: "Oil contaminated", category: "physical", status: "verified", isRootCause: true, evidenceIds: ["e1"] });
    src = updateNode(src, "x", { deterioration: "forced" });
    src = { ...src, children: [newNode({ text: "child" })] };
    const c = copyOfCause(src, "new-id");
    expect(c).toMatchObject({
      id: "new-id",
      text: "Oil contaminated",
      category: "physical",
      status: "hypothesis",
      isRootCause: false,
      evidenceIds: [],
      children: [],
      deterioration: "forced",
    });
  });
});

describe("relevance rule", () => {
  const gearbox = inv("g", {
    title: "Bearing failure on conveyor gearbox",
    assetTag: "CV-204",
    assetType: "Gearbox",
    failureMode: "Bearing failure",
  });
  it("never offers the sample to a real investigation", () => {
    const sample = { ...inv("s", { title: "Bearing failure on slurry pump", assetType: "Gearbox", failureMode: "Bearing failure" }), isSample: true };
    expect(rankSimilar(gearbox, [sample])).toEqual([]);
  });
  it("does not match on words alone", () => {
    const other = inv("o", { title: "Bearing failure on conveyor drive", assetType: "Pump" });
    expect(rankSimilar(gearbox, [other])).toEqual([]);
  });
  it("does not match on failure mode alone with one shared word", () => {
    const other = inv("o2", { title: "Seized roller", assetType: "Pump", failureMode: "Bearing failure" });
    expect(rankSimilar(gearbox, [other])).toEqual([]);
  });
  it("matches the same asset type", () => {
    const other = inv("o3", { title: "Oil leak", assetType: "gearbox" });
    expect(rankSimilar(gearbox, [other])).toHaveLength(1);
  });
});
