"use client";

import { useLayoutEffect, useRef } from "react";
import { failureText } from "@/lib/investigation";
import { canMove, CATEGORY_LABEL, countDescendants, STATUS_LABEL } from "@/lib/tree";
import type { CauseNode, Category } from "@/lib/types";
import { Icon } from "../../icons";
import { useCause } from "./context";

export const CAT_STYLE: Record<
  Category,
  { bar: string; text: string; chip: string; head: string; ring: string }
> = {
  physical: {
    bar: "bg-sky-500",
    text: "text-sky-700",
    chip: "bg-sky-50 text-sky-800 ring-sky-200",
    head: "border-sky-500",
    ring: "ring-sky-200",
  },
  human: {
    bar: "bg-violet-500",
    text: "text-violet-700",
    chip: "bg-violet-50 text-violet-800 ring-violet-200",
    head: "border-violet-500",
    ring: "ring-violet-200",
  },
  system: {
    bar: "bg-amber-500",
    text: "text-amber-700",
    chip: "bg-amber-50 text-amber-900 ring-amber-300",
    head: "border-amber-500",
    ring: "ring-amber-200",
  },
};

export function StatusMark({ status, size = 18 }: { status: CauseNode["status"]; size?: number }) {
  if (status === "verified") {
    return (
      <span
        title="Verified"
        className="inline-flex flex-none items-center justify-center rounded-full bg-emerald-600 text-white"
        style={{ width: size, height: size }}
      >
        <Icon name="check" size={size - 6} strokeWidth={3.5} />
        <span className="sr-only">Verified</span>
      </span>
    );
  }
  if (status === "ruled_out") {
    return (
      <span
        title="Ruled out"
        className="inline-flex flex-none items-center justify-center rounded-full bg-slate-400 text-white"
        style={{ width: size, height: size }}
      >
        <Icon name="x" size={size - 7} strokeWidth={3.5} />
        <span className="sr-only">Ruled out</span>
      </span>
    );
  }
  return (
    <span
      title="Hypothesis"
      className="inline-flex flex-none items-center justify-center rounded-full border-2 border-dashed border-slate-400 bg-white text-[11px] font-bold text-slate-500"
      style={{ width: size, height: size }}
    >
      ?<span className="sr-only">Hypothesis</span>
    </span>
  );
}

function AutoTextarea({
  value,
  onChange,
  placeholder,
  focus,
  onFocused,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  focus: boolean;
  onFocused: () => void;
  label: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  useLayoutEffect(() => {
    if (focus && ref.current) {
      ref.current.focus();
      onFocused();
    }
  }, [focus, onFocused]);
  return (
    <textarea
      ref={ref}
      aria-label={label}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="block w-full resize-none rounded-md border border-slate-300 bg-white px-2 py-1.5 text-base leading-snug text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300 sm:text-sm"
    />
  );
}

export function NodeCard({
  node,
  kicker,
  context,
  wide = false,
}: {
  node: CauseNode;
  kicker?: string;
  context?: string;
  wide?: boolean;
}) {
  const cx = useCause();
  const { inv } = cx;
  const selected = cx.selectedId === node.id;
  const isTop = node.id === inv.tree.id;
  const cat = CAT_STYLE[node.category];
  const hidden = node.collapsed ? countDescendants(node) : 0;
  const text = isTop ? node.text || failureText(inv) : node.text;
  const placeholder = isTop
    ? "Describe the failure event"
    : "What caused the box before it? Say it in plain words.";

  const dim = node.status === "ruled_out";
  const base = isTop
    ? "border-slate-900 bg-slate-900 text-white"
    : node.status === "hypothesis"
      ? "border-dashed border-slate-400 bg-slate-50"
      : dim
        ? "border-slate-300 bg-slate-100"
        : "border-slate-300 bg-white";

  return (
    <div
      data-node-id={node.id}
      data-selected={selected}
      className={`relative overflow-hidden rounded-lg border-2 text-left shadow-sm ${base} ${
        wide ? "w-full" : "w-[236px] sm:w-[264px]"
      } ${selected ? "ring-4 ring-amber-400/70" : ""} ${
        node.isRootCause ? "outline outline-2 outline-offset-2 outline-amber-500" : ""
      }`}
    >
      {!isTop && <span className={`absolute inset-y-0 left-0 w-1.5 ${cat.bar}`} />}
      <button
        type="button"
        className={`block w-full text-left ${isTop ? "pl-3" : "pl-4"} pr-3 pt-2 ${selected ? "cursor-default" : "cursor-pointer"}`}
        onClick={() => cx.select(node.id)}
        aria-label={`Select cause: ${text || "empty cause"}`}
        aria-pressed={selected}
        tabIndex={selected ? -1 : 0}
      >
        <span className="flex items-center justify-between gap-2">
          <span
            className={`text-[11px] font-bold uppercase tracking-wide ${
              isTop ? "text-amber-300" : cat.text
            }`}
          >
            {kicker ? `${kicker} · ` : ""}
            {isTop ? "Failure event" : CATEGORY_LABEL[node.category]}
          </span>
          {!isTop && <StatusMark status={node.status} />}
        </span>
      </button>

      <div className={`${isTop ? "pl-3" : "pl-4"} pr-3 pb-2 pt-1`}>
        {selected ? (
          <AutoTextarea
            value={node.text}
            onChange={(v) => cx.setText(node.id, v)}
            placeholder={text || placeholder}
            focus={cx.focusId === node.id}
            onFocused={cx.clearFocus}
            label={isTop ? "Failure event text" : "Cause text"}
          />
        ) : (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className="block w-full cursor-pointer text-left"
            onClick={() => cx.select(node.id)}
          >
            <span
              className={`block whitespace-pre-wrap break-words text-sm leading-snug ${
                node.status === "ruled_out" && !isTop ? "text-slate-500 line-through" : ""
              } ${node.status === "hypothesis" && !isTop ? "italic text-slate-700" : ""} ${
                !text ? "text-slate-400" : ""
              } ${node.isRootCause ? "font-semibold" : ""}`}
            >
              {text || placeholder}
            </span>
          </button>
        )}
        {context && <p className="mt-1 text-xs text-slate-500">{context}</p>}

        {(node.isRootCause || node.evidenceIds.length > 0 || hidden > 0) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {node.isRootCause && !isTop && (
              <span className="chip bg-amber-500 text-slate-950">
                <Icon name="flag" size={12} /> Root cause
              </span>
            )}
            {node.evidenceIds.length > 0 && !isTop && (
              <span className="chip bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200">
                <Icon name="link" size={12} /> {node.evidenceIds.length} evidence
              </span>
            )}
            {hidden > 0 && (
              <button
                className="chip bg-slate-200 text-slate-800 hover:bg-slate-300"
                onClick={() => cx.toggle(node.id)}
                aria-label={`Show ${hidden} hidden causes`}
              >
                +{hidden} hidden
              </button>
            )}
          </div>
        )}
      </div>

      {selected && <NodeToolbar node={node} isTop={isTop} />}
    </div>
  );
}

function NodeToolbar({ node, isTop }: { node: CauseNode; isTop: boolean }) {
  const cx = useCause();
  const root = cx.inv.tree;
  const sm = "btn btn-sm !min-h-10 !px-2.5";
  return (
    <div
      className="flex flex-wrap items-center gap-1.5 border-t border-slate-200 bg-slate-100 p-2 text-slate-900"
      role="toolbar"
      aria-label="Cause actions"
    >
      <button className={`${sm} btn-primary`} onClick={() => cx.addChild(node.id)} title="Add a cause: why did this happen?">
        <Icon name="plus" size={15} /> Why?
      </button>
      {!isTop && (
        <button className={`${sm} btn-secondary`} onClick={() => cx.addSibling(node.id)} title="Add another cause at the same level">
          <Icon name="plus" size={15} /> Sibling
        </button>
      )}
      {!isTop && (
        <>
          <button
            className={`${sm} btn-secondary`}
            aria-label="Move up"
            title="Move up"
            disabled={!canMove(root, node.id, "up")}
            onClick={() => cx.move(node.id, "up")}
          >
            <Icon name="up" size={16} />
          </button>
          <button
            className={`${sm} btn-secondary`}
            aria-label="Move down"
            title="Move down"
            disabled={!canMove(root, node.id, "down")}
            onClick={() => cx.move(node.id, "down")}
          >
            <Icon name="down" size={16} />
          </button>
        </>
      )}
      {node.children.length > 0 && (
        <button
          className={`${sm} btn-secondary`}
          onClick={() => cx.toggle(node.id)}
          title={node.collapsed ? "Show causes below" : "Hide causes below"}
        >
          <Icon name={node.collapsed ? "chevronsDown" : "chevronsUp"} size={16} />
          {node.collapsed ? "Expand" : "Collapse"}
        </button>
      )}
      {!isTop && (
        <button className={`${sm} btn-danger`} aria-label="Delete cause" title="Delete cause" onClick={() => cx.remove(node)}>
          <Icon name="trash" size={16} />
        </button>
      )}
      <button className={`${sm} btn-secondary lg:hidden`} onClick={cx.scrollToDetails}>
        <Icon name="edit" size={15} /> Details
      </button>
      <span className="sr-only">{STATUS_LABEL[node.status]}</span>
    </div>
  );
}
