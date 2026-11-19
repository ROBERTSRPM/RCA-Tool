"use client";

import { useState } from "react";
import type { FailureType, Problem } from "@/lib/types";
import { FAILURE_TYPES } from "@/lib/options";
import { ChoiceGroup, SectionCard, TextAreaField, TextField } from "../../ui";
import { AssetDetails } from "../AssetDetails";
import { DraftProblem } from "../ai/DraftProblem";
import { DemoAiNote } from "../ai/shared";
import { SimilarFailures } from "../SimilarFailures";
import type { StepProps } from "../types";

export function ProblemStep({ inv, update, go }: StepProps) {
  const set = <K extends keyof Problem>(key: K, value: Problem[K]) =>
    update((i) => ({ ...i, problem: { ...i.problem, [key]: value } }));
  const p = inv.problem;
  // The cause just copied from a similar failure, so "Open the cause tree" can select it.
  const isProcess = p.failureType === "process";
  const [added, setAdded] = useState<string | undefined>(undefined);
  return (
    <div className="space-y-5">
      <DraftProblem inv={inv} update={update} />
      <DemoAiNote />
      <SectionCard
        title="1. Describe the problem"
        help="Write what you know now. Plain facts, no guessing at causes yet. Everything saves as you type."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            className="sm:col-span-2"
            label="Title"
            help="Short and specific: what failed, and on what."
            placeholder="e.g. Repeat bearing failures on pump P-101"
            value={p.title}
            onChange={(v) => set("title", v)}
          />
          <ChoiceGroup<FailureType>
            className="sm:col-span-2"
            label="Type of failure"
            help="Pick Process or quality failure for things like leaking packs, wrong settings or out-of-spec product."
            options={FAILURE_TYPES}
            value={p.failureType ?? "equipment"}
            onChange={(v) => set("failureType", v || (p.failureType ?? "equipment"))}
          />
          <TextField
            className="sm:col-span-2"
            label="Quality reference (NCR / CAPA number)"
            help="Optional. The number in your site's quality system, so this investigation can feed it."
            placeholder="e.g. NCR-2291"
            value={p.qualityRef ?? ""}
            onChange={(v) => set("qualityRef", v)}
          />
          <TextField
            label={isProcess ? "Line or process" : "Asset"}
            help={isProcess ? "The line, process or product affected." : "The machine or equipment, with its tag number."}
            placeholder={isProcess ? "e.g. Line 3 tray sealer, chilled ready meals" : "e.g. Slurry pump P-101"}
            value={p.asset}
            onChange={(v) => set("asset", v)}
          />
          <TextField
            label="Site / area"
            help="Where on site it is."
            placeholder="e.g. Concentrator plant, thickener area"
            value={p.site}
            onChange={(v) => set("site", v)}
          />
          <TextField
            label="Date of event"
            help="When the failure happened (or the latest one)."
            type="date"
            value={p.eventDate}
            onChange={(v) => set("eventDate", v)}
          />
          <div className="hidden sm:block" />
          <TextAreaField
            className="sm:col-span-2"
            label="What happened?"
            help="Describe the failure as someone who was there would."
            rows={4}
            placeholder="e.g. The drive-end bearing seized and the pump tripped on high temperature."
            value={p.whatHappened}
            onChange={(v) => set("whatHappened", v)}
          />
          <TextAreaField
            label={isProcess ? "Where in the process?" : "Where on the equipment?"}
            help={isProcess ? "Which step, station or part of the pack or product is affected." : "Which part or location failed."}
            rows={3}
            placeholder={isProcess ? "e.g. Seal flange on the tray, left side, after the sealing station." : "e.g. Drive-end bearing housing and gland seal."}
            value={p.where}
            onChange={(v) => set("where", v)}
          />
          <TextAreaField
            label="When did it happen?"
            help="Time of day, operating mode, pattern across shifts or seasons."
            rows={3}
            placeholder="e.g. Early shift, at full throughput. Seen on every shift."
            value={p.when}
            onChange={(v) => set("when", v)}
          />
          <TextAreaField
            className="sm:col-span-2"
            label="What was the impact?"
            help="Safety, production, quality, environment, cost. The money is added in the next step."
            rows={3}
            placeholder="e.g. Tailings transfer stopped; feed cut back within 6 hours."
            value={p.impact}
            onChange={(v) => set("impact", v)}
          />
        </div>
      </SectionCard>

      <AssetDetails problem={inv.problem} update={update} />

      <SimilarFailures
        inv={inv}
        update={update}
        parentId={inv.tree.id}
        onAdded={setAdded}
        onOpenTree={() => go("cause", added)}
      />
    </div>
  );
}
