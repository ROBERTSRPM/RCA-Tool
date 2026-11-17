import { describe, expect, it } from "vitest";
import {
  buildExport,
  DELETE_UNAVAILABLE_MESSAGE,
  deleteAccountError,
  exportFileName,
  isDeleteConfirmed,
} from "./account";

describe("account helpers", () => {
  it("builds one export document", () => {
    const d = new Date("2026-11-16T10:00:00Z");
    const out = buildExport([{ id: "a", updatedAt: null, data: { x: 1 } }], "a@b.test", d);
    expect(out.count).toBe(1);
    expect(out.account).toBe("a@b.test");
    expect(out.exportedAt).toBe("2026-11-16T10:00:00.000Z");
    expect(out.investigations[0].data).toEqual({ x: 1 });
    expect(exportFileName(d)).toBe("rootloop-my-data-2026-11-16.json");
  });
  it("needs the exact typed word", () => {
    expect(isDeleteConfirmed("DELETE")).toBe(true);
    expect(isDeleteConfirmed(" DELETE ")).toBe(true);
    expect(isDeleteConfirmed("delete")).toBe(false);
    expect(isDeleteConfirmed("")).toBe(false);
  });
  it("explains a missing function clearly", () => {
    expect(deleteAccountError({ code: "PGRST202", message: "Could not find the function public.delete_own_account without parameters in the schema cache" })).toBe(DELETE_UNAVAILABLE_MESSAGE);
    expect(deleteAccountError({ status: 404, message: "" })).toBe(DELETE_UNAVAILABLE_MESSAGE);
    expect(deleteAccountError({ message: "Failed to fetch" })).toMatch(/no connection/);
    expect(deleteAccountError({ message: "weird" })).toMatch(/Nothing was deleted/);
  });
});
