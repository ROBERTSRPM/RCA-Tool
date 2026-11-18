"use client";

import { useState } from "react";
import { blankTask, formatInterval, isTaskCategory } from "@/lib/capa";
import { buildAiContext } from "@/lib/ai/context";
import type { CapaAction, CapaResult } from "@/lib/ai/output";
import { uid } from "@/lib/id";
import { categoryLabel } from "@/lib/options";
import { updateNode } from "@/lib/tree";
import type { ActionItem, CauseNode, Investigation } from "@/lib/types";
import type { Updater } from "../types";
import { AcceptDismiss, AiButton, AiCard, RunStatus, useAiRun } from "./shared";

type Item = CapaAction & { key: number };

/** AI recommendations for one root cause, shown inside that root cause's group on the Actions step. */
export function CapaSuggest({ inv, update, root }: { inv: Investigation; update: Updater; root: CauseNode }) {
  const { state, run, running } = useAiRun<CapaResult>("capa");
  const [items, setItems] = useState<Item[]>([]);
  const [tagOpen, setTagOpen] = useState(true);
  const [last, setLast] = useState<CapaResult | null>(null);
  if (state.status === "done" && state.result !== last) {
    setLast(state.result);
    setItems(state.result.actions.map((a, i) => ({ ...a, key: i })));
    setTagOpen(true);
  }

  function accept(a: Item) {
    const task = isTaskCategory(a.category)
      ? { ...blankTask(), description: a.description, intervalValue: a.intervalValue, intervalUnit: a.intervalUnit, craft: a.craft }
      : undefined;
    const action: ActionItem = {
      id: uid(),
      // Corrective actions answer to the failure event; preventive ones to the root cause.
      causeId: a.kind === "corrective" ? inv.tree.id : root.id,
      description: a.description,
      owner: "",
      dueDate: "",
      status: "open",
      cost: null,
      kind: a.kind,
      category: a.category,
      aiSuggested: true,
      ...(task ? { task } : {}),
    };
    update((i) => ({ ...i, actions: [...i.actions, action] }));
    setItems((l) => l.filter((x) => x.key !== a.key));
  }

  const result = state.status === "done" ? state.result : null;
  const verdict = result && result.deterioration !== "unclear" ? result.deterioration : null;

  return (
    <div className="mt-2" data-testid="capa-suggest">
      <AiCard
        collapseOnMobile
        title="Suggested actions"
        intro="Suggests corrective and preventive actions for this root cause, and says whether the wear is natural or forced."
        className="p-3 sm:p-4"
      >
        <AiButton
          running={running}
          secondary
          testId="capa-run"
          onClick={() => {
            setItems([]);
            void run({ context: buildAiContext(inv), rootCauseId: root.id });
          }}
        >
          Suggest actions for this root cause
        </AiButton>
        <RunStatus state={state} working="Working out the actions." />
        {result && (
          <div className="mt-4 space-y-3" data-testid="capa-results">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3" data-testid="capa-deterioration">
              <p className="text-sm font-semibold text-slate-900">
                {result.deterioration === "natural"
                  ? "Looks like natural deterioration (normal wear)"
                  : result.deterioration === "forced"
                    ? "Looks like forced deterioration (wear we cause)"
                    : "Natural or forced: unclear"}
              </p>
              {result.deteriorationReason && <p className="mt-1 text-sm text-slate-700">{result.deteriorationReason}</p>}
              {verdict && tagOpen && root.deterioration !== verdict && (
                <AcceptDismiss
                  acceptLabel={`Tag this cause as ${verdict}`}
                  onAccept={() => {
                    update((i) => ({ ...i, tree: updateNode(i.tree, root.id, { deterioration: verdict }) }));
                    setTagOpen(false);
                  }}
                  onDismiss={() => setTagOpen(false)}
                />
              )}
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-slate-600">All suggestions handled.</p>
            ) : (
              <ul className="space-y-3">
                {items.map((a) => (
                  <li key={a.key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3" data-testid="capa-item">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className={`chip ${a.kind === "corrective" ? "bg-sky-50 text-sky-800 ring-1 ring-sky-200" : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"}`}>
                        {a.kind === "corrective" ? "Corrective" : "Preventive"}
                      </span>
                      <span className="chip bg-white text-slate-700 ring-1 ring-slate-200">{categoryLabel(a.category)}</span>
                      {isTaskCategory(a.category) && a.intervalValue && (
                        <span className="chip bg-white text-slate-700 ring-1 ring-slate-200">
                          {formatInterval(a.intervalValue, a.intervalUnit)}
                        </span>
                      )}
                      {a.craft && <span className="chip bg-white text-slate-700 ring-1 ring-slate-200">{a.craft}</span>}
                    </p>
                    <p className="mt-2 text-base font-semibold leading-snug text-slate-900">{a.description}</p>
                    {a.rationale && <p className="mt-1 text-sm text-slate-700">{a.rationale}</p>}
                    <AcceptDismiss
                      acceptLabel="Add to actions"
                      onAccept={() => accept(a)}
                      onDismiss={() => setItems((l) => l.filter((x) => x.key !== a.key))}
                    />
                  </li>
                ))}
              </ul>
            )}
            {result.horizontalExpansion && (
              <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-800">
                <strong>Roll it out:</strong> {result.horizontalExpansion} Track this under &ldquo;Roll this fix out&rdquo; on the Verify step.
              </p>
            )}
            <p className="text-xs text-slate-500">
              Intervals are starting points. Check them against this asset&rsquo;s failure history and the manufacturer&rsquo;s guidance.
            </p>
          </div>
        )}
      </AiCard>
    </div>
  );
}
