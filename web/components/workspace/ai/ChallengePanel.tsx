"use client";

import { useState } from "react";
import { buildAiContext } from "@/lib/ai/context";
import type { ChallengeIssue, ChallengeResult, IssueType } from "@/lib/ai/output";
import { findNode } from "@/lib/tree";
import type { Investigation, StepId } from "@/lib/types";
import { AiButton, AiCard, RunStatus, useAiRun } from "./shared";

const TYPE_LABEL: Record<IssueType, string> = {
  stopped_at_physical: "Stopped at a physical cause",
  no_evidence: "No evidence",
  blame: "Blame, not a system cause",
  weak_logic: "Weak logic",
  unverified_root: "Root cause not verified",
  missing_level: "Missing level",
  deterioration_undecided: "Natural or forced not decided",
  single_branch: "Only one chain considered",
  action_weak: "Weak action",
  no_preventive: "No preventive action",
  no_task_interval: "No interval",
  other: "Worth a look",
};

const SEV: Record<ChallengeIssue["severity"], { label: string; chip: string }> = {
  high: { label: "Fix first", chip: "bg-red-50 text-red-700 ring-1 ring-red-200" },
  medium: { label: "Should fix", chip: "bg-amber-50 text-amber-800 ring-1 ring-amber-200" },
  low: { label: "Worth a look", chip: "bg-slate-100 text-slate-700 ring-1 ring-slate-200" },
};

type Item = ChallengeIssue & { key: number };

export function ChallengePanel({
  inv,
  focus,
  go,
  selectNode,
}: {
  inv: Investigation;
  /** "cause" on the Cause tree step, "actions" on the Actions step. */
  focus: "cause" | "actions";
  go: (step: StepId, nodeId?: string) => void;
  /** On the Cause tree step: select the node without leaving. */
  selectNode?: (id: string) => void;
}) {
  const { state, run, running } = useAiRun<ChallengeResult>("challenge");
  const [items, setItems] = useState<Item[]>([]);
  const [last, setLast] = useState<ChallengeResult | null>(null);
  if (state.status === "done" && state.result !== last) {
    setLast(state.result);
    setItems(state.result.issues.map((x, i) => ({ ...x, key: i })));
  }

  const dismiss = (x: Item) => setItems((l) => l.filter((i) => i.key !== x.key));

  return (
    <AiCard
      title="Challenge my analysis"
      intro={
        focus === "cause"
          ? "Questions the logic of your cause tree the way an experienced reviewer would."
          : "Questions your actions and whether each root cause has the right fix."
      }
    >
      <AiButton
        running={running}
        testId="challenge-run"
        onClick={() => {
          setItems([]);
          void run({ context: buildAiContext(inv), focus });
        }}
      >
        Challenge my analysis
      </AiButton>
      <RunStatus state={state} working="Reviewing your analysis." />
      {state.status === "done" && (
        <div className="mt-4" data-testid="challenge-results">
          {state.result.summary && <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-800">{state.result.summary}</p>}
          {items.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No open challenges. That is not proof the analysis is right: check the evidence.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {items.map((x) => {
                const node = x.nodeId ? findNode(inv.tree, x.nodeId) : null;
                const action = x.actionId ? inv.actions.find((a) => a.id === x.actionId) : null;
                const about = node
                  ? node.id === inv.tree.id
                    ? "The failure event"
                    : node.text || "(cause with no text)"
                  : action
                    ? `Action: ${action.description || "(no description)"}`
                    : "";
                return (
                  <li key={x.key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3" data-testid="challenge-item">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className={`chip ${SEV[x.severity].chip}`}>{SEV[x.severity].label}</span>
                      <span className="chip bg-white text-slate-700 ring-1 ring-slate-200">{TYPE_LABEL[x.type]}</span>
                    </p>
                    {about && (
                      <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-600" title={about}>
                        About: {about}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-semibold text-slate-900">{x.message}</p>
                    {x.question && <p className="mt-1 text-sm text-slate-700">Ask: {x.question}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {node && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => (selectNode && focus === "cause" ? selectNode(node.id) : go("cause", node.id))}
                        >
                          Show this cause
                        </button>
                      )}
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => dismiss(x)} data-testid="ai-dismiss">
                        Dismiss
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </AiCard>
  );
}
