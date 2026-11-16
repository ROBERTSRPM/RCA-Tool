"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAutosavedInvestigation } from "@/lib/hooks";
import { runQualityCheck } from "@/lib/quality";
import { SAMPLE_NOTE } from "@/lib/sample";
import { isStepComplete, STEPS } from "@/lib/steps";
import type { Investigation, StepId } from "@/lib/types";
import { Icon } from "../icons";
import { QualityPanel } from "./QualityPanel";
import { ActionsStep } from "./steps/ActionsStep";
import { CauseStep } from "./steps/CauseStep";
import { EvidenceStep } from "./steps/EvidenceStep";
import { LossStep } from "./steps/LossStep";
import { ProblemStep } from "./steps/ProblemStep";
import { ReportStep } from "./steps/ReportStep";
import { VerifyStep } from "./steps/VerifyStep";

function readHash(): StepId {
  const h = window.location.hash.replace("#", "");
  return STEPS.some((s) => s.id === h) ? (h as StepId) : "problem";
}

export function Workspace({ initial }: { initial: Investigation }) {
  const { inv, update, save, retry } = useAutosavedInvestigation(initial);
  const [step, setStep] = useState<StepId>(() => readHash());
  const [selectedNode, setSelectedNode] = useState<string | undefined>(undefined);
  const stepperRef = useRef<HTMLOListElement>(null);

  const findings = useMemo(() => runQualityCheck(inv), [inv]);

  const go = useCallback((s: StepId, nodeId?: string) => {
    setStep(s);
    if (nodeId) setSelectedNode(nodeId);
    window.history.replaceState(null, "", `#${s}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    document.title = `${inv.problem.title || "New investigation"} · RootLoop`;
  }, [inv.problem.title]);

  useEffect(() => {
    const el = stepperRef.current?.querySelector<HTMLElement>('[aria-current="step"]');
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [step]);

  const idx = STEPS.findIndex((s) => s.id === step);
  const stepProps = { inv, update, go };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
      <div className="no-print">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <Link
            href="/app"
            className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <Icon name="left" size={16} /> All investigations
          </Link>
          <SaveIndicator save={save} retry={retry} />
        </div>
        <h1 className="mt-2 text-xl font-bold leading-tight tracking-tight text-slate-900 sm:text-2xl">
          {inv.problem.title || "New investigation"}
        </h1>

        {inv.isSample && (
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <strong>{SAMPLE_NOTE}</strong> Feel free to edit it; use{" "}
            <em>Reset sample data</em> on the dashboard to restore it.
          </p>
        )}

        <nav aria-label="Investigation steps" className="mt-4">
          <ol
            ref={stepperRef}
            className="relative -mx-4 flex gap-1 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
          >
            {STEPS.map((s, i) => {
              const active = s.id === step;
              const done = isStepComplete(s.id, inv);
              return (
                <li key={s.id} className="flex-none sm:flex-1">
                  <button
                    onClick={() => go(s.id)}
                    aria-current={active ? "step" : undefined}
                    className={`flex min-h-12 w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white shadow"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold ${
                        done
                          ? "bg-emerald-500 text-white"
                          : active
                            ? "bg-accent text-slate-950"
                            : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {done ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}
                    </span>
                    <span className="text-sm font-semibold whitespace-nowrap">{s.label}</span>
                    {done && <span className="sr-only">(complete)</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <QualityPanel findings={findings} go={go} />
      </div>

      <div className="mt-5" key={step}>
        {step === "problem" && <ProblemStep {...stepProps} />}
        {step === "loss" && <LossStep {...stepProps} />}
        {step === "evidence" && <EvidenceStep {...stepProps} />}
        {step === "cause" && (
          <CauseStep
            {...stepProps}
            selectedId={selectedNode ?? inv.tree.id}
            setSelectedId={setSelectedNode}
          />
        )}
        {step === "actions" && <ActionsStep {...stepProps} />}
        {step === "verify" && <VerifyStep {...stepProps} />}
        {step === "report" && <ReportStep {...stepProps} />}
      </div>

      <div className="no-print mt-8 flex items-center justify-between gap-3">
        {idx > 0 ? (
          <button className="btn btn-secondary" onClick={() => go(STEPS[idx - 1].id)}>
            <Icon name="left" size={16} /> Back: {STEPS[idx - 1].label}
          </button>
        ) : (
          <span />
        )}
        {idx < STEPS.length - 1 && (
          <button className="btn btn-dark" onClick={() => go(STEPS[idx + 1].id)}>
            Next: {STEPS[idx + 1].label} <Icon name="right" size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function SaveIndicator({
  save,
  retry,
}: {
  save: ReturnType<typeof useAutosavedInvestigation>["save"];
  retry: () => void;
}) {
  if (save.status === "error") {
    return (
      <span role="alert" className="flex items-center gap-2 text-sm font-medium text-red-700">
        <Icon name="alert" size={16} />
        {save.message}
        <button className="underline" onClick={retry}>
          Try again
        </button>
      </span>
    );
  }
  const text =
    save.status === "saved" ? "All changes saved" : "Saving…";
  return (
    <span
      role="status"
      aria-live="polite"
      className="flex items-center gap-1.5 text-sm text-slate-500"
    >
      <span
        className={`h-2 w-2 rounded-full ${save.status === "saved" ? "bg-emerald-500" : "bg-amber-400"}`}
      />
      {text}
    </span>
  );
}
