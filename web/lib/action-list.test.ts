import { describe, expect, it } from "vitest";
import {
  actionsToCsv,
  addDaysISO,
  buildRows,
  csvCell,
  csvFileName,
  DEFAULT_FILTERS,
  filterChoices,
  filterRows,
  filtersFromParams,
  isDueThisWeek,
  neighbourKey,
  openCountText,
  NO_OWNER,
  setActionDone,
  withActionDone,
  type ActionFilters,
} from "./action-list";
import { blankInvestigation } from "./investigation";
import { deriveStatus, summarise } from "./status";
import { LocalStorageInvestigationStore, MemoryStorage } from "./store/local";
import type { ActionItem, Investigation } from "./types";

const TODAY = "2026-11-22";

const act = (id: string, p: Partial<ActionItem> = {}): ActionItem => ({
  id,
  causeId: "",
  description: `Action ${id}`,
  owner: "",
  dueDate: "",
  status: "open",
  cost: null,
  kind: "corrective",
  ...p,
});

function inv(title: string, asset: string, actions: ActionItem[], tag = ""): Investigation {
  const i = blankInvestigation();
  i.problem.title = title;
  i.problem.asset = asset;
  i.problem.assetTag = tag;
  i.actions = actions;
  return i;
}

const A = inv("Pump seal leak", "Tailings pump", [
  act("a1", { dueDate: "2026-11-10", owner: "Sam", kind: "corrective" }), // overdue
  act("a2", { dueDate: "2026-11-25", owner: "Ana", kind: "preventive" }), // this week
  act("a3", { dueDate: "2026-12-30", owner: "Sam", kind: "preventive", status: "in_progress" }),
  act("a4", { dueDate: "2026-11-01", owner: "Sam", status: "done" }),
], "P-101");
const B = inv("Belt tear", "", [
  act("b1", { dueDate: "", owner: "", kind: "" }),
  act("b2", { dueDate: "2026-11-22", owner: "Ana", kind: "corrective" }), // due today
  act("b3", { dueDate: "2026-11-05", owner: "Ana", kind: "preventive" }), // overdue, earlier
]);
const rows = buildRows([A, B]);
const ids = (f: Partial<ActionFilters>) =>
  filterRows(rows, { ...DEFAULT_FILTERS, ...f }, TODAY).map((r) => r.action.id);

describe("rows", () => {
  it("lists every action with its investigation and asset", () => {
    expect(rows).toHaveLength(7);
    expect(rows[0]).toMatchObject({ invId: A.id, invTitle: "Pump seal leak", asset: "P-101 Tailings pump" });
    expect(rows.find((r) => r.action.id === "b1")).toMatchObject({ asset: "" });
  });
  it("names an untitled investigation", () => {
    expect(buildRows([inv("", "", [act("x")])])[0].invTitle).toBe("Untitled investigation");
  });
  it("shows the tag and name once", () => {
    expect(buildRows([inv("T", "Conveyor C-2", [act("x")], "C-2")])[0].asset).toBe("Conveyor C-2");
    expect(buildRows([inv("T", "Slurry pump P-101", [act("x")], "P-101")])[0].asset).toBe("Slurry pump P-101");
    expect(buildRows([inv("T", "", [act("x")], "C-2")])[0].asset).toBe("C-2");
    expect(buildRows([inv("T", "Fan", [act("x")], "")])[0].asset).toBe("Fan");
  });
  it("does not repeat a tag already in the asset name", () => {
    expect(buildRows([inv("T", "P-101 Tailings pump", [act("x")], "p-101")])[0].asset).toBe("P-101 Tailings pump");
  });
});

describe("dates", () => {
  it("adds days across month and year ends", () => {
    expect(addDaysISO("2026-12-30", 6)).toBe("2027-01-05");
    expect(addDaysISO("2028-02-27", 2)).toBe("2028-02-29");
  });
  it("due this week is today through day 7, never overdue", () => {
    const d = (dueDate: string) => isDueThisWeek(act("x", { dueDate }), TODAY);
    expect(d("2026-11-21")).toBe(false);
    expect(d("2026-11-22")).toBe(true);
    expect(d("2026-11-28")).toBe(true);
    expect(d("2026-11-29")).toBe(false);
    expect(d("")).toBe(false);
  });
});

describe("filters", () => {
  it("defaults to open actions, overdue first, then by due date, no date last", () => {
    expect(ids({})).toEqual(["b3", "a1", "b2", "a2", "a3", "b1"]);
  });
  it("counts in progress as open, as the dashboard does", () => {
    expect(ids({})).toContain("a3");
    expect(ids({ status: "done" })).toEqual(["a4"]);
    expect(ids({ status: "all" })).toHaveLength(7);
  });
  it("overdue matches the investigation summary", () => {
    expect(ids({ due: "overdue" })).toEqual(["b3", "a1"]);
    const overdue = [A, B].reduce((n, i) => n + summarise(i, TODAY).overdueActions, 0);
    expect(overdue).toBe(2);
    // a done action is never overdue
    expect(ids({ status: "all", due: "overdue" })).not.toContain("a4");
  });
  it("due this week", () => {
    expect(ids({ due: "week" })).toEqual(["b2", "a2"]);
  });
  it("owner, including no owner", () => {
    expect(ids({ owner: "Ana" })).toEqual(["b3", "b2", "a2"]);
    expect(ids({ owner: NO_OWNER })).toEqual(["b1"]);
  });
  it("asset", () => {
    expect(ids({ asset: "P-101 Tailings pump" })).toEqual(["a1", "a2", "a3"]);
    expect(ids({ asset: "__none__" })).toEqual(["b3", "b2", "b1"]);
  });
  it("type, including not set", () => {
    expect(ids({ type: "corrective" })).toEqual(["a1", "b2"]);
    expect(ids({ type: "unset" })).toEqual(["b1"]);
  });
  it("combines filters", () => {
    expect(ids({ owner: "Ana", type: "preventive", due: "overdue" })).toEqual(["b3"]);
    expect(ids({ owner: "Sam", due: "week" })).toEqual([]);
  });
  it("offers distinct owners and assets", () => {
    expect(filterChoices(rows)).toEqual({
      owners: ["Ana", "Sam"],
      assets: ["P-101 Tailings pump"],
      blankOwner: true,
      blankAsset: true,
    });
  });
  it("reads filters from a dashboard link and ignores junk", () => {
    const q = (s: string) => filtersFromParams((k) => new URLSearchParams(s).get(k));
    expect(q("status=open&due=overdue")).toEqual({ ...DEFAULT_FILTERS, due: "overdue" });
    expect(q("status=bogus&due=x&type=zzz")).toEqual(DEFAULT_FILTERS);
    expect(q("")).toEqual(DEFAULT_FILTERS);
  });
});

describe("csv", () => {
  it("starts with a UTF-8 BOM and a header, one line per visible row", () => {
    const csv = actionsToCsv(filterRows(rows, { ...DEFAULT_FILTERS, due: "overdue" }, TODAY));
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[0]).toBe("Action,Type,Owner,Due date,Status,Asset,Investigation");
    expect(lines[1]).toBe("Action b3,Preventive,Ana,2026-11-05,Open,,Belt tear");
    expect(lines[2]).toBe("Action a1,Corrective,Sam,2026-11-10,Open,P-101 Tailings pump,Pump seal leak");
    expect(lines).toHaveLength(4); // header, 2 rows, trailing newline
  });
  it("exports only what is passed in (a filtered list), header only when empty", () => {
    expect(actionsToCsv([]).slice(1)).toBe("Action,Type,Owner,Due date,Status,Asset,Investigation\r\n");
  });
  it("quotes commas, quotes and new lines, and keeps accents", () => {
    expect(csvCell('Replace "seal", then test')).toBe('"Replace ""seal"", then test"');
    expect(csvCell("line one\nline two")).toBe('"line one\nline two"');
    expect(csvCell("Café ünïcode")).toBe("Café ünïcode");
  });
  it("defuses spreadsheet formulas", () => {
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell("-1+2")).toBe("'-1+2");
  });
  it("names the file with the date", () => {
    expect(csvFileName(TODAY)).toBe("rca-pilot-actions-2026-11-22.csv");
  });
});

describe("tick done", () => {
  it("sets done, and back to open", () => {
    const next = withActionDone(A.actions, "a3", true);
    expect(next.find((a) => a.id === "a3")!.status).toBe("done");
    expect(withActionDone(next, "a3", false).find((a) => a.id === "a3")!.status).toBe("in_progress");
    // an action that was Open comes back Open, and the memory note is cleared
    const o = withActionDone(A.actions, "a1", true);
    const back = withActionDone(o, "a1", false).find((a) => a.id === "a1")!;
    expect(back.status).toBe("open");
    expect(back).not.toHaveProperty("statusBeforeDone");
    // done with nothing remembered (set in the investigation) goes to Open
    expect(withActionDone(A.actions, "a4", false).find((a) => a.id === "a4")!.status).toBe("open");
    expect(A.actions.find((a) => a.id === "a3")!.status).toBe("in_progress"); // input untouched
  });

  it("writes to the investigation, so counts, status and Verify logic follow", async () => {
    const mem = new MemoryStorage();
    const store = new LocalStorageInvestigationStore(() => mem);
    const created = await store.create({
      problem: { ...blankInvestigation().problem, title: "Fan trip" },
      actions: [act("x1", { dueDate: "2020-01-01" }), act("x2", { status: "done" })],
    });
    expect(summarise(created, TODAY)).toMatchObject({ openActions: 1, overdueActions: 1, status: "actions" });

    const saved = await setActionDone(store, created.id, "x1", true);
    const reread = (await store.get(created.id))!;
    expect(reread.actions.map((a) => a.status)).toEqual(["done", "done"]);
    expect(reread.updatedAt).toBe(saved.updatedAt);
    expect(summarise(reread, TODAY)).toMatchObject({ openActions: 0, overdueActions: 0 });
    // all actions done and no review yet: waiting to verify
    expect(deriveStatus(reread)).toBe("verifying");

    await setActionDone(store, created.id, "x1", false);
    expect(deriveStatus((await store.get(created.id))!)).toBe("actions");
  });

  it("builds on the latest saved version and never overwrites a newer one", async () => {
    const mem = new MemoryStorage();
    const store = new LocalStorageInvestigationStore(() => mem);
    const created = await store.create({ actions: [act("y1"), act("y2")] });
    // Another tab saves an edit first.
    await store.update(created.id, { actions: [act("y1"), act("y2", { owner: "Lee" })] });
    await setActionDone(store, created.id, "y1", true);
    const after = (await store.get(created.id))!;
    expect(after.actions.find((a) => a.id === "y2")!.owner).toBe("Lee");
    expect(after.actions.find((a) => a.id === "y1")!.status).toBe("done");
  });

  it("fails clearly when the action or investigation is gone", async () => {
    const store = new LocalStorageInvestigationStore(() => new MemoryStorage());
    const created = await store.create({ actions: [act("z1")] });
    await expect(setActionDone(store, created.id, "nope", true)).rejects.toThrow(/no longer exists/);
    await expect(setActionDone(store, "missing", "z1", true)).rejects.toThrow(/no longer exists/);
  });
});

describe("focus and announcements", () => {
  const keys = [{ key: "a" }, { key: "b" }, { key: "c" }];
  it("moves to the next row, else the previous, else nothing", () => {
    expect(neighbourKey(keys, "a")).toBe("b");
    expect(neighbourKey(keys, "b")).toBe("c");
    expect(neighbourKey(keys, "c")).toBe("b");
    expect(neighbourKey([{ key: "a" }], "a")).toBeNull();
    expect(neighbourKey(keys, "zzz")).toBeNull();
  });
  it("counts open actions across investigations", () => {
    expect(openCountText([A, B])).toBe("6 open actions");
    expect(openCountText([inv("T", "", [act("x")])])).toBe("1 open action");
    expect(openCountText([])).toBe("0 open actions");
  });
  it("keeps the remembered status through a save and reload", async () => {
    const mem = new MemoryStorage();
    const store = new LocalStorageInvestigationStore(() => mem);
    const c = await store.create({ actions: [act("p1", { status: "in_progress" })] });
    await setActionDone(store, c.id, "p1", true);
    expect((await store.get(c.id))!.actions[0].statusBeforeDone).toBe("in_progress");
    await setActionDone(store, c.id, "p1", false);
    expect((await store.get(c.id))!.actions[0].status).toBe("in_progress");
  });
});
