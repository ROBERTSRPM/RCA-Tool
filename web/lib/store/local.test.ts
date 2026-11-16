import { beforeEach, describe, expect, it } from "vitest";
import { buildSample, SAMPLE_ID } from "../sample";
import { LocalStorageInvestigationStore, MemoryStorage } from "./local";
import { runQualityCheck } from "../quality";
import { deriveStatus } from "../status";

let store: LocalStorageInvestigationStore;
beforeEach(() => {
  const mem = new MemoryStorage();
  store = new LocalStorageInvestigationStore(() => mem);
});

describe("LocalStorageInvestigationStore", () => {
  it("seeds the sample on first use only", async () => {
    expect((await store.list()).map((i) => i.id)).toEqual([SAMPLE_ID]);
    await store.delete(SAMPLE_ID);
    expect(await store.list()).toEqual([]);
  });

  it("creates, updates and gets", async () => {
    const created = await store.create({ problem: { ...(await store.create()).problem, title: "T" } });
    const updated = await store.update(created.id, { loss: { ...created.loss, eventsPerYear: 3 } });
    expect(updated.loss.eventsPerYear).toBe(3);
    expect((await store.get(created.id))!.problem.title).toBe("T");
    await expect(store.update("nope", {})).rejects.toThrow();
  });

  it("duplicates with fresh ids and intact links", async () => {
    const copy = (await store.duplicate(SAMPLE_ID))!;
    const orig = buildSample();
    expect(copy.id).not.toBe(orig.id);
    expect(copy.isSample).toBe(false);
    expect(copy.problem.title).toBe(`Copy of ${orig.problem.title}`);
    // links remain valid, so the copy is as clean as the original
    expect(runQualityCheck(copy, "2026-06-01")).toEqual([]);
    expect(deriveStatus(copy)).toBe("closed");
    expect(copy.evidence.map((e) => e.id)).not.toContain(orig.evidence[0].id);
  });

  it("deletes and resets the sample", async () => {
    await store.delete(SAMPLE_ID);
    await store.resetSample();
    const list = await store.list();
    expect(list.filter((i) => i.id === SAMPLE_ID)).toHaveLength(1);
  });

  it("survives corrupt stored data", async () => {
    const mem = new MemoryStorage();
    mem.setItem("rca.seeded.v1", "1");
    mem.setItem("rca.investigations.v1", "{not json");
    const s = new LocalStorageInvestigationStore(() => mem);
    expect(await s.list()).toEqual([]);
  });
});
