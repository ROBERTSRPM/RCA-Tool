"use client";

import { pathTo } from "@/lib/tree";
import { findParent } from "@/lib/tree";
import { Icon } from "../../icons";
import { CAT_STYLE, NodeCard } from "./NodeCard";
import { useCause } from "./context";

export function FiveWhysView() {
  const cx = useCause();
  const root = cx.inv.tree;
  const chain = pathTo(root, cx.selectedId);
  const last = chain[chain.length - 1];

  if (!last) return null;
  const whys = chain.length - 1;

  return (
    <div>
      <p className="mb-3 text-sm text-slate-600">
        This is the chain of reasons from the failure down to the selected cause. Pick a box to
        follow a different branch. You do not have to stop at five.
      </p>
      <ol className="space-y-0">
        {chain.map((node, i) => {
          const parent = i > 0 ? chain[i - 1] : null;
          const siblings = parent ? parent.children.filter((s) => s.id !== node.id) : [];
          return (
            <li key={node.id}>
              {i > 0 && (
                <div className="flex items-center gap-2 py-1.5 pl-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Icon name="down" size={16} /> because
                </div>
              )}
              <div className="flex items-start gap-3">
                <span
                  className={`mt-2 flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-bold ${
                    i === 0 ? "bg-slate-900 text-white" : "bg-accent text-slate-950"
                  }`}
                  aria-hidden="true"
                >
                  {i === 0 ? "!" : i}
                </span>
                <div className="min-w-0 flex-1">
                  <NodeCard node={node} wide kicker={i === 0 ? undefined : `Why ${i}`} />
                  {siblings.length > 0 && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      Other causes at this level:
                      {siblings.map((s) => (
                        <button
                          key={s.id}
                          className={`chip max-w-full truncate ring-1 ring-inset hover:brightness-95 ${CAT_STYLE[s.category].chip}`}
                          onClick={() => cx.select(s.id)}
                        >
                          {s.text.length > 40 ? s.text.slice(0, 39) + "…" : s.text || "(no text)"}
                        </button>
                      ))}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4">
        {last.children.length > 0 ? (
          <>
            <p className="text-sm font-semibold text-slate-800">
              Dig deeper: why did this happen? Choose one:
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {last.children.map((c) => (
                <button
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-left text-sm hover:border-amber-500 hover:bg-amber-50"
                  onClick={() => cx.select(c.id)}
                >
                  <span className="min-w-0">{c.text || "(no text)"}</span>
                  <Icon name="right" size={16} className="flex-none text-slate-500" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-700">
            {last.category === "system" && findParent(root, last.id)
              ? "This chain ends on a System / Latent cause. If it is the gap you will fix, tick “This is a root cause”."
              : whys >= 0 && "No deeper cause recorded yet. Ask why again, or tick “This is a root cause” if it is the one to fix."}
          </p>
        )}
        <button className="btn btn-primary btn-sm mt-3" onClick={() => cx.addChild(last.id)}>
          <Icon name="plus" size={15} /> Add another Why
        </button>
      </div>
    </div>
  );
}
