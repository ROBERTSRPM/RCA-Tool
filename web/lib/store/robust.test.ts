import { describe, expect, it } from "vitest";
import { DATA_KEY, LocalStorageInvestigationStore, MemoryStorage } from "./local";
import { toStoreError, LIMIT_MESSAGE, TOO_LARGE_MESSAGE } from "./supabase";
import { buildSample, SAMPLE_ID } from "../sample";

function fresh(rows: unknown[]) {
  const mem = new MemoryStorage();
  mem.setItem("rca.seeded.v1", "1");
  mem.setItem(DATA_KEY, JSON.stringify(rows));
  return { mem, store: new LocalStorageInvestigationStore(() => mem) };
}

describe("local store with damaged rows", () => {
  it("lists readable rows, reports unreadable ones, and can delete them", async () => {
    const { mem, store } = fresh([buildSample(), { id: "bad-1", data: "x" }, { id: "bad-2" }, 5, null]);
    const res = await store.listAll();
    expect(res.items.map((i) => i.id)).toEqual([SAMPLE_ID]);
    expect(res.unreadable.map((u) => u.id).sort()).toEqual(["bad-1", "bad-2"]);
    expect((await store.list()).length).toBe(1);
    expect(await store.get("bad-1")).toBeNull();
    // writing something else keeps the damaged rows so the user can still delete them
    await store.create();
    expect((await store.listAll()).unreadable.length).toBe(2);
    await store.delete("bad-1");
    expect((await store.listAll()).unreadable.map((u) => u.id)).toEqual(["bad-2"]);
    expect(mem.getItem(DATA_KEY)).not.toContain("bad-1");
  });
  it("drops hostile images when saving", async () => {
    const { store } = fresh([]);
    const inv = await store.create();
    await store.update(inv.id, {
      evidence: [{ id: "e", type: "photo", title: "", note: "", date: "", image: "javascript:alert(1)" }],
    });
    expect((await store.get(inv.id))!.evidence[0].image).toBeNull();
  });
  it("exports raw rows", async () => {
    const { store } = fresh([{ id: "bad-1", data: 1 }]);
    const rows = await store.exportAll();
    expect(rows).toEqual([{ id: "bad-1", updatedAt: null, data: { id: "bad-1", data: 1 } }]);
  });
  it("clearAll empties the browser store and a fresh sample appears", async () => {
    const { store } = fresh([{ id: "bad-1" }]);
    store.clearAll();
    expect((await store.list()).map((i) => i.id)).toEqual([SAMPLE_ID]);
  });
});

describe("database limit errors", () => {
  it("maps a size check violation to a message about photos", () => {
    const e = toStoreError(
      {
        code: "23514",
        message:
          'new row for relation "investigations" violates check constraint "investigations_data_size_check"',
      },
      "save",
    );
    expect(e.code).toBe("too_large");
    expect(e.message).toBe(TOO_LARGE_MESSAGE);
    expect(e.message).toMatch(/too large/);
    expect(e.message).toMatch(/photos/);
    expect(toStoreError({ status: 413, message: "Payload Too Large" }, "save").code).toBe("too_large");
  });
  it("maps the per-user row cap to a clear message", () => {
    const e = toStoreError(
      { code: "P0001", message: "Investigation limit reached: an account can hold at most 500 investigations." },
      "save",
    );
    expect(e.code).toBe("limit");
    expect(e.message).toBe(LIMIT_MESSAGE);
    expect(e.message).toMatch(/500/);
  });
});

import { STORAGE_MESSAGE, SIGNED_OUT_MESSAGE } from "./supabase";
describe("storage cap and signed-out messages", () => {
  it("maps the database storage message to a clear one", () => {
    const e = toStoreError({ message: "Storage limit reached: an account can hold at most 50 MB" }, "save");
    expect(e.message).toBe(STORAGE_MESSAGE);
    expect(e.message).toContain("50 MB");
  });
  it("signed out saves read in plain words", () => {
    for (const err of [{ status: 401 }, { code: "PGRST301" }, { code: "42501" }, { message: "JWT expired" }]) {
      const e = toStoreError(err, "save");
      expect(e.message).toBe(SIGNED_OUT_MESSAGE);
      expect(e.code).toBe("auth");
    }
    expect(SIGNED_OUT_MESSAGE).toBe("You've been signed out. Sign in again to keep saving; your changes are still on this page.");
  });
});
