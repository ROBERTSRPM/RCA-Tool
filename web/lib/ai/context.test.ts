import { describe, expect, it } from "vitest";
import { buildSample } from "../sample";
import { AI_LIMITS, buildAiContext, parseAiContext, parseNotes } from "./context";

describe("buildAiContext", () => {
  const inv = buildSample();
  inv.evidence[0].image = "data:image/jpeg;base64,AAAA";
  const ctx = buildAiContext(inv);

  it("keeps the tree with parent links, top node first", () => {
    expect(ctx.nodes[0].id).toBe(inv.tree.id);
    expect(ctx.nodes[0].parentId).toBeNull();
    expect(ctx.nodes.length).toBeGreaterThan(3);
    expect(ctx.nodes.slice(1).every((n) => n.parentId !== null)).toBe(true);
  });

  it("never carries images or raw money fields", () => {
    const json = JSON.stringify(ctx);
    expect(json).not.toContain("data:image");
    expect(json).not.toContain("marginPerUnit");
    expect(ctx.evidence[0]).not.toHaveProperty("image");
  });

  it("describes the loss in one line when quantified", () => {
    expect(ctx.loss).toMatch(/events per year/);
  });

  it("fits inside the size cap for the sample", () => {
    expect(JSON.stringify(ctx).length).toBeLessThan(AI_LIMITS.totalChars);
    expect(parseAiContext(ctx).ok).toBe(true);
  });
});

describe("parseAiContext", () => {
  const good = () => buildAiContext(buildSample());

  it("rejects non-objects and missing trees", () => {
    expect(parseAiContext(null).ok).toBe(false);
    expect(parseAiContext("x").ok).toBe(false);
    expect(parseAiContext({ problem: {}, nodes: [] }).ok).toBe(false);
    expect(parseAiContext({ nodes: [{ id: "a" }] }).ok).toBe(false);
  });

  it("clips long strings and caps the number of nodes", () => {
    const c = good();
    c.problem.whatHappened = "x".repeat(50_000);
    const many = Array.from({ length: 500 }, (_, i) => ({ ...c.nodes[1], id: `n${i}`, parentId: c.nodes[0].id, text: "y".repeat(10) }));
    const r = parseAiContext({ ...c, nodes: [c.nodes[0], ...many] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.problem.whatHappened.length).toBe(AI_LIMITS.long);
      expect(r.value.nodes.length).toBe(AI_LIMITS.nodes);
    }
  });

  it("rejects a context that is still too big after clipping", () => {
    const c = good();
    c.nodes = Array.from({ length: 120 }, (_, i) => ({ ...c.nodes[0], id: `n${i}`, parentId: i ? "n0" : null, text: "z".repeat(400) }));
    c.evidence = Array.from({ length: 40 }, (_, i) => ({ id: `e${i}`, type: "data" as const, title: "t".repeat(200), note: "n".repeat(400) }));
    const r = parseAiContext(c);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/too large/);
  });

  it("drops unknown enum values, dangling parents and dangling links", () => {
    const c = good();
    const r = parseAiContext({
      ...c,
      nodes: [
        { ...c.nodes[0], category: "weird" },
        { ...c.nodes[1], parentId: "ghost", status: "proven", evidenceIds: ["nope"] },
      ],
      actions: [{ id: "a1", causeId: "ghost", description: "d", kind: "bogus", category: "x", interval: "" }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.nodes[0].category).toBe("physical");
      expect(r.value.nodes[1].parentId).toBeNull();
      expect(r.value.nodes[1].status).toBe("hypothesis");
      expect(r.value.nodes[1].evidenceIds).toEqual([]);
      expect(r.value.actions[0]).toMatchObject({ causeId: "", kind: "", category: "" });
    }
  });
});

describe("parseNotes", () => {
  it("requires notes when asked", () => {
    expect(parseNotes("", true).ok).toBe(false);
    expect(parseNotes("short", true).ok).toBe(false);
    expect(parseNotes("", false)).toEqual({ ok: true, value: "" });
  });
  it("rejects non-text and over-long notes", () => {
    expect(parseNotes(42, true).ok).toBe(false);
    expect(parseNotes("a".repeat(AI_LIMITS.notes + 1), true).ok).toBe(false);
    expect(parseNotes("a".repeat(AI_LIMITS.notes), true).ok).toBe(true);
  });
});
