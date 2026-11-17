import { describe, expect, it } from "vitest";
import { blankInvestigation } from "./investigation";
import { isSafeImage, normaliseInvestigation, readRow, safeImage, sanitiseForSave } from "./normalize";
import { buildSample } from "./sample";
import { summarise } from "./status";
import { calcLoss } from "./finance";
import { runQualityCheck } from "./quality";
import type { Investigation } from "./types";

const JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
const PNG = "data:image/png;base64,iVBORw0KGgo=";
const WEBP = "data:image/webp;base64,UklGRhoAAABXRUJQ";

describe("evidence image rule", () => {
  it("accepts base64 jpeg, png and webp data URLs only", () => {
    expect(isSafeImage(JPEG)).toBe(true);
    expect(isSafeImage(PNG)).toBe(true);
    expect(isSafeImage(WEBP)).toBe(true);
  });
  it("rejects everything else", () => {
    for (const bad of [
      "data:image/svg+xml;base64,PHN2Zz48c2NyaXB0Pg==",
      "data:image/svg+xml,<svg onload=alert(1)>",
      "data:text/html;base64,PHNjcmlwdD4=",
      "data:text/html,<script>alert(1)</script>",
      "javascript:alert(1)",
      "https://evil.example.com/track.gif",
      "http://evil.example.com/a.png",
      '"><img src=x onerror=alert(1)>',
      "data:image/jpeg;base64,",
      "data:image/jpeg,AAAA",
      "data:image/gif;base64,R0lGODlh",
      "data:image/jpeg;base64,AAAA\" onerror=\"alert(1)",
      "data:image/jpeg;base64,AAAA AAAA",
      " data:image/jpeg;base64,AAAA",
      "DATA:image/jpeg;base64,AAAA",
      "",
      null,
      undefined,
      42,
      {},
      ["data:image/png;base64,AAAA"],
    ]) {
      expect(isSafeImage(bad), JSON.stringify(bad)).toBe(false);
      expect(safeImage(bad)).toBeNull();
    }
  });
  it("handles a multi-megabyte image quickly", () => {
    const big = "data:image/jpeg;base64," + "A".repeat(4_000_000);
    const t = Date.now();
    expect(isSafeImage(big)).toBe(true);
    expect(isSafeImage(big + "!")).toBe(false);
    expect(Date.now() - t).toBeLessThan(500);
  });
  it("sanitiseForSave drops hostile images and keeps good ones", () => {
    const inv = blankInvestigation();
    inv.evidence = [
      { id: "a", type: "photo", title: "", note: "", date: "", image: JPEG },
      { id: "b", type: "photo", title: "", note: "", date: "", image: "https://evil.example.com/x.gif" },
      { id: "c", type: "photo", title: "", note: "", date: "", image: "data:image/svg+xml;base64,AAAA" },
      { id: "d", type: "photo", title: "", note: "", date: "", image: null },
    ];
    const out = sanitiseForSave(inv);
    expect(out.evidence.map((e) => e.image)).toEqual([JPEG, null, null, null]);
    // untouched object is returned as is
    const clean = blankInvestigation();
    expect(sanitiseForSave(clean)).toBe(clean);
  });
});

describe("normaliseInvestigation", () => {
  it("leaves a valid investigation unchanged (the shipped sample)", () => {
    const sample = buildSample();
    expect(normaliseInvestigation(JSON.parse(JSON.stringify(sample)), sample.id)).toEqual(sample);
  });
  it("leaves a blank investigation unchanged", () => {
    const b = blankInvestigation();
    expect(normaliseInvestigation(JSON.parse(JSON.stringify(b)), b.id)).toEqual(b);
  });
  it("returns null for data that is not an investigation", () => {
    for (const v of [null, undefined, 0, 1, "x", true, [], [1, 2], {}, { id: "x" }, { problem: "no" }, { tree: 5 }]) {
      expect(normaliseInvestigation(v), JSON.stringify(v)).toBeNull();
      expect(readRow("row-1", v)).toEqual({ ok: false, id: "row-1" });
    }
  });
  it("fills a partial object with safe defaults so every screen can use it", () => {
    const inv = normaliseInvestigation({ problem: { title: "Pump" } }, "row-9") as Investigation;
    expect(inv.id).toBe("row-9");
    expect(inv.problem.title).toBe("Pump");
    expect(inv.problem.asset).toBe("");
    expect(inv.evidence).toEqual([]);
    expect(inv.actions).toEqual([]);
    expect(inv.tree.children).toEqual([]);
    expect(inv.verification.recurred).toBe("unreviewed");
    expect(() => {
      summarise(inv, "2026-11-16");
      calcLoss(inv.loss);
      runQualityCheck(inv);
    }).not.toThrow();
  });
  it("survives wrong types everywhere", () => {
    const nasty = {
      id: 5,
      createdAt: 7,
      updatedAt: null,
      isSample: "yes",
      problem: { title: 5, asset: { a: 1 }, eventDate: [] },
      loss: { eventsPerYear: "3", downtimeHours: NaN, ratePerHour: Infinity, otherCosts: "x", shareLost: "50" },
      evidence: [null, 4, "s", { id: 1, type: "weird", image: { x: 1 }, title: ["t"] }],
      tree: { children: "no", evidenceIds: [1, "e1", null], category: "bogus", status: 7 },
      actions: [5, null, { status: "bogus", cost: "9" }],
      verification: { recurred: "maybe", eventsPerYearAfter: "2" },
    };
    const inv = normaliseInvestigation(nasty, "r") as Investigation;
    expect(inv).not.toBeNull();
    expect(typeof inv.createdAt).toBe("string");
    expect(typeof inv.updatedAt).toBe("string");
    expect(inv.isSample).toBe(false);
    expect(inv.problem.title).toBe("");
    expect(inv.loss.eventsPerYear).toBeNull();
    expect(inv.loss.downtimeHours).toBeNull();
    expect(inv.loss.ratePerHour).toBeNull();
    expect(inv.loss.otherCosts).toBeUndefined();
    expect(inv.loss.shareLost).toBeUndefined();
    expect(inv.evidence).toHaveLength(1);
    expect(inv.evidence[0].type).toBe("other");
    expect(inv.evidence[0].image).toBeNull();
    expect(inv.tree.children).toEqual([]);
    expect(inv.tree.evidenceIds).toEqual(["e1"]);
    expect(inv.tree.category).toBe("physical");
    expect(inv.actions).toHaveLength(1);
    expect(inv.actions[0].status).toBe("open");
    expect(inv.actions[0].cost).toBeNull();
    expect(inv.verification.recurred).toBe("unreviewed");
    expect(() => {
      summarise(inv, "2026-11-16");
      calcLoss(inv.loss);
      runQualityCheck(inv);
    }).not.toThrow();
  });
  it("drops hostile evidence images on read", () => {
    const b = JSON.parse(JSON.stringify(blankInvestigation()));
    b.evidence = [
      { id: "e1", type: "photo", title: "", note: "", date: "", image: "javascript:alert(1)" },
      { id: "e2", type: "photo", title: "", note: "", date: "", image: PNG },
    ];
    const inv = normaliseInvestigation(b, "x") as Investigation;
    expect(inv.evidence.map((e) => e.image)).toEqual([null, PNG]);
  });
  it("caps absurdly deep or wide trees instead of overflowing the stack", () => {
    let deep: unknown = { id: "leaf", children: [] };
    for (let i = 0; i < 20000; i++) deep = { id: "n" + i, children: [deep] };
    const inv = normaliseInvestigation({ tree: deep }, "d") as Investigation;
    let depth = 0;
    for (let n = inv.tree; n.children.length; n = n.children[0]) depth++;
    expect(depth).toBeLessThanOrEqual(40);
    const wide = { tree: { children: Array.from({ length: 10000 }, (_, i) => ({ id: "c" + i })) } };
    const w = normaliseInvestigation(wide, "w") as Investigation;
    expect(w.tree.children.length).toBeLessThanOrEqual(2000);
  });
  it("ignores __proto__ and unknown keys", () => {
    const raw = JSON.parse('{"problem":{"title":"t","__proto__":{"polluted":1}},"__proto__":{"x":1},"extra":1}');
    const inv = normaliseInvestigation(raw, "p") as Investigation;
    expect(inv.problem.title).toBe("t");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect("extra" in inv).toBe(false);
  });
  it("the database row id always wins over the id inside the data", () => {
    const b = blankInvestigation();
    expect(normaliseInvestigation({ ...b, id: "inside" }, "row")?.id).toBe("row");
  });
});
