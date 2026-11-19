"use client";

import { useState } from "react";
import { CAUSE_AREAS } from "@/lib/options";
import { flatten, pathTo } from "@/lib/tree";
import { CATEGORY_HELP, CATEGORY_LABEL, groupByCategory } from "@/lib/tree";
import { failureText } from "@/lib/investigation";
import type { Category } from "@/lib/types";
import { CAT_STYLE, NodeCard } from "./NodeCard";
import { useCause } from "./context";

const ORDER: Category[] = ["physical", "human", "system"];

type Mode = "level" | "area";

export function FishboneView() {
  const cx = useCause();
  const groups = groupByCategory(cx.inv.tree);
  const total = ORDER.reduce((n, c) => n + groups[c].length, 0);
  const [picked, setPicked] = useState<Mode | null>(null);
  const mode: Mode = picked ?? (cx.inv.problem.failureType === "process" ? "area" : "level");
  const areaGroups = [
    ...CAUSE_AREAS.map((a) => ({ key: a.value as string, label: a.label })),
    { key: "", label: "Not tagged yet" },
  ].map((g) => ({
    ...g,
    items: flatten(cx.inv.tree)
      .filter((f) => f.node.id !== cx.inv.tree.id && (f.node.area ?? "") === g.key)
      .map((f) => f.node),
  }));
  const shownAreas = areaGroups.filter((g) => g.key !== "" || g.items.length > 0);
  const nodeContext = (id: string) => {
    const path = pathTo(cx.inv.tree, id);
    return path.length > 2
      ? `Because of: ${path.slice(1, -1).map((p) => p.text || "(no text)").join(" → ").slice(0, 90)}`
      : "Direct cause of the failure";
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-slate-600">
          {mode === "level"
            ? "The same causes, sorted by level. A healthy investigation has causes in all three columns: what broke, what people did, and the system gaps that allowed it."
            : "The same causes, sorted by Cause area (set in each cause's panel): equipment, materials, method, measurement, people and environment."}
        </p>
        <div role="group" aria-label="Group by" className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-slate-700">Group by:</span>
          {(
            [
              ["level", "Level"],
              ["area", "Cause area"],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              className={`btn btn-sm ${mode === m ? "btn-dark" : "btn-secondary"}`}
              onClick={() => setPicked(m)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4 flex items-stretch">
        <div className="flex flex-1 items-center">
          <div className="h-1.5 flex-1 rounded-l bg-slate-900" />
        </div>
        <div className="relative max-w-md rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-amber-300">
            Failure event
          </span>
          {failureText(cx.inv) || "Describe the failure event in the Tree view"}
        </div>
      </div>
      {total === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
          No causes yet. Switch to the Tree view and press <strong>Why?</strong> on the failure
          event.
        </p>
      ) : (
        mode === "area" ? (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3" data-testid="fishbone-by-area">
            {shownAreas.map((g) => (
              <section
                key={g.key || "none"}
                aria-label={g.label}
                className="min-w-0 rounded-xl border-t-4 border-slate-700 bg-white p-3 shadow-sm ring-1 ring-slate-200"
              >
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                  {g.label} <span className="font-semibold text-slate-500">({g.items.length})</span>
                </h3>
                {g.items.length === 0 ? (
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">None yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2.5">
                    {g.items.map((node) => (
                      <li key={node.id}>
                        <NodeCard node={node} wide context={nodeContext(node.id)} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3">
          {ORDER.map((cat) => (
            <section
              key={cat}
              aria-label={CATEGORY_LABEL[cat]}
              className={`min-w-0 rounded-xl border-t-4 bg-white p-3 shadow-sm ring-1 ring-slate-200 ${CAT_STYLE[cat].head}`}
            >
              <h3 className={`text-sm font-semibold uppercase tracking-wide ${CAT_STYLE[cat].text}`}>
                {CATEGORY_LABEL[cat]}{" "}
                <span className="font-semibold text-slate-500">({groups[cat].length})</span>
              </h3>
              <p className="mb-3 text-xs text-slate-500">{CATEGORY_HELP[cat]}</p>
              {groups[cat].length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                  {cat === "system"
                    ? "None yet. Keep asking why under your physical and human causes."
                    : "None yet."}
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {groups[cat].map(({ node, path }) => (
                    <li key={node.id}>
                      <NodeCard
                        node={node}
                        wide
                        context={
                          path.length > 1
                            ? `Because of: ${path
                                .slice(1)
                                .map((p) => p.text || "(no text)")
                                .join(" → ")
                                .slice(0, 90)}`
                            : "Direct cause of the failure"
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        )
      )}
    </div>
  );
}
