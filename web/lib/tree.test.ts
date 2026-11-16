import { describe, expect, it } from "vitest";
import {
  addChild,
  addSibling,
  canMove,
  countDescendants,
  countNodes,
  findNode,
  groupByCategory,
  moveNode,
  pathTo,
  removeNode,
  rootCauses,
  unlinkEvidence,
  updateNode,
} from "./tree";
import { newNode } from "./tree";

function fixture() {
  const a = newNode({ id: "a", text: "A", category: "physical" });
  const b = newNode({ id: "b", text: "B", category: "human" });
  const c = newNode({ id: "c", text: "C", category: "system", isRootCause: true, evidenceIds: ["e1"] });
  const root = newNode({ id: "root", text: "Top", children: [{ ...a, children: [c] }, b] });
  return root;
}

describe("tree operations", () => {
  it("finds nodes and paths", () => {
    const t = fixture();
    expect(findNode(t, "c")?.text).toBe("C");
    expect(pathTo(t, "c").map((n) => n.id)).toEqual(["root", "a", "c"]);
    expect(pathTo(t, "zzz")).toEqual([]);
    expect(countNodes(t)).toBe(4);
    expect(countDescendants(findNode(t, "a")!)).toBe(1);
  });
  it("adds a child and expands the parent", () => {
    const t = updateNode(fixture(), "a", { collapsed: true });
    const t2 = addChild(t, "a", newNode({ id: "n", text: "N" }));
    expect(findNode(t2, "a")!.children.map((n) => n.id)).toEqual(["c", "n"]);
    expect(findNode(t2, "a")!.collapsed).toBe(false);
  });
  it("adds a sibling right after the node, but not to the top", () => {
    const t = addSibling(fixture(), "a", newNode({ id: "s" }));
    expect(t.children.map((n) => n.id)).toEqual(["a", "s", "b"]);
    const same = addSibling(fixture(), "root", newNode({ id: "s" }));
    expect(same.children.length).toBe(2);
  });
  it("removes a subtree but never the top node", () => {
    const t = removeNode(fixture(), "a");
    expect(findNode(t, "c")).toBeNull();
    expect(countNodes(t)).toBe(2);
    expect(removeNode(fixture(), "root").id).toBe("root");
  });
  it("moves among siblings and respects the edges", () => {
    const t = moveNode(fixture(), "b", "up");
    expect(t.children.map((n) => n.id)).toEqual(["b", "a"]);
    expect(moveNode(t, "b", "up")).toBe(t);
    expect(canMove(fixture(), "a", "up")).toBe(false);
    expect(canMove(fixture(), "a", "down")).toBe(true);
    expect(canMove(fixture(), "root", "down")).toBe(false);
  });
  it("does not mutate its input", () => {
    const t = fixture();
    const snapshot = JSON.stringify(t);
    updateNode(t, "a", { text: "changed" });
    removeNode(t, "a");
    moveNode(t, "b", "up");
    expect(JSON.stringify(t)).toBe(snapshot);
  });
  it("lists root causes and groups by category", () => {
    const t = fixture();
    expect(rootCauses(t).map((n) => n.id)).toEqual(["c"]);
    const g = groupByCategory(t);
    expect(g.physical.map((x) => x.node.id)).toEqual(["a"]);
    expect(g.human.map((x) => x.node.id)).toEqual(["b"]);
    expect(g.system[0].path.map((n) => n.id)).toEqual(["root", "a"]);
  });
  it("unlinks deleted evidence", () => {
    const t = unlinkEvidence(fixture(), "e1");
    expect(findNode(t, "c")!.evidenceIds).toEqual([]);
  });
});
