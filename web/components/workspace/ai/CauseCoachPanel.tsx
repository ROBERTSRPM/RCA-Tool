"use client";

import { useState } from "react";
import { buildAiContext } from "@/lib/ai/context";
import type { CoachResult, CoachSuggestion } from "@/lib/ai/output";
import { CATEGORY_LABEL, addChild, findNode, newNode } from "@/lib/tree";
import type { Investigation } from "@/lib/types";
import type { Updater } from "../types";
import { AcceptDismiss, AiButton, AiCard, LEVEL_CHIP, RunStatus, useAiRun } from "./shared";

type Item = CoachSuggestion & { key: number };
const LEVELS = ["physical", "human", "system"] as const;

export function CauseCoachPanel({
  inv,
  update,
  selectedId,
}: {
  inv: Investigation;
  update: Updater;
  selectedId: string;
}) {
  const { state, run, running } = useAiRun<CoachResult>("coach");
  const [items, setItems] = useState<Item[]>([]);
  const [shown, setShown] = useState<"node" | "tree" | null>(null);
  const sel = findNode(inv.tree, selectedId);
  const isTop = selectedId === inv.tree.id;
  const selLabel = isTop ? "the failure event" : `"${(sel?.text || "selected cause").slice(0, 50)}"`;

  async function ask(scope: "node" | "tree") {
    setItems([]);
    setShown(null);
    await run({ context: buildAiContext(inv), scope, nodeId: selectedId });
    setShown(scope);
  }

  // Copy a finished result into the list (once per run).
  const [lastResult, setLastResult] = useState<CoachResult | null>(null);
  if (state.status === "done" && state.result !== lastResult) {
    setLastResult(state.result);
    setItems(state.result.suggestions.map((s, i) => ({ ...s, key: i })));
  }

  function accept(s: Item) {
    const parentId = findNode(inv.tree, s.parentId) ? s.parentId : inv.tree.id;
    const test = [s.confirmWith && `To confirm: ${s.confirmWith}`, s.ruleOutWith && `To rule out: ${s.ruleOutWith}`]
      .filter(Boolean)
      .join("\n");
    const node = newNode({
      text: s.text,
      category: s.level,
      status: "hypothesis",
      aiSuggested: true,
      ...(test ? { aiTest: test } : {}),
      ...(s.deterioration ? { deterioration: s.deterioration } : {}),
    });
    update((i) => ({ ...i, tree: addChild(i.tree, parentId, node) }));
    setItems((l) => l.filter((x) => x.key !== s.key));
  }
  const dismiss = (s: Item) => setItems((l) => l.filter((x) => x.key !== s.key));

  return (
    <AiCard
      title="Cause coach"
      intro="Suggests likely causes for this asset and failure, as hypotheses, with the evidence that would confirm or rule each one out."
    >
      <div className="flex flex-wrap gap-2">
        <AiButton running={running} onClick={() => ask("node")} testId="coach-node">
          Suggest causes for {selLabel}
        </AiButton>
        <AiButton running={running} secondary onClick={() => ask("tree")} testId="coach-tree">
          Review the whole tree
        </AiButton>
      </div>
      <RunStatus state={state} working="The coach is thinking." />
      {state.status === "done" && items.length === 0 && (
        <p className="mt-3 text-sm text-slate-600">All suggestions handled. Ask again for more.</p>
      )}
      {items.length > 0 && (
        <div className="mt-4 space-y-5" data-testid="coach-results">
          {shown === "tree" && <p className="text-sm text-slate-600">Each suggestion says where in the tree it would go.</p>}
          {LEVELS.map((lv) => {
            const group = items.filter((i) => i.level === lv);
            if (group.length === 0) return null;
            return (
              <div key={lv}>
                <h4 className="mb-2 text-sm font-semibold text-slate-900">{CATEGORY_LABEL[lv]} causes</h4>
                <ul className="space-y-3">
                  {group.map((s) => {
                    const parent = findNode(inv.tree, s.parentId);
                    return (
                      <li key={s.key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3" data-testid="coach-item">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className={`chip ${LEVEL_CHIP[lv]}`}>{CATEGORY_LABEL[lv]}</span>
                          <span className="chip bg-white text-slate-600 ring-1 ring-slate-200">Hypothesis</span>
                          {s.deterioration && (
                            <span className="chip bg-white text-slate-600 ring-1 ring-slate-200">
                              {s.deterioration === "natural" ? "Natural" : "Forced"} deterioration
                            </span>
                          )}
                        </p>
                        <p className="mt-2 text-base font-semibold leading-snug text-slate-900">{s.text}</p>
                        {shown === "tree" && parent && (
                          <p className="mt-1 text-xs text-slate-500">
                            Goes under: {parent.id === inv.tree.id ? "the failure event" : `"${parent.text.slice(0, 60)}"`}
                          </p>
                        )}
                        {s.why && <p className="mt-1 text-sm text-slate-700">{s.why}</p>}
                        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                          {s.confirmWith && (
                            <div className="rounded-lg bg-emerald-50 p-2">
                              <dt className="text-xs font-semibold uppercase text-emerald-800">Would confirm it</dt>
                              <dd className="text-slate-800">{s.confirmWith}</dd>
                            </div>
                          )}
                          {s.ruleOutWith && (
                            <div className="rounded-lg bg-slate-100 p-2">
                              <dt className="text-xs font-semibold uppercase text-slate-600">Would rule it out</dt>
                              <dd className="text-slate-800">{s.ruleOutWith}</dd>
                            </div>
                          )}
                        </dl>
                        <AcceptDismiss acceptLabel="Add to tree" onAccept={() => accept(s)} onDismiss={() => dismiss(s)} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </AiCard>
  );
}
