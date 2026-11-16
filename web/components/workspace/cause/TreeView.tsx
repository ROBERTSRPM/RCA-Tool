"use client";

import type { CauseNode } from "@/lib/types";
import { NodeCard } from "./NodeCard";
import { useCause } from "./context";

function TreeItem({ node }: { node: CauseNode }) {
  const showKids = node.children.length > 0 && !node.collapsed;
  return (
    <li className={`t-li ${showKids ? "has-kids" : ""}`}>
      <div className="t-card-wrap">
        <NodeCard node={node} />
      </div>
      {showKids && (
        <ul className="t-children">
          {node.children.map((c) => (
            <TreeItem key={c.id} node={c} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function TreeView() {
  const { inv, addChild } = useCause();
  const root = inv.tree;
  return (
    <div>
      <p className="mb-2 text-xs text-slate-500 sm:text-sm">
        Read left to right: each box is the reason for the box before it. Tap a box to select and
        edit it. Swipe or scroll sideways to follow a long chain.
      </p>
      <div
        className="relative overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4"
        data-testid="tree-scroll"
        tabIndex={0}
        aria-label="Cause tree. Scrollable."
      >
        <div className="flex min-w-max items-start gap-0">
          <ul className="t-list">
            <TreeItem node={root} />
          </ul>
          {root.children.length === 0 && (
            <div className="ml-6 mt-6 w-64 flex-none rounded-lg border-2 border-dashed border-slate-300 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">Start here</p>
              <p className="mt-1">
                Ask “Why did the failure happen?” and add the first cause.
              </p>
              <button className="btn btn-primary btn-sm mt-3" onClick={() => addChild(root.id)}>
                Ask the first Why?
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
