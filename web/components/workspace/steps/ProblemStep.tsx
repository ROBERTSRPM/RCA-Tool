"use client";

import type { Problem } from "@/lib/types";
import { SectionCard, TextAreaField, TextField } from "../../ui";
import type { StepProps } from "../types";

export function ProblemStep({ inv, update }: StepProps) {
  const set = <K extends keyof Problem>(key: K, value: Problem[K]) =>
    update((i) => ({ ...i, problem: { ...i.problem, [key]: value } }));
  const p = inv.problem;
  return (
    <div className="space-y-5">
      <SectionCard
        title="1. Describe the problem"
        help="Write what you know now. Plain facts, no guessing at causes yet. Everything saves as you type."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            className="sm:col-span-2"
            label="Title"
            help="Short and specific: what failed, and on what."
            placeholder="e.g. Repeat bearing failures on pump P-201"
            value={p.title}
            onChange={(v) => set("title", v)}
          />
          <TextField
            label="Asset"
            help="The machine or equipment, with its tag number."
            placeholder="e.g. Slurry pump P-201"
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
            label="Where on the equipment?"
            help="Which part or location failed."
            rows={3}
            placeholder="e.g. Drive-end bearing housing and gland seal."
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
    </div>
  );
}
