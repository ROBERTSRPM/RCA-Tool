import { beforeEach, describe, expect, it } from "vitest";
import { blankAsset } from "../assets";
import { buildExport } from "../account";
import { calcLoss, calcVerification, verifiedSaving } from "../finance";
import { rankRolloutCandidates, subjectFromProblem } from "../rollout";
import { buildSample, buildSampleAssets } from "../sample";
import { LocalStorageAssetStore } from "./assets-local";
import { isMissingTable, toAssetError } from "./assets-supabase";
import { MemoryStorage } from "./local";
import { StoreError } from "./types";

let store: LocalStorageAssetStore;
beforeEach(() => {
  const mem = new MemoryStorage();
  store = new LocalStorageAssetStore(() => mem);
});

describe("LocalStorageAssetStore", () => {
  it("seeds the sample assets on first use only", async () => {
    const first = await store.list();
    expect(first.map((a) => a.tag)).toEqual(["P-101", "P-102", "P-103", "P-210", "P-215"]);
    expect(first.every((a) => a.isSample)).toBe(true);
    for (const a of first) await store.delete(a.id);
    expect(await store.list()).toEqual([]);
  });

  it("creates, updates and deletes, one entry per tag", async () => {
    await store.list();
    const made = await store.create(blankAsset({ tag: "C-1", type: "Belt conveyor" }));
    expect((await store.list()).some((a) => a.id === made.id)).toBe(true);
    const dup = await store.createMany([blankAsset({ tag: " c-1 " }), blankAsset({ tag: "C-2" }), blankAsset({ tag: "" })]);
    expect(dup.map((a) => a.tag)).toEqual(["C-2"]);
    const upd = await store.update(made.id, { duty: "Ore feed" });
    expect(upd.duty).toBe("Ore feed");
    await expect(store.update(made.id, { tag: "p-101" })).rejects.toMatchObject({ code: "conflict" });
    await expect(store.update("nope", {})).rejects.toMatchObject({ code: "not_found" });
    await store.delete(made.id);
    expect((await store.list()).some((a) => a.id === made.id)).toBe(false);
  });

  it("restores the sample assets without touching the user's own", async () => {
    await store.list();
    const mine = await store.create(blankAsset({ tag: "X-1" }));
    await store.delete("sample-asset-p102");
    await store.update("sample-asset-p103", { duty: "Changed" });
    await store.resetSampleAssets();
    const list = await store.list();
    expect(list.find((a) => a.tag === "P-102")).toBeDefined();
    expect(list.find((a) => a.tag === "P-103")?.duty).toBe("Tailings transfer to the tailings dam");
    expect(list.find((a) => a.id === mine.id)).toBeDefined();
  });

  it("exports every stored row unmodified", async () => {
    const rows = await store.exportAll();
    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatchObject({ id: expect.any(String), data: expect.objectContaining({ tag: "P-101" }) });
  });

  it("survives damaged storage", async () => {
    const mem = new MemoryStorage();
    mem.setItem("rca.assets.seeded.v1", "1");
    mem.setItem("rca.assets.v1", "{not json");
    const s = new LocalStorageAssetStore(() => mem);
    expect(await s.list()).toEqual([]);
    mem.setItem("rca.assets.v1", JSON.stringify([1, null, { tag: "OK-1" }, { tag: "" }]));
    expect((await s.list()).map((a) => a.tag)).toEqual(["OK-1"]);
  });
});

describe("account export", () => {
  it("includes the asset register and still reads as before without it", () => {
    const d = new Date("2026-11-17T10:00:00Z");
    const withAssets = buildExport([], "a@b.test", d, [{ id: "x", updatedAt: null, data: { tag: "P-1" } }]);
    expect(withAssets.assetCount).toBe(1);
    expect(withAssets.assets[0].data).toEqual({ tag: "P-1" });
    const without = buildExport([], "a@b.test", d);
    expect(without.assets).toEqual([]);
    expect(without.investigations).toEqual([]);
  });
});

describe("a server without the assets table", () => {
  it("recognises the missing-table failures PostgREST and Postgres give", () => {
    expect(isMissingTable({ code: "PGRST205", message: "Could not find the table 'public.assets' in the schema cache" })).toBe(true);
    expect(isMissingTable({ code: "42P01", message: 'relation "public.assets" does not exist' })).toBe(true);
    expect(isMissingTable({ status: 404, message: "assets not found" })).toBe(true);
    expect(isMissingTable({ code: "23505", message: "duplicate key" })).toBe(false);
    expect(isMissingTable(null)).toBe(false);
  });
  it("turns it into an 'unavailable' store error with a plain message", () => {
    const e = toAssetError({ code: "PGRST205", message: "Could not find the table" }, "load");
    expect(e).toBeInstanceOf(StoreError);
    expect(e.code).toBe("unavailable");
    expect(e.message).toMatch(/not set up/);
  });
  it("maps the size and limit database errors", () => {
    expect(toAssetError({ message: 'violates check constraint "assets_data_size_check"' }, "save").code).toBe("too_large");
    expect(toAssetError({ message: "Asset limit reached: an account can hold at most 5000 assets." }, "save").code).toBe("limit");
  });
});

describe("the illustrative sample", () => {
  const s = buildSample();
  it("keeps its money figures", () => {
    expect(calcLoss(s.loss).annualLoss).toBe(238440);
    const v = calcVerification(s);
    expect(v.totalActionCost).toBe(60000);
    expect(v.annualSaving).toBe(198700);
    expect(verifiedSaving(s)).toBe(198700);
    expect(v.paybackMonths).toBeCloseTo(3.62, 1);
  });
  it("is still flagged illustrative", () => {
    expect(s.isSample).toBe(true);
  });
  it("has the new fields filled in", () => {
    expect(s.problem).toMatchObject({ assetTag: "P-101", assetType: "Slurry pump", criticality: "A", failureMode: "Bearing failure" });
    expect(s.actions.filter((a) => a.kind === "corrective").length).toBeGreaterThan(0);
    expect(s.actions.filter((a) => a.kind === "preventive").length).toBeGreaterThan(0);
    const tasks = s.actions.filter((a) => a.category === "maintenance_task" || a.category === "condition_monitoring");
    expect(tasks.length).toBeGreaterThanOrEqual(2);
    expect(tasks.every((a) => (a.task?.intervalValue ?? 0) > 0)).toBe(true);
    expect(s.spares?.needed).toBe("yes");
  });
  it("shows the roll-out: same-type pumps listed, the other pump type not", () => {
    const out = rankRolloutCandidates(subjectFromProblem(s.problem), buildSampleAssets());
    expect(out.map((c) => c.asset.tag)).toEqual(["P-102", "P-215", "P-103"]);
  });
});
