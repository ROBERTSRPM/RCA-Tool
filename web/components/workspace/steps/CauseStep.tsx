"use client";

import { DemoAiNote } from "../ai/shared";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  addChild,
  addSibling,
  countDescendants,
  findNode,
  findParent,
  flatten,
  moveNode,
  newNode,
  removeNode,
  setAllCollapsed,
  updateNode,
} from "@/lib/tree";
import type { CauseNode } from "@/lib/types";
import { SimilarFailures } from "../SimilarFailures";
import { CauseCoachPanel } from "../ai/CauseCoachPanel";
import { ChallengePanel } from "../ai/ChallengePanel";
import { Icon } from "../../icons";
import { SectionCard, useConfirm } from "../../ui";
import { CauseContext, type CauseCtx } from "../cause/context";
import { FiveWhysView } from "../cause/FiveWhysView";
import { FishboneView } from "../cause/FishboneView";
import { NodePanel } from "../cause/NodePanel";
import { TreeView } from "../cause/TreeView";
import type { StepProps } from "../types";

type View = "tree" | "whys" | "fishbone";
const VIEWS: { id: View; label: string }[] = [
  { id: "tree", label: "Tree" },
  { id: "whys", label: "5 Whys" },
  { id: "fishbone", label: "Fishbone" },
];

export function CauseStep({
  inv,
  update,
  go,
  selectedId,
  setSelectedId,
}: StepProps & {
  selectedId: string;
  setSelectedId: (id: string | undefined) => void;
}) {
  const confirm = useConfirm();
  const [view, setView] = useState<View>("tree");
  const [focusId, setFocusId] = useState<string | null>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  // If the selected node no longer exists, fall back to the top node.
  const effectiveId = findNode(inv.tree, selectedId) ? selectedId : inv.tree.id;

  const select = useCallback((id: string) => setSelectedId(id), [setSelectedId]);
  const clearFocus = useCallback(() => setFocusId(null), []);

  const ctx: CauseCtx = useMemo(
    () => ({
      inv,
      selectedId: effectiveId,
      select,
      focusId,
      clearFocus,
      addChild: (id) => {
        const parent = findNode(inv.tree, id);
        if (!parent) return;
        const isTop = id === inv.tree.id;
        const n = newNode({ category: isTop ? "physical" : parent.category });
        update((i) => ({ ...i, tree: addChild(i.tree, id, n) }));
        setSelectedId(n.id);
        setFocusId(n.id);
      },
      addSibling: (id) => {
        const src = findNode(inv.tree, id);
        if (!src || id === inv.tree.id) return;
        const n = newNode({ category: src.category });
        update((i) => ({ ...i, tree: addSibling(i.tree, id, n) }));
        setSelectedId(n.id);
        setFocusId(n.id);
      },
      remove: async (node: CauseNode) => {
        const kids = countDescendants(node);
        const removedIds = flatten(node).map((f) => f.node.id);
        const linkedActions = inv.actions.filter((a) => removedIds.includes(a.causeId)).length;
        if (kids > 0 || linkedActions > 0) {
          const ok = await confirm({
            title: "Delete this cause?",
            message:
              (kids > 0
                ? `It has ${kids} ${kids === 1 ? "cause" : "causes"} beneath it, which will be deleted too. `
                : "") +
              (linkedActions > 0
                ? `${linkedActions} ${linkedActions === 1 ? "action is" : "actions are"} linked to it and will become unlinked. `
                : "") +
              "This cannot be undone.",
            confirmLabel: "Delete",
            danger: true,
          });
          if (!ok) return;
        }
        const parent = findParent(inv.tree, node.id);
        update((i) => ({
          ...i,
          tree: removeNode(i.tree, node.id),
          actions: i.actions.map((a) =>
            removedIds.includes(a.causeId) ? { ...a, causeId: "" } : a,
          ),
        }));
        setSelectedId(parent?.id);
      },
      move: (id, dir) => update((i) => ({ ...i, tree: moveNode(i.tree, id, dir) })),
      toggle: (id) =>
        update((i) => ({
          ...i,
          tree: updateNode(i.tree, id, {
            collapsed: !findNode(i.tree, id)?.collapsed,
          }),
        })),
      setText: (id, text) => update((i) => ({ ...i, tree: updateNode(i.tree, id, { text }) })),
      scrollToDetails: () =>
        detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    }),
    [inv, effectiveId, select, focusId, clearFocus, update, setSelectedId, confirm],
  );

  const hasKids = inv.tree.children.length > 0;

  return (
    <CauseContext.Provider value={ctx}>
      <div className="space-y-5">
      <SectionCard
        title="4. Find the cause: keep asking Why?"
        help="Start at the failure and ask why it happened. Add each answer as a cause. Keep going until you reach a System / Latent cause: a gap in procedure, training or planning. Flag the ones you will fix as root causes."
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Cause views"
            className="inline-flex rounded-lg bg-slate-200 p-1"
          >
            {VIEWS.map((v) => (
              <button
                key={v.id}
                role="tab"
                aria-selected={view === v.id}
                onClick={() => setView(v.id)}
                className={`min-h-10 rounded-md px-4 text-sm font-semibold transition-colors ${
                  view === v.id
                    ? "bg-white text-slate-900 shadow"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          {view === "tree" && hasKids && (
            <div className="flex gap-2">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => update((i) => ({ ...i, tree: setAllCollapsed(i.tree, false) }))}
              >
                <Icon name="chevronsDown" size={16} /> Expand all
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  update((i) => ({
                    ...i,
                    tree: {
                      ...setAllCollapsed(i.tree, true),
                      collapsed: false,
                    },
                  }))
                }
              >
                <Icon name="chevronsUp" size={16} /> Collapse all
              </button>
            </div>
          )}
        </div>

        <div className="min-w-0" role="tabpanel">
          {view === "tree" && <TreeView />}
          {view === "whys" && <FiveWhysView />}
          {view === "fishbone" && <FishboneView />}
        </div>
        <div ref={detailsRef} className="mt-5 scroll-mt-20">
          <NodePanel update={update} go={go} />
        </div>
      </SectionCard>
      <CauseCoachPanel inv={inv} update={update} selectedId={effectiveId} />
      <ChallengePanel inv={inv} focus="cause" go={go} selectNode={select} />
      <DemoAiNote />
      <SimilarFailures
        inv={inv}
        update={update}
        parentId={effectiveId}
        onAdded={(id) => setSelectedId(id)}
      />
      </div>
    </CauseContext.Provider>
  );
}
