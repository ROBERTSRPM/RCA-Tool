"use client";

import { useState } from "react";
import { formatDate } from "@/lib/dates";
import { uid } from "@/lib/id";
import { downscaleImage } from "@/lib/image";
import { flatten, unlinkEvidence } from "@/lib/tree";
import type { EvidenceItem, EvidenceType } from "@/lib/types";
import { Icon } from "../../icons";
import { EmptyState, SectionCard, SelectField, TextAreaField, TextField, useConfirm } from "../../ui";
import type { StepProps } from "../types";

export const EVIDENCE_TYPES: { value: EvidenceType; label: string }[] = [
  { value: "photo", label: "Photo" },
  { value: "data", label: "Data / Trend" },
  { value: "document", label: "Document" },
  { value: "interview", label: "Interview" },
  { value: "inspection", label: "Inspection" },
  { value: "other", label: "Other" },
];

export const evidenceTypeLabel = (t: EvidenceType) =>
  EVIDENCE_TYPES.find((e) => e.value === t)?.label ?? t;

export function EvidenceStep({ inv, update }: StepProps) {
  const confirm = useConfirm();
  const [openId, setOpenId] = useState<string | null>(null);

  const linkedCount = (id: string) =>
    flatten(inv.tree).filter((f) => f.node.evidenceIds.includes(id)).length;

  function add() {
    const item: EvidenceItem = {
      id: uid(),
      type: "photo",
      title: "",
      note: "",
      date: "",
      image: null,
    };
    update((i) => ({ ...i, evidence: [...i.evidence, item] }));
    setOpenId(item.id);
  }

  function change(id: string, patch: Partial<EvidenceItem>) {
    update((i) => ({
      ...i,
      evidence: i.evidence.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }

  async function remove(item: EvidenceItem) {
    const links = linkedCount(item.id);
    const ok = await confirm({
      title: "Delete this evidence?",
      message:
        links > 0
          ? `"${item.title || "Untitled"}" is linked to ${links} ${links === 1 ? "cause" : "causes"}. It will be removed from them too.`
          : `"${item.title || "Untitled"}" will be deleted.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    update((i) => ({
      ...i,
      evidence: i.evidence.filter((e) => e.id !== item.id),
      tree: unlinkEvidence(i.tree, item.id),
    }));
  }

  return (
    <SectionCard
      title="3. Gather the evidence"
      help="List the facts you collected: photos, trend data, documents, interviews, inspections. Later you will link them to causes to show a cause is proven."
      right={
        <button className="btn btn-primary" onClick={add}>
          <Icon name="plus" /> Add evidence
        </button>
      }
    >
      {inv.evidence.length === 0 ? (
        <EmptyState
          title="No evidence yet"
          action={
            <button className="btn btn-primary" onClick={add}>
              <Icon name="plus" /> Add the first item
            </button>
          }
        >
          Good evidence is what separates a proven cause from a guess. Add a photo of the failed
          part, a trend from your historian, or notes from talking to the operators.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {inv.evidence.map((e, idx) => {
            const open = openId === e.id;
            const links = linkedCount(e.id);
            return (
              <li key={e.id} className="rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="flex flex-wrap items-center gap-3 p-3">
                  {e.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={e.image}
                      alt=""
                      className="h-14 w-14 flex-none rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex h-14 w-14 flex-none items-center justify-center rounded-lg bg-slate-200 text-sm font-bold text-slate-600">
                      E{idx + 1}
                    </span>
                  )}
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="font-semibold text-slate-900">
                      {e.title || <span className="text-slate-400">Untitled evidence</span>}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                      <span className="chip bg-slate-200 text-slate-700">{evidenceTypeLabel(e.type)}</span>
                      {e.date && <span>{formatDate(e.date)}</span>}
                      <span>
                        {links === 0
                          ? "Not linked to a cause yet"
                          : `Linked to ${links} ${links === 1 ? "cause" : "causes"}`}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-secondary btn-sm"
                      aria-expanded={open}
                      onClick={() => setOpenId(open ? null : e.id)}
                    >
                      <Icon name={open ? "up" : "edit"} size={16} />
                      {open ? "Done" : "Edit"}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      aria-label={`Delete evidence ${e.title || "untitled"}`}
                      onClick={() => remove(e)}
                    >
                      <Icon name="trash" size={16} />
                      Delete
                    </button>
                  </div>
                </div>
                {!open && e.note && (
                  <p className="border-t border-slate-200 px-3 py-2.5 text-sm text-slate-700">
                    {e.note}
                  </p>
                )}
                {open && (
                  <div className="grid gap-4 border-t border-slate-200 bg-white p-4 sm:grid-cols-2">
                    <TextField
                      className="sm:col-span-2"
                      label="Title"
                      placeholder="e.g. Vibration trend, last 4 failures"
                      value={e.title}
                      onChange={(v) => change(e.id, { title: v })}
                    />
                    <SelectField
                      label="Type"
                      value={e.type}
                      onChange={(v) => change(e.id, { type: v })}
                      options={EVIDENCE_TYPES}
                    />
                    <TextField
                      label="Date"
                      help="When it was collected."
                      type="date"
                      value={e.date}
                      onChange={(v) => change(e.id, { date: v })}
                    />
                    <TextAreaField
                      className="sm:col-span-2"
                      label="Note"
                      help="What does it show? Say it in one or two sentences."
                      rows={3}
                      value={e.note}
                      onChange={(v) => change(e.id, { note: v })}
                    />
                    <ImageField
                      image={e.image}
                      onChange={(image) => change(e.id, { image })}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

function ImageField({
  image,
  onChange,
}: {
  image: string | null;
  onChange: (v: string | null) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="sm:col-span-2">
      <span className="label">Photo (optional)</span>
      <div className="flex flex-wrap items-center gap-3">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="Evidence preview" className="max-h-40 rounded-lg border border-slate-200" />
        )}
        <label className="btn btn-secondary cursor-pointer">
          <Icon name="camera" />
          {busy ? "Processing…" : image ? "Replace photo" : "Add a photo"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Upload photo"
            onChange={async (ev) => {
              const file = ev.target.files?.[0];
              ev.target.value = "";
              if (!file) return;
              setError(null);
              setBusy(true);
              try {
                onChange(await downscaleImage(file));
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not add the photo.");
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        {image && (
          <button className="btn btn-ghost" onClick={() => onChange(null)}>
            Remove photo
          </button>
        )}
      </div>
      <p className="help">Photos are shrunk to fit and kept in this browser only.</p>
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
