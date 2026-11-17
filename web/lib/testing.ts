/** Small builders shared by unit tests. Not imported by the app. */
import { blankInvestigation } from "./investigation";
import { addChild, newNode } from "./tree";
import type { ActionItem, CauseNode, Investigation, Problem } from "./types";

export function inv(
  id: string,
  problem: Partial<Problem> = {},
  extra: Partial<Investigation> = {},
): Investigation {
  const base = blankInvestigation();
  return {
    ...base,
    id,
    problem: { ...base.problem, ...problem },
    ...extra,
  };
}

export function withCause(i: Investigation, parentId: string | null, node: Partial<CauseNode>): Investigation {
  return { ...i, tree: addChild(i.tree, parentId ?? i.tree.id, newNode(node)) };
}

export function action(partial: Partial<ActionItem> & { id: string }): ActionItem {
  return {
    causeId: "",
    description: "Do it",
    owner: "Sam",
    dueDate: "2030-01-01",
    status: "open",
    cost: null,
    ...partial,
  };
}
