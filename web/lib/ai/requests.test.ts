import { describe, expect, it } from "vitest";
import { buildSample } from "../sample";
import { buildAiContext } from "./context";
import { parseRequest } from "./requests";

const inv = buildSample();
const context = buildAiContext(inv);
const nodeId = context.nodes[1].id;
const rootId = context.nodes.find((n) => n.isRootCause)!.id;

describe("parseRequest", () => {
  it("coach: node scope needs a real node, tree scope does not", () => {
    expect(parseRequest("coach", { context, scope: "node", nodeId }).ok).toBe(true);
    expect(parseRequest("coach", { context, scope: "node", nodeId: "ghost" }).ok).toBe(false);
    expect(parseRequest("coach", { context, scope: "node" }).ok).toBe(false);
    expect(parseRequest("coach", { context, scope: "tree" }).ok).toBe(true);
    expect(parseRequest("coach", { context, scope: "other" }).ok).toBe(false);
  });

  it("challenge: defaults to all, needs something to challenge", () => {
    const r = parseRequest("challenge", { context });
    expect(r.ok && r.value.feature === "challenge" && r.value.focus).toBe("all");
    const empty = { ...context, nodes: [{ ...context.nodes[0], text: "" }], actions: [] };
    expect(parseRequest("challenge", { context: empty }).ok).toBe(false);
  });

  it("capa: needs an existing root cause with text", () => {
    expect(parseRequest("capa", { context, rootCauseId: rootId }).ok).toBe(true);
    expect(parseRequest("capa", { context, rootCauseId: "ghost" }).ok).toBe(false);
    const blank = { ...context, nodes: context.nodes.map((n) => (n.id === rootId ? { ...n, text: "" } : n)) };
    expect(parseRequest("capa", { context: blank, rootCauseId: rootId }).ok).toBe(false);
  });

  it("draft: kind is required; problem needs notes; report does not", () => {
    expect(parseRequest("draft", { context, kind: "nope" }).ok).toBe(false);
    expect(parseRequest("draft", { context, kind: "problem", notes: "" }).ok).toBe(false);
    expect(parseRequest("draft", { context, kind: "problem", notes: "bearing seized at 3am on P101" }).ok).toBe(true);
    expect(parseRequest("draft", { context, kind: "report" }).ok).toBe(true);
    expect(parseRequest("draft", { context, kind: "summary", notes: "x".repeat(5000) }).ok).toBe(false);
  });

  it("rejects bodies that are not objects or have a bad context", () => {
    expect(parseRequest("coach", null).ok).toBe(false);
    expect(parseRequest("coach", { scope: "tree" }).ok).toBe(false);
    expect(parseRequest("coach", { context: { problem: {}, nodes: "x" }, scope: "tree" }).ok).toBe(false);
  });
});
