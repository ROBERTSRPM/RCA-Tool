import { uid } from "./id";
import { newNode } from "./tree";
import type {
  CauseNode,
  Investigation,
  InvestigationPatch,
} from "./types";

export function blankInvestigation(seed: InvestigationPatch = {}): Investigation {
  const now = new Date().toISOString();
  return {
    id: uid(),
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    isSample: false,
    problem: {
      title: "",
      asset: "",
      site: "",
      eventDate: "",
      whatHappened: "",
      where: "",
      when: "",
      impact: "",
      assetTag: "",
      assetType: "",
      makeModel: "",
      duty: "",
      criticality: "",
      failureMode: "",
    },
    loss: {
      eventsPerYear: null,
      downtimeHours: null,
      ratePerHour: null,
      unitName: "units",
      marginPerUnit: null,
      repairCost: null,
      currency: "$",
    },
    evidence: [],
    tree: newNode({ category: "physical", status: "verified" }),
    actions: [],
    verification: {
      reviewDate: "",
      recurred: "unreviewed",
      eventsPerYearAfter: null,
      notes: "",
    },
    rollouts: [],
    ...seed,
  };
}

/** Text shown for the top node; falls back to the problem title. */
export function failureText(inv: Investigation): string {
  return inv.tree.text.trim() || inv.problem.title.trim();
}

/** Deep copy with new ids everywhere, keeping all internal links intact. */
export function cloneInvestigation(src: Investigation): Investigation {
  const evMap = new Map<string, string>();
  const nodeMap = new Map<string, string>();
  src.evidence.forEach((e) => evMap.set(e.id, uid()));
  const cloneNode = (n: CauseNode): CauseNode => {
    const id = uid();
    nodeMap.set(n.id, id);
    return {
      ...n,
      id,
      evidenceIds: n.evidenceIds.map((e) => evMap.get(e) ?? e),
      children: n.children.map(cloneNode),
    };
  };
  const tree = cloneNode(src.tree);
  const now = new Date().toISOString();
  return {
    ...src,
    id: uid(),
    createdAt: now,
    updatedAt: now,
    isSample: false,
    problem: {
      ...src.problem,
      title: src.problem.title ? `Copy of ${src.problem.title}` : "",
    },
    evidence: src.evidence.map((e) => ({ ...e, id: evMap.get(e.id)! })),
    tree,
    actions: src.actions.map((a) => ({
      ...a,
      id: uid(),
      causeId: nodeMap.get(a.causeId) ?? "",
    })),
    loss: { ...src.loss },
    verification: { ...src.verification },
    // A copy is a fresh investigation: rollout checks belong to the original event.
    rollouts: [],
  };
}
