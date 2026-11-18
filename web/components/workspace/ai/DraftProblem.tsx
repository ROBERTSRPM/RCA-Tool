"use client";

import { useState } from "react";
import { AI_LIMITS, buildAiContext } from "@/lib/ai/context";
import type { ProblemDraft } from "@/lib/ai/output";
import type { Investigation } from "@/lib/types";
import { TextAreaField, TextField } from "../../ui";
import type { Updater } from "../types";
import { AcceptDismiss, AiButton, AiCard, RunStatus, useAiRun } from "./shared";

type Fields = Pick<ProblemDraft, "title" | "whatHappened" | "where" | "when" | "impact">;

export function DraftProblem({ inv, update }: { inv: Investigation; update: Updater }) {
  const { state, run, running, reset } = useAiRun<ProblemDraft>("draft");
  const [notes, setNotes] = useState("");
  const [fields, setFields] = useState<Fields | null>(null);
  const [last, setLast] = useState<ProblemDraft | null>(null);
  if (state.status === "done" && state.result !== last) {
    setLast(state.result);
    const r = state.result;
    setFields({ title: r.title, whatHappened: r.whatHappened, where: r.where, when: r.when, impact: r.impact });
  }
  const draft = state.status === "done" ? state.result : null;
  const tooLong = notes.length > AI_LIMITS.notes;

  function use() {
    if (!fields) return;
    update((i) => ({
      ...i,
      problem: {
        ...i.problem,
        // Only fields the draft filled in are written, so nothing is blanked by accident.
        ...(fields.title.trim() ? { title: fields.title.trim() } : {}),
        ...(fields.whatHappened.trim() ? { whatHappened: fields.whatHappened.trim() } : {}),
        ...(fields.where.trim() ? { where: fields.where.trim() } : {}),
        ...(fields.when.trim() ? { when: fields.when.trim() } : {}),
        ...(fields.impact.trim() ? { impact: fields.impact.trim() } : {}),
      },
    }));
    setFields(null);
    setLast(null);
    reset();
    setNotes("");
  }

  return (
    <AiCard
      title="Draft problem statement from notes"
      intro="Type rough notes about the failure, in your own words. The AI turns them into a clear problem statement using only what you wrote."
    >
      <label className="label" htmlFor="ai-notes">
        Rough notes
      </label>
      <textarea
        id="ai-notes"
        className="input"
        rows={5}
        value={notes}
        maxLength={AI_LIMITS.notes + 500}
        placeholder="e.g. P101 tripped on high temp DE bearing 3am, 3rd time this year, fitter says bearing was cooked, grease looked dirty, feed cut back for 6 hrs"
        onChange={(e) => setNotes(e.target.value)}
      />
      <p className={`help ${tooLong ? "!text-red-700" : ""}`}>
        {notes.length} of {AI_LIMITS.notes} characters. Text only for now; photo reading is planned for a later release.
      </p>
      <div className="mt-3">
        <AiButton
          running={running}
          disabled={notes.trim().length < 10 || tooLong}
          testId="draft-problem-run"
          onClick={() => {
            setFields(null);
            void run({ context: buildAiContext(inv), kind: "problem", notes });
          }}
        >
          Draft problem statement from notes
        </AiButton>
      </div>
      <RunStatus state={state} working="Writing the draft." />
      {draft && fields && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4" data-testid="draft-problem-result">
          <p className="text-sm font-semibold text-slate-800">
            Draft. Edit anything, then use it. Using it replaces the matching fields in the Problem step.
          </p>
          <div className="mt-3 grid gap-3">
            <TextField label="Title" value={fields.title} onChange={(v) => setFields({ ...fields, title: v })} />
            <TextAreaField label="What happened?" rows={4} value={fields.whatHappened} onChange={(v) => setFields({ ...fields, whatHappened: v })} />
            <TextAreaField label="Where on the equipment?" rows={2} value={fields.where} onChange={(v) => setFields({ ...fields, where: v })} />
            <TextAreaField label="When did it happen?" rows={2} value={fields.when} onChange={(v) => setFields({ ...fields, when: v })} />
            <TextAreaField label="What was the impact?" rows={3} value={fields.impact} onChange={(v) => setFields({ ...fields, impact: v })} />
          </div>
          {draft.missingFacts.length > 0 && (
            <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">Not in your notes. Worth finding out:</p>
              <ul className="mt-1 list-disc pl-5">
                {draft.missingFacts.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}
          <AcceptDismiss
            acceptLabel="Use these fields"
            onAccept={use}
            onDismiss={() => {
              setFields(null);
              setLast(null);
              reset();
            }}
          />
        </div>
      )}
    </AiCard>
  );
}
