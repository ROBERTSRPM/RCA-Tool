"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { useAutosavedInvestigation } from "@/lib/hooks";
import { runQualityCheck } from "@/lib/quality";
import { SAMPLE_NOTE } from "@/lib/sample";
import { rolloutProgress } from "@/lib/rollout";
import { isStepComplete, STEPS } from "@/lib/steps";
import { ASSET_TAG_BLUR, ensureAssetFor } from "@/lib/use-assets";
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
  const { inv, update, save, retry, loadLatest, keepMine, notice } =
    useAutosavedInvestigation(initial);
  const [step, setStep] = useState<StepId>(() => readHash());
  const [selectedNode, setSelectedNode] = useState<string | undefined>(undefined);
  const stepperRef = useRef<HTMLOListElement>(null);

  const findings = useMemo(() => runQualityCheck(inv), [inv]);

  // Findings about a step are only guidance (neutral) until that step has been visited or edited,
  // so a brand-new investigation never opens with red. Saved work counts as visited throughout.
  const [startedWithWork] = useState(() => !!initial.problem.title.trim() || initial.isSample === true);
  const [visited, setVisited] = useState<Set<StepId>>(() => new Set());
  const markVisited = useCallback((s: StepId) => {
    setVisited((v) => (v.has(s) ? v : new Set(v).add(s)));
  }, []);
  const firstInv = useRef(inv);
  useEffect(() => {
    // Editing anything counts as having visited the step you are on.
    if (inv !== firstInv.current) markVisited(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inv]);
  const visitedForPanel = useMemo(
    () => (startedWithWork ? new Set<StepId>(STEPS.map((s) => s.id)) : visited),
    [visited, startedWithWork],
  );

  const go = useCallback((s: StepId, nodeId?: string) => {
    markVisited(s);
    setStep(s);
    if (nodeId) setSelectedNode(nodeId);
    window.history.replaceState(null, "", `#${s}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [markVisited]);

  useEffect(() => {
    const onHash = () => {
      const s = readHash();
      markVisited(s);
      setStep(s);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [markVisited]);

  useEffect(() => {
    const wanted = `${inv.problem.title || "New investigation"} · ${BRAND_NAME}`;
    document.title = wanted;
    // Next.js streams its own <title> in after hydration and would put the
    // default back; keep ours while this page is open.
    const keep = () => {
      if (document.title !== wanted) document.title = wanted;
    };
    const observer = new MutationObserver(keep);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [inv.problem.title]);

  useEffect(() => {
    const el = stepperRef.current?.querySelector<HTMLElement>('[aria-current="step"]');
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [step]);

  // Make sure the investigation's asset tag is in the asset register, once the
  // details have settled (not on every keystroke) and again when leaving the page.
  const problemRef = useRef(inv.problem);
  useEffect(() => {
    problemRef.current = inv.problem;
  }, [inv.problem]);
  const ensurePending = useRef(false);
  const pr = inv.problem;
  const invId = inv.id;
  const assetSig = [pr.assetTag, pr.assetType, pr.makeModel, pr.duty, pr.criticality, pr.site].join("\u0001");
  useEffect(() => {
    if (!(problemRef.current.assetTag ?? "").trim()) return;
    ensurePending.current = true;
    // A longer pause than a typing gap, so a half-typed or mistyped tag is not added;
    // leaving the field adds it at once (see the blur listener below).
    const t = setTimeout(() => {
      ensurePending.current = false;
      void ensureAssetFor(problemRef.current, invId);
    }, 5000);
    return () => clearTimeout(t);
  }, [assetSig, invId]);
  useEffect(() => {
    const onBlur = () => {
      if (!(problemRef.current.assetTag ?? "").trim()) return;
      ensurePending.current = false;
      void ensureAssetFor(problemRef.current, invId);
    };
    window.addEventListener(ASSET_TAG_BLUR, onBlur);
    return () => window.removeEventListener(ASSET_TAG_BLUR, onBlur);
  }, [invId]);
  useEffect(
    () => () => {
      if (ensurePending.current) void ensureAssetFor(problemRef.current, invId);
    },
    [invId],
  );

  const rollout = rolloutProgress(inv.rollouts);
  const idx = STEPS.findIndex((s) => s.id === step);
  const stepProps = { inv, update, go };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
      <div className="no-print">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <Link
            href="/app"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <Icon name="left" size={16} /> All investigations
          </Link>
          <SaveIndicator save={save} />
        </div>
        <SaveToast save={save} retry={retry} />
        {save.status === "conflict" && (
          <div
            role="alert"
            data-testid="conflict-banner"
            className="mt-3 rounded-xl border border-red-300 bg-red-50 p-4"
          >
            <p className="font-semibold text-red-900">
              This investigation was changed elsewhere.
            </p>
            <p className="mt-1 text-sm text-red-800">
              Someone saved a newer version from another tab or device, so your latest edits
              have not been saved. Nothing has been overwritten yet. Choose what to keep.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn btn-dark" onClick={() => void loadLatest()}>
                Load the latest version
              </button>
              <button className="btn btn-danger" onClick={() => void keepMine()}>
                Keep mine and overwrite
              </button>
            </div>
            <p className="mt-2 text-xs text-red-800">
              Loading the latest version discards the edits you made here since you opened it.
            </p>
          </div>
        )}
        {notice && (
          <p
            role="status"
            data-testid="remote-notice"
            className="mt-3 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-800"
          >
            {notice}
          </p>
        )}
        <h1 className="mt-1 text-xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-2xl">
          {inv.problem.title || "New investigation"}
        </h1>

        {(inv.problem.assetTag || rollout.total > 0) && (
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600" data-testid="header-meta">
            {inv.problem.assetTag && (
              <span>
                <strong className="text-slate-800">{inv.problem.assetTag}</strong>
                {inv.problem.assetType ? ` · ${inv.problem.assetType}` : ""}
                {inv.problem.criticality ? ` · Criticality ${inv.problem.criticality}` : ""}
              </span>
            )}
            {rollout.total > 0 && (
              <button
                type="button"
                className="chip bg-white text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                onClick={() => go("verify")}
              >
                Rollout: {rollout.done} of {rollout.total} checked
              </button>
            )}
          </p>
        )}

        {inv.isSample && (
          <p className="mt-3 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700">
            <strong>{SAMPLE_NOTE}</strong> Feel free to edit it; use{" "}
            <em>Reset sample data</em> on the dashboard to restore it.
          </p>
        )}

        <nav aria-label="Investigation steps" className="mt-3">
          <ol
            ref={stepperRef}
            className="relative -mx-4 flex gap-0 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0"
          >
            {STEPS.map((s, i) => {
              const active = s.id === step;
              const done = isStepComplete(s.id, inv);
              return (
                <li key={s.id} className="flex-none sm:flex-1">
                  <button
                    onClick={() => go(s.id)}
                    aria-current={active ? "step" : undefined}
                    aria-label={done ? `${s.label} (complete)` : undefined}
                    className={`-mb-px flex min-h-11 w-full items-center justify-center gap-2 border-b-2 px-3 py-2 text-left transition-colors ${
                      active
                        ? "border-accent text-slate-900"
                        : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ${
                        done
                          ? "bg-emerald-700 text-white"
                          : active
                            ? "bg-slate-900 text-white"
                            : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {done ? <Icon name="check" size={12} strokeWidth={3} /> : i + 1}
                    </span>
                    <span className={`text-sm whitespace-nowrap ${active ? "font-semibold" : "font-medium"}`}>{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <QualityPanel findings={findings} go={go} visited={visitedForPanel} />
      </div>

      <div className="mt-4" key={step}>
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
    </main>
  );
}

function SaveIndicator({ save }: { save: ReturnType<typeof useAutosavedInvestigation>["save"] }) {
  if (save.status === "error") {
    return (
      <span className="flex items-center gap-1.5 text-sm font-medium text-red-700">
        <Icon name="alert" size={16} />
        Not saved
      </span>
    );
  }
  const text =
    save.status === "saved"
      ? "All changes saved"
      : save.status === "conflict"
        ? "Not saved: changed elsewhere"
        : "Saving…";
  return (
    <span
      role="status"
      aria-live="polite"
      className="flex items-center gap-1.5 text-sm text-slate-500"
    >
      <span
        className={`h-2 w-2 rounded-full ${save.status === "saved" ? "bg-emerald-600" : "bg-amber-500"}`}
      />
      {text}
    </span>
  );
}

/**
 * A save problem is shown where the user is, not only at the top of a long form:
 * a sticky toast at the bottom of the screen. A signed-out session gets a sign-in link
 * that opens in a new tab so the unsaved text on this page is not lost.
 */
function SaveToast({
  save,
  retry,
}: {
  save: ReturnType<typeof useAutosavedInvestigation>["save"];
  retry: () => Promise<boolean>;
}) {
  if (save.status !== "error") return null;
  const signedOut = save.code === "auth";
  return (
    <div
      role="alert"
      data-testid="save-error-toast"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 shadow-lg"
    >
      <p className="font-semibold">
        {/^(could not|you've been signed out)/i.test(save.message) ? save.message : `Could not save. ${save.message}`}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {signedOut && (
          <a href="/login" target="_blank" rel="noopener" className="btn btn-primary btn-sm">
            Sign in (opens in a new tab)
          </a>
        )}
        <button className="btn btn-secondary btn-sm" onClick={() => void retry()}>
          Try again
        </button>
      </div>
    </div>
  );
}
