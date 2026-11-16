"use client";

import { useState } from "react";
import type { Finding, Severity } from "@/lib/quality";
import { STEPS } from "@/lib/steps";
import type { StepId } from "@/lib/types";
import { Icon } from "../icons";

const SEV: Record<Severity, { label: string; dot: string; chip: string }> = {
  high: { label: "Fix first", dot: "bg-red-500", chip: "bg-red-50 text-red-700 ring-red-200" },
  medium: { label: "Should fix", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-800 ring-amber-200" },
  low: { label: "Tip", dot: "bg-slate-400", chip: "bg-slate-100 text-slate-700 ring-slate-200" },
};

export function QualityPanel({
  findings,
  go,
}: {
  findings: Finding[];
  go: (step: StepId, nodeId?: string) => void;
}) {
  const [open, setOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false,
  );
  const stepLabel = (id: StepId) => STEPS.find((s) => s.id === id)?.label ?? id;
  const high = findings.filter((f) => f.severity === "high").length;

  return (
    <section
      aria-label="Quality check"
      className={`mt-3 overflow-hidden rounded-xl border ${
        findings.length === 0 ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
      }`}
    >
      <button
        className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left"
        aria-expanded={open}
        aria-controls="quality-list"
        onClick={() => setOpen((o) => !o)}
      >
        <span
          className={`flex h-7 w-7 flex-none items-center justify-center rounded-full ${
            findings.length === 0 ? "bg-emerald-500 text-white" : "bg-slate-900 text-white"
          }`}
        >
          <Icon name={findings.length === 0 ? "check" : "shield"} size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-900">
            Quality check
            <span className="ml-2 font-medium text-slate-600">
              {findings.length === 0
                ? "All clear"
                : `${findings.length} ${findings.length === 1 ? "finding" : "findings"}${
                    high ? `, ${high} to fix first` : ""
                  }`}
            </span>
          </span>
          {!open && (
            <span className="block text-xs text-slate-500">
              Automatic checks that update as you type. Tap to {findings.length ? "see them" : "open"}.
            </span>
          )}
        </span>
        <Icon name={open ? "up" : "down"} className="flex-none text-slate-500" />
      </button>
      {open && (
        <div id="quality-list" className="border-t border-slate-200">
          {findings.length === 0 ? (
            <p className="px-4 py-3 text-sm text-emerald-900">
              Nothing to flag. The problem, loss, evidence, causes, actions and review all pass the
              checks.
            </p>
          ) : (
            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {findings.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                  <span className={`chip ring-1 ring-inset ${SEV[f.severity].chip}`}>
                    {SEV[f.severity].label}
                  </span>
                  <p className="min-w-0 flex-1 basis-60 text-sm text-slate-800">{f.message}</p>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => go(f.step, f.nodeId)}
                  >
                    Go to {stepLabel(f.step)}
                    <Icon name="right" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
