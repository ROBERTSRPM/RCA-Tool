import { describe, expect, it } from "vitest";
import v1 from "./sample-v1.fixture.json";
import { normaliseInvestigation } from "./normalize";
import { buildSample, SAMPLE_ID } from "./sample";
import { OLD_SAMPLE_FINGERPRINTS, sampleFingerprint, upgradeSampleIfOld } from "./sample-upgrade";
import { DATA_KEY, LocalStorageInvestigationStore, MemoryStorage } from "./store/local";
import { layoutActions } from "./capa";
import { runQualityCheck } from "./quality";

const old = () => normaliseInvestigation(structuredClone(v1))!;

describe("sample upgrade", () => {
  it("recognises the first shipped sample", () => {
    expect(OLD_SAMPLE_FINGERPRINTS.has(sampleFingerprint(old())!)).toBe(true);
    expect(sampleFingerprint(buildSample())).not.toBe(sampleFingerprint(old()));
  });
  it("replaces an unedited old sample, keeping its id, even if its updatedAt was stamped", () => {
    const stored = { ...old(), id: "sample-abc", updatedAt: "2026-11-16T13:43:27.959Z" };
    const up = upgradeSampleIfOld(stored)!;
    expect(up.id).toBe("sample-abc");
    expect(up.updatedAt > stored.updatedAt).toBe(true);
    expect(up.problem.assetTag).toBe("P-101");
    expect(up.verification.eventsPerYearAfter).toBe(0);
  });
  it("ignores UI-only differences such as collapsed nodes", () => {
    const stored = old();
    stored.tree = { ...stored.tree, collapsed: true };
    expect(upgradeSampleIfOld(stored)).not.toBeNull();
  });
  it("leaves an edited sample alone", () => {
    const a = old();
    a.problem.title += "!";
    expect(upgradeSampleIfOld(a)).toBeNull();
    const b = old();
    b.actions[0].cost = 1;
    expect(upgradeSampleIfOld(b)).toBeNull();
    const c = old();
    c.actions[0].kind = "corrective";
    expect(upgradeSampleIfOld(c)).toBeNull();
  });
  it("leaves the current sample, user investigations and unknown samples alone", () => {
    expect(upgradeSampleIfOld(buildSample())).toBeNull();
    expect(upgradeSampleIfOld({ ...old(), isSample: false })).toBeNull();
  });
  it("is applied when a browser store reads", async () => {
    const mem = new MemoryStorage();
    mem.setItem("rca.seeded.v1", "1");
    mem.setItem(DATA_KEY, JSON.stringify([v1]));
    const store = new LocalStorageInvestigationStore(() => mem);
    const [s] = await store.list();
    expect(s.id).toBe(SAMPLE_ID);
    expect(s.problem.assetTag).toBe("P-101");
    // stored back, so it is done once
    expect(JSON.parse(mem.getItem(DATA_KEY)!)[0].problem.assetTag).toBe("P-101");
  });
  it("is not applied to an edited sample in a browser store", async () => {
    const mem = new MemoryStorage();
    mem.setItem("rca.seeded.v1", "1");
    mem.setItem(DATA_KEY, JSON.stringify([{ ...v1, problem: { ...v1.problem, title: "My edit" } }]));
    const [s] = await new LocalStorageInvestigationStore(() => mem).list();
    expect(s.problem.title).toBe("My edit");
    expect(s.problem.assetTag).toBe("");
  });
});

describe("the new sample's actions", () => {
  it("has one corrective action, linked to the failure event, done at $0", () => {
    const s = buildSample();
    const { corrective } = layoutActions(s);
    expect(corrective).toHaveLength(1);
    expect(corrective[0]).toMatchObject({ causeId: s.tree.id, status: "done", cost: 0, category: "repair" });
    expect(corrective[0].description).toMatch(/new bearings and a new mechanical seal, laser aligned/);
    expect(runQualityCheck(s, "2026-06-01")).toEqual([]);
  });
  it("a corrective action on the failure event is not reported as unlinked", () => {
    const s = buildSample();
    s.actions.push({ ...s.actions[0], id: "x", causeId: s.tree.id, kind: "corrective" });
    expect(runQualityCheck(s, "2026-06-01").map((f) => f.rule)).not.toContain("action-not-linked");
  });
});
