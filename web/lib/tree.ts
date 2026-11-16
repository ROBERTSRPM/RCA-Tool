import { uid } from "./id";
import type { CauseNode, Category } from "./types";

export function newNode(partial: Partial<CauseNode> = {}): CauseNode {
  return {
    id: uid(),
    text: "",
    category: "physical",
    status: "hypothesis",
    evidenceIds: [],
    isRootCause: false,
    collapsed: false,
    children: [],
    ...partial,
  };
}

export function findNode(root: CauseNode, id: string): CauseNode | null {
  if (root.id === id) return root;
  for (const c of root.children) {
    const hit = findNode(c, id);
    if (hit) return hit;
  }
  return null;
}

/** Nodes from the top node down to (and including) the target; [] if absent. */
export function pathTo(root: CauseNode, id: string): CauseNode[] {
  if (root.id === id) return [root];
  for (const c of root.children) {
    const p = pathTo(c, id);
    if (p.length) return [root, ...p];
  }
  return [];
}

export function findParent(root: CauseNode, id: string): CauseNode | null {
  const p = pathTo(root, id);
  return p.length >= 2 ? p[p.length - 2] : null;
}

export function flatten(
  root: CauseNode,
): { node: CauseNode; depth: number; parent: CauseNode | null }[] {
  const out: { node: CauseNode; depth: number; parent: CauseNode | null }[] = [];
  const walk = (node: CauseNode, depth: number, parent: CauseNode | null) => {
    out.push({ node, depth, parent });
    node.children.forEach((c) => walk(c, depth + 1, node));
  };
  walk(root, 0, null);
  return out;
}

export function countNodes(root: CauseNode): number {
  return flatten(root).length;
}

export function countDescendants(node: CauseNode): number {
  return countNodes(node) - 1;
}

export function mapNode(
  root: CauseNode,
  id: string,
  fn: (n: CauseNode) => CauseNode,
): CauseNode {
  if (root.id === id) return fn(root);
  let changed = false;
  const children = root.children.map((c) => {
    const next = mapNode(c, id, fn);
    if (next !== c) changed = true;
    return next;
  });
  return changed ? { ...root, children } : root;
}

export function updateNode(
  root: CauseNode,
  id: string,
  patch: Partial<Omit<CauseNode, "id" | "children">>,
): CauseNode {
  return mapNode(root, id, (n) => ({ ...n, ...patch }));
}

export function addChild(
  root: CauseNode,
  parentId: string,
  node: CauseNode,
): CauseNode {
  return mapNode(root, parentId, (p) => ({
    ...p,
    collapsed: false,
    children: [...p.children, node],
  }));
}

/** Inserts directly after the given node. The top node has no siblings. */
export function addSibling(
  root: CauseNode,
  id: string,
  node: CauseNode,
): CauseNode {
  const parent = findParent(root, id);
  if (!parent) return root;
  return mapNode(root, parent.id, (p) => {
    const idx = p.children.findIndex((c) => c.id === id);
    const children = [...p.children];
    children.splice(idx + 1, 0, node);
    return { ...p, children };
  });
}

/** Removes a node and its subtree. The top node cannot be removed. */
export function removeNode(root: CauseNode, id: string): CauseNode {
  if (root.id === id) return root;
  const parent = findParent(root, id);
  if (!parent) return root;
  return mapNode(root, parent.id, (p) => ({
    ...p,
    children: p.children.filter((c) => c.id !== id),
  }));
}

export function moveNode(
  root: CauseNode,
  id: string,
  dir: "up" | "down",
): CauseNode {
  const parent = findParent(root, id);
  if (!parent) return root;
  const idx = parent.children.findIndex((c) => c.id === id);
  const to = dir === "up" ? idx - 1 : idx + 1;
  if (to < 0 || to >= parent.children.length) return root;
  return mapNode(root, parent.id, (p) => {
    const children = [...p.children];
    [children[idx], children[to]] = [children[to], children[idx]];
    return { ...p, children };
  });
}

export function canMove(
  root: CauseNode,
  id: string,
  dir: "up" | "down",
): boolean {
  const parent = findParent(root, id);
  if (!parent) return false;
  const idx = parent.children.findIndex((c) => c.id === id);
  return dir === "up" ? idx > 0 : idx < parent.children.length - 1;
}

export function setAllCollapsed(root: CauseNode, collapsed: boolean): CauseNode {
  return {
    ...root,
    collapsed: root.children.length ? collapsed : false,
    children: root.children.map((c) => setAllCollapsed(c, collapsed)),
  };
}

/** Removes references to an evidence item everywhere in the tree. */
export function unlinkEvidence(root: CauseNode, evidenceId: string): CauseNode {
  return {
    ...root,
    evidenceIds: root.evidenceIds.filter((e) => e !== evidenceId),
    children: root.children.map((c) => unlinkEvidence(c, evidenceId)),
  };
}

export function rootCauses(root: CauseNode): CauseNode[] {
  return flatten(root)
    .filter((f) => f.parent !== null && f.node.isRootCause)
    .map((f) => f.node);
}

export function groupByCategory(
  root: CauseNode,
): Record<Category, { node: CauseNode; path: CauseNode[] }[]> {
  const groups: Record<Category, { node: CauseNode; path: CauseNode[] }[]> = {
    physical: [],
    human: [],
    system: [],
  };
  const walk = (node: CauseNode, path: CauseNode[]) => {
    for (const c of node.children) {
      groups[c.category].push({ node: c, path });
      walk(c, [...path, c]);
    }
  };
  walk(root, [root]);
  return groups;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  physical: "Physical",
  human: "Human",
  system: "System / Latent",
};

export const CATEGORY_HELP: Record<Category, string> = {
  physical: "Something broke, wore out or was in the wrong state.",
  human: "A person did or missed something.",
  system: "A gap in procedure, training, planning or management that let it happen.",
};

export const STATUS_LABEL = {
  hypothesis: "Hypothesis",
  verified: "Verified",
  ruled_out: "Ruled out",
} as const;

export const STATUS_HELP = {
  hypothesis: "A possible cause you have not proven yet.",
  verified: "Proven with evidence.",
  ruled_out: "Checked and shown not to be a cause.",
} as const;
