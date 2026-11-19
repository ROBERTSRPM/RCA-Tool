"use client";

import { flushSync } from "react-dom";
import { useEffect, useState } from "react";
import { AI_LIMITS, buildAiContext } from "@/lib/ai/context";
import type { DocumentDraft } from "@/lib/ai/output";
import type { Investigation } from "@/lib/types";
import type { Updater } from "../types";
import { Icon } from "../../icons";
import { AiButton, AiCard, RunStatus, useAiRun } from "./shared";

type Kind = "report" | "summary";

/**
 * AI drafts of the full report and the one-page management summary. The draft
 * is editable text; it is never written into the investigation. It can be
 * printed or copied. (TODO, later release: photos in the write-up. Evidence
 * photos are deliberately not sent to the AI in this release.)
 */
export function DraftReport({
  inv,
  update,
  onPrintingChange,
}: {
  inv: Investigation;
  update: Updater;
  /** Tells the report page to hide itself while the draft is printed. */
  onPrintingChange: (printing: boolean) => void;
}) {
  const { state, run, running, reset } = useAiRun<DocumentDraft>("draft");
  const [kind, setKind] = useState<Kind>(() => (inv.reportDrafts?.report ? "report" : inv.reportDrafts?.summary ? "summary" : "report"));
  const [notes, setNotes] = useState("");
  // A kept draft (edited or accepted by the user) comes back when the user returns to this step.
  const [doc, setDocState] = useState<DocumentDraft | null>(() => inv.reportDrafts?.report ?? null);
  const [last, setLast] = useState<DocumentDraft | null>(null);
  const [copied, setCopied] = useState(false);
  const [printing, setPrinting] = useState(false);
  /** Shows the draft; with keep, also stores it in the investigation (saved with everything else). */
  const setDoc = (d: DocumentDraft | null, keep = false) => {
    setDocState(d);
    if (keep && d) {
      const saved = { title: d.title, sections: d.sections, savedAt: new Date().toISOString() };
      update((i) => ({ ...i, reportDrafts: { ...i.reportDrafts, [kind]: saved } }));
    }
  };
  if (state.status === "done" && state.result !== last) {
    setLast(state.result);
    setDocState(state.result);
  }

  useEffect(() => {
    const done = () => {
      setPrinting(false);
      onPrintingChange(false);
    };
    window.addEventListener("afterprint", done);
    return () => window.removeEventListener("afterprint", done);
  }, [onPrintingChange]);

  function ask(k: Kind) {
    setKind(k);
    setDocState(null);
    void run({ context: buildAiContext(inv), kind: k, notes });
  }

  function printDraft() {
    if (doc) setDoc(doc, true);
    flushSync(() => {
      setPrinting(true);
      onPrintingChange(true);
    });
    window.print();
  }

  const asText = (d: DocumentDraft) =>
    [d.title, ...d.sections.map((s) => `${s.heading}\n${s.body}`)].filter(Boolean).join("\n\n");

  return (
    <>
    <AiCard
      title="Write-up drafting"
      intro="Drafts the full report or a one-page management summary from your investigation. Edit it before you use it."
      className="no-print mb-4"
    >
      <label className="label" htmlFor="ai-report-notes">
        Anything to add? (optional)
      </label>
      <textarea
        id="ai-report-notes"
        className="input"
        rows={2}
        value={notes}
        maxLength={AI_LIMITS.notes + 500}
        placeholder="e.g. The audience is the site manager. Keep it short."
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <AiButton running={running && kind === "report"} disabled={running} testId="draft-report-run" onClick={() => ask("report")}>
          Draft report
        </AiButton>
        <AiButton running={running && kind === "summary"} disabled={running} secondary testId="draft-summary-run" onClick={() => ask("summary")}>
          Management summary (1 page)
        </AiButton>
      </div>
      <RunStatus state={state} working="Writing the draft." />
      {doc && (
        <div className="mt-4" data-testid="draft-doc">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
            <p className="text-sm font-semibold text-slate-800">
              {kind === "summary" ? "Management summary draft" : "Report draft"}. Edit the text below; your edits are kept with this investigation. Check every fact before you share it.
            </p>
            <label className="label mt-3" htmlFor="draft-title">
              Title
            </label>
            <input id="draft-title" className="input" value={doc.title} onChange={(e) => setDoc({ ...doc, title: e.target.value }, true)} />
            {doc.sections.map((s, i) => (
              <div key={i} className="mt-3">
                <input
                  aria-label={`Section ${i + 1} heading`}
                  className="input font-semibold"
                  value={s.heading}
                  onChange={(e) =>
                    setDoc({ ...doc, sections: doc.sections.map((x, j) => (j === i ? { ...x, heading: e.target.value } : x)) }, true)
                  }
                />
                <textarea
                  aria-label={`Section ${i + 1} text`}
                  className="input mt-1"
                  rows={Math.min(12, Math.max(3, Math.ceil(s.body.length / 70)))}
                  value={s.body}
                  onChange={(e) =>
                    setDoc({ ...doc, sections: doc.sections.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)) }, true)
                  }
                />
              </div>
            ))}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary btn-sm" onClick={printDraft} data-testid="draft-print">
                <Icon name="print" size={16} /> Print this draft
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setDoc(doc, true);
                  void navigator.clipboard?.writeText(asText(doc)).then(() => setCopied(true));
                }}
              >
                <Icon name="copy" size={16} /> {copied ? "Copied" : "Copy text"}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                data-testid="ai-dismiss"
                onClick={() => {
                  setDocState(null);
                  setLast(null);
                  setCopied(false);
                  reset();
                  update((i) => {
                    const { [kind]: _drop, ...rest } = i.reportDrafts ?? {};
                    void _drop;
                    return { ...i, reportDrafts: Object.keys(rest).length ? rest : undefined };
                  });
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </AiCard>
      {/* Printed version of the edited draft: plain paragraphs, so long text is never cut off. Only present while printing it. */}
      {doc && printing && (
        <article className="print-sheet hidden text-sm leading-relaxed text-slate-900 print:block" data-testid="draft-print-view">
          {doc.title && <h1 className="text-2xl font-semibold">{doc.title}</h1>}
          <p className="text-xs uppercase tracking-widest text-slate-500">AI draft, edited by the author. Facts to be checked before use.</p>
          {doc.sections.map((s, i) => (
            <section key={i} className="avoid-break mt-3">
              <h2 className="text-base font-semibold">{s.heading}</h2>
              <p className="whitespace-pre-wrap">{s.body}</p>
            </section>
          ))}
        </article>
      )}
    </>
  );
}
