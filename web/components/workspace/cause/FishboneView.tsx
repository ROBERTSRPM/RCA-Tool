"use client";

import { CATEGORY_HELP, CATEGORY_LABEL, groupByCategory } from "@/lib/tree";
import { failureText } from "@/lib/investigation";
import type { Category } from "@/lib/types";
import { CAT_STYLE, NodeCard } from "./NodeCard";
import { useCause } from "./context";

const ORDER: Category[] = ["physical", "human", "system"];

export function FishboneView() {
  const cx = useCause();
  const groups = groupByCategory(cx.inv.tree);
  const total = ORDER.reduce((n, c) => n + groups[c].length, 0);

  return (
    <div>
      <p className="mb-3 text-sm text-slate-600">
        The same causes, sorted by type. A healthy investigation has causes in all three columns:
        what broke, what people did, and the system gaps that allowed it.
      </p>
      <div className="mb-4 flex items-stretch">
        <div className="flex flex-1 items-center">
          <div className="h-1.5 flex-1 rounded-l bg-slate-900" />
        </div>
        <div className="relative max-w-md rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-amber-300">
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
        <div className="grid gap-4 lg:grid-cols-3">
          {ORDER.map((cat) => (
            <section
              key={cat}
              aria-label={CATEGORY_LABEL[cat]}
              className={`rounded-xl border-t-4 bg-white p-3 shadow-sm ring-1 ring-slate-200 ${CAT_STYLE[cat].head}`}
            >
              <h3 className={`text-sm font-bold uppercase tracking-wide ${CAT_STYLE[cat].text}`}>
                {CATEGORY_LABEL[cat]}{" "}
                <span className="font-semibold text-slate-400">({groups[cat].length})</span>
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
      )}
    </div>
  );
}
