"use client";

import { evidenceTypeLabel } from "../steps/EvidenceStep";
import { CATEGORY_HELP, CATEGORY_LABEL, findNode, STATUS_HELP, STATUS_LABEL } from "@/lib/tree";
import { DETERIORATION_GUIDANCE, DETERIORATION_OPTIONS } from "@/lib/options";
import type { Category, NodeStatus, StepId } from "@/lib/types";
import { Icon } from "../../icons";
import { CAT_STYLE } from "./NodeCard";
import { useCause } from "./context";
import type { Updater } from "../types";
import { updateNode } from "@/lib/tree";

const CATS: Category[] = ["physical", "human", "system"];
const STATUSES: NodeStatus[] = ["hypothesis", "verified", "ruled_out"];

export function NodePanel({
  update,
  go,
}: {
  update: Updater;
  go: (s: StepId) => void;
}) {
  const cx = useCause();
  const node = findNode(cx.inv.tree, cx.selectedId);
  if (!node) return null;
  const isTop = node.id === cx.inv.tree.id;
  const patch = (p: Parameters<typeof updateNode>[2]) =>
    update((i) => ({ ...i, tree: updateNode(i.tree, node.id, p) }));

  if (isTop) {
    return (
      <div className="card p-4" data-testid="node-panel">
        <h3 className="text-base font-semibold text-slate-900">The failure event</h3>
        <p className="mt-1 text-sm text-slate-600">
          This is the top of the tree: what went wrong. Edit its wording in the box, then press{" "}
          <strong>Why?</strong> to add the first cause beneath it.
        </p>
      </div>
    );
  }

  return (
    <div className="card space-y-5 p-4 lg:grid lg:grid-cols-3 lg:gap-x-8 lg:gap-y-4 lg:space-y-0 lg:p-5" data-testid="node-panel">
      <div className="lg:col-span-3">
        <h3 className="text-base font-semibold text-slate-900">Selected cause</h3>
        <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
          {node.text || "(no text yet, type in the box)"}
        </p>
      </div>

      <div className="space-y-5">
      <fieldset>
        <legend className="label">Type of cause</legend>
        <div className="grid grid-cols-3 gap-1.5" role="radiogroup">
          {CATS.map((c) => (
            <button
              key={c}
              role="radio"
              aria-checked={node.category === c}
              onClick={() => patch({ category: c })}
              className={`min-h-11 rounded-lg border-2 px-1.5 text-xs font-semibold leading-tight sm:text-sm ${
                node.category === c
                  ? `border-slate-900 bg-slate-900 text-white`
                  : `border-slate-200 bg-white ${CAT_STYLE[c].text} hover:bg-slate-50`
              }`}
            >
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
        <p className="help">{CATEGORY_HELP[node.category]}</p>
      </fieldset>

      <fieldset>
        <legend className="label">How sure are you?</legend>
        <div className="grid grid-cols-3 gap-1.5" role="radiogroup">
          {STATUSES.map((s) => (
            <button
              key={s}
              role="radio"
              aria-checked={node.status === s}
              onClick={() => patch({ status: s })}
              className={`min-h-11 rounded-lg border-2 px-1.5 text-xs font-semibold leading-tight sm:text-sm ${
                node.status === s
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <p className="help">{STATUS_HELP[node.status]}</p>
      </fieldset>

      {node.aiSuggested && node.aiTest && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800" data-testid="ai-test-note">
          <p className="font-semibold text-slate-900">Suggested: how to test it</p>
          <p className="mt-1 whitespace-pre-wrap">{node.aiTest}</p>
          <p className="mt-1 text-xs text-slate-600">This is still a hypothesis until you have evidence and mark it so.</p>
        </div>
      )}

      <fieldset>
        <legend className="label">
          Type of wear <span className="font-normal text-slate-600">(optional)</span>
        </legend>
        <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Type of wear">
          {DETERIORATION_OPTIONS.map((d) => {
            const on = node.deterioration === d.value;
            return (
              <button
                key={d.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => patch({ deterioration: on ? "" : d.value })}
                className={`min-h-11 rounded-lg border-2 px-1.5 text-xs font-semibold leading-tight sm:text-sm ${
                  on
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {d.label} deterioration
              </button>
            );
          })}
        </div>
        <p className="help">
          {node.deterioration
            ? DETERIORATION_OPTIONS.find((d) => d.value === node.deterioration)?.help
            : "Is this wear normal for the service, or did we cause it? Tap again to clear."}
        </p>
        <p className="help">{DETERIORATION_GUIDANCE}</p>
      </fieldset>
      </div>

      <div>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border-2 border-slate-200 p-3 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50">
        <input
          type="checkbox"
          className="mt-0.5 h-5 w-5 flex-none accent-amber-600"
          checked={node.isRootCause}
          onChange={(e) => patch({ isRootCause: e.target.checked })}
        />
        <span>
          <span className="block text-sm font-semibold text-slate-900">This is a root cause</span>
          <span className="block text-sm text-slate-500">
            The deepest gap you will fix so it cannot happen again. Actions attach to root causes.
          </span>
        </span>
      </label>
      </div>

      <fieldset>
        <legend className="label">Evidence that supports it</legend>
        {cx.inv.evidence.length === 0 ? (
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            No evidence has been added yet.
            <button className="btn btn-secondary btn-sm mt-2 block" onClick={() => go("evidence")}>
              Go to Evidence
            </button>
          </div>
        ) : (
          <ul className="max-h-64 space-y-1.5 overflow-y-auto">
            {cx.inv.evidence.map((e, idx) => {
              const checked = node.evidenceIds.includes(e.id);
              return (
                <li key={e.id}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-2.5 text-sm has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-5 w-5 flex-none accent-slate-900"
                      checked={checked}
                      onChange={(ev) =>
                        patch({
                          evidenceIds: ev.target.checked
                            ? [...node.evidenceIds, e.id]
                            : node.evidenceIds.filter((x) => x !== e.id),
                        })
                      }
                    />
                    <span className="min-w-0">
                      <span className="block font-semibold text-slate-900">
                        E{idx + 1}. {e.title || "Untitled"}
                      </span>
                      <span className="text-xs text-slate-500">{evidenceTypeLabel(e.type)}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {node.status === "verified" && node.evidenceIds.length === 0 && cx.inv.evidence.length > 0 && (
          <p className="mt-2 flex items-start gap-1.5 text-sm text-amber-800">
            <Icon name="alert" size={16} className="mt-0.5 flex-none" />
            Verified causes should link at least one piece of evidence.
          </p>
        )}
      </fieldset>
    </div>
  );
}
