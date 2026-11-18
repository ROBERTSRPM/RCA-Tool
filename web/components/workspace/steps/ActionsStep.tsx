"use client";

import { blankTask, isTaskCategory, layoutActions } from "@/lib/capa";
import { useState } from "react";
import { formatDate } from "@/lib/dates";
import { formatMoney, totalActionCost } from "@/lib/finance";
import { uid } from "@/lib/id";
import { ACTION_CATEGORIES, ACTION_KINDS, categoryLabel, INTERVAL_UNITS } from "@/lib/options";
import { isOverdue } from "@/lib/status";
import { findNode, rootCauses } from "@/lib/tree";
import type { ActionCategory, ActionItem, ActionKind, ActionStatus, IntervalUnit, MaintenanceTask } from "@/lib/types";
import { Icon } from "../../icons";
import {
  EmptyState,
  NumberField,
  SectionCard,
  SelectField,
  TextAreaField,
  TextField,
  useConfirm,
} from "../../ui";
import { MaintenancePlan } from "../MaintenancePlan";
import { CapaSuggest } from "../ai/CapaSuggest";
import { ChallengePanel } from "../ai/ChallengePanel";
import { AI_BADGE } from "../ai/shared";
import { SparesCheck } from "../SparesCheck";
import type { StepProps } from "../types";

export const ACTION_STATUS: { value: ActionStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

export function ActionsStep({ inv, update, go }: StepProps) {
  const confirm = useConfirm();
  const roots = rootCauses(inv.tree);
  const cur = inv.loss.currency || "$";
  const total = totalActionCost(inv.actions);
  const overdue = inv.actions.filter((a) => isOverdue(a)).length;
  const done = inv.actions.filter((a) => a.status === "done").length;
  const rootIds = new Set(roots.map((r) => r.id));
  const unlinkedRoots = roots.filter((r) => !inv.actions.some((a) => a.causeId === r.id));
  const { corrective, groups, unlinked } = layoutActions(inv);
  // Only one action is open for editing at a time; a new action opens at once.
  const [openId, setOpenId] = useState<string | null>(null);

  function add(causeId = roots[0]?.id ?? "", kind: ActionKind = "") {
    const a: ActionItem = {
      id: uid(),
      causeId,
      description: "",
      owner: "",
      dueDate: "",
      status: "open",
      cost: null,
      kind,
    };
    update((i) => ({ ...i, actions: [...i.actions, a] }));
    setOpenId(a.id);
  }
  const change = (id: string, patch: Partial<ActionItem>) =>
    update((i) => ({
      ...i,
      actions: i.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  const changeTask = (a: ActionItem, patch: Partial<MaintenanceTask>) =>
    change(a.id, { task: { ...(a.task ?? blankTask()), ...patch } });

  async function remove(a: ActionItem) {
    const ok = await confirm({
      title: "Delete this action?",
      message: `"${a.description || "Untitled action"}" will be deleted.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) update((i) => ({ ...i, actions: i.actions.filter((x) => x.id !== a.id) }));
  }

  const renderRow = (a: ActionItem) => {
    const idx = inv.actions.indexOf(a);
    const late = isOverdue(a);
    const open = openId === a.id;
    const cause = findNode(inv.tree, a.causeId);
    const stale = cause !== null && !cause.isRootCause && cause.id !== inv.tree.id;
    const isLinked = rootIds.has(a.causeId);
    const isCorrective = a.kind === "corrective";
    const task = a.task ?? blankTask();
    const cat = categoryLabel(a.category);
    return (
      <li
        key={a.id}
        data-testid="action-row"
        className={`rounded-xl border ${late ? "border-red-300 bg-red-50/60" : "border-slate-200 bg-slate-50/50"} ${
          open ? "p-4" : ""
        }`}
      >
        <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${open ? "mb-3 justify-between" : ""}`}>
          {open ? (
            <>
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
                Action {idx + 1}
                {late && <span className="chip bg-red-600 text-white">Overdue since {formatDate(a.dueDate)}</span>}
                {a.status === "done" && <span className="chip bg-emerald-100 text-emerald-800">Done</span>}
              </p>
              <div className="flex gap-2">
                <button className="btn btn-secondary btn-sm" onClick={() => setOpenId(null)}>
                  Close
                </button>
                <button className="btn btn-danger btn-sm" aria-label={`Delete action ${idx + 1}`} onClick={() => remove(a)}>
                  <Icon name="trash" size={16} /> Delete
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              aria-expanded={false}
              aria-label={`Edit action ${idx + 1}: ${a.description || "no description yet"}`}
              onClick={() => setOpenId(a.id)}
              className="flex min-h-11 w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3 py-1.5 text-left hover:bg-slate-100 lg:min-h-9 lg:flex-nowrap lg:py-1"
            >
              <span title={a.description} className="min-w-0 flex-1 basis-56 text-sm font-semibold leading-snug text-slate-900 line-clamp-2 lg:line-clamp-1">
                {a.description || <span className="font-normal text-slate-600">(no description yet)</span>}
              </span>
              <span className="flex min-w-0 max-w-full flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700 lg:flex-none">
                <span className={`chip ${cat ? "bg-slate-200 text-slate-800" : "bg-amber-100 text-amber-900"}`}>
                  {cat || "No category"}
                </span>
                {!a.kind && <span className="chip bg-amber-100 text-amber-900">Corrective or preventive?</span>}
                {a.aiSuggested && AI_BADGE}
                <span className={`max-w-[10rem] truncate ${a.owner ? "" : "text-slate-600"}`} title={a.owner}>{a.owner || "No owner"}</span>
                <span className={late ? "font-semibold text-red-700" : a.dueDate ? "" : "text-slate-600"}>
                  {a.dueDate ? formatDate(a.dueDate) : "No date"}
                </span>
                <span
                  className={`chip ${
                    a.status === "done" ? "bg-emerald-100 text-emerald-800" : a.status === "in_progress" ? "bg-sky-100 text-sky-900" : "bg-slate-200 text-slate-800"
                  }`}
                >
                  {ACTION_STATUS.find((x) => x.value === a.status)?.label}
                </span>
                <span className="tabular-nums">{a.cost ? formatMoney(a.cost, cur) : formatMoney(0, cur)}</span>
                <Icon name="edit" size={14} className="text-slate-500" />
              </span>
            </button>
          )}
        </div>
        {open && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              className="sm:col-span-2 lg:col-span-3"
              label={isCorrective ? "Linked to" : isLinked ? "Fixes this root cause" : "Re-link to a root cause"}
              help={
                isCorrective
                  ? "Corrective actions repair this failure, so they answer to the failure event."
                  : isLinked
                    ? undefined
                    : stale
                      ? `This action was linked to "${cause?.text || "(no text)"}", which is no longer flagged as a root cause.`
                      : roots.length === 0
                        ? "There is no root cause to link to yet. Flag one in the cause tree."
                        : "Pick the root cause this action addresses."
              }
              value={isCorrective ? (a.causeId === "" ? inv.tree.id : a.causeId) : isLinked ? a.causeId : ""}
              onChange={(v) => change(a.id, { causeId: v })}
              options={[
                ...(isCorrective ? [{ value: inv.tree.id, label: "The failure event" }] : [{ value: "", label: "Not linked, choose a root cause" }]),
                ...roots.map((r) => ({ value: r.id, label: r.text || "(no text)" })),
              ]}
            />
            <SelectField
              label="Corrective or preventive?"
              help={ACTION_KINDS.find((k) => k.value === a.kind)?.help}
              value={a.kind ?? ""}
              onChange={(v) =>
                change(a.id, {
                  kind: v,
                  ...(v === "corrective" && !rootIds.has(a.causeId) ? { causeId: inv.tree.id } : {}),
                  ...(v === "preventive" && a.causeId === inv.tree.id ? { causeId: roots[0]?.id ?? "" } : {}),
                })
              }
              options={[
                { value: "", label: "Not set" },
                ...ACTION_KINDS.map((k) => ({ value: k.value as ActionKind, label: k.label })),
              ]}
            />
            <SelectField
              label="Category"
              value={a.category ?? ""}
              onChange={(v: ActionCategory) =>
                change(a.id, { category: v, ...(isTaskCategory(v) && !a.task ? { task: blankTask() } : {}) })
              }
              options={[
                { value: "", label: "Not set" },
                ...ACTION_CATEGORIES.map((c) => ({ value: c.value as ActionCategory, label: c.label })),
              ]}
            />
            <div className="hidden lg:block" />
            <TextAreaField
              className="sm:col-span-2 lg:col-span-3"
              label="What will be done?"
              rows={2}
              placeholder="e.g. Add seal replacement to the 6-monthly PM plan"
              value={a.description}
              onChange={(v) => change(a.id, { description: v })}
            />
            {isTaskCategory(a.category) && (
              <fieldset
                className="grid gap-4 rounded-lg border border-slate-300 bg-white p-3 sm:col-span-2 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-4"
                data-testid="task-fields"
              >
                <legend className="px-1 text-sm font-semibold text-slate-800">Task for the maintenance plan</legend>
                <TextAreaField
                  className="sm:col-span-2 lg:col-span-4"
                  label="Task description"
                  help="Written so a planner can load it: what to do, on what, to what standard."
                  rows={2}
                  placeholder="e.g. Check seal flush flow and clean the flush strainer"
                  value={task.description}
                  onChange={(v) => changeTask(a, { description: v })}
                />
                <NumberField
                  label="Do this every"
                  placeholder="e.g. 3"
                  value={task.intervalValue}
                  onChange={(v) => changeTask(a, { intervalValue: v })}
                />
                <SelectField<IntervalUnit>
                  label="Interval unit"
                  value={task.intervalUnit}
                  onChange={(v) => changeTask(a, { intervalUnit: v })}
                  options={INTERVAL_UNITS}
                />
                <TextField
                  label="Craft or trade"
                  placeholder="e.g. Mechanical fitter"
                  value={task.craft}
                  onChange={(v) => changeTask(a, { craft: v })}
                />
                <SelectField<"new" | "changed">
                  label="New task or a change?"
                  value={task.change}
                  onChange={(v) => changeTask(a, { change: v })}
                  options={[
                    { value: "new", label: "A new task" },
                    { value: "changed", label: "A change to an existing task" },
                  ]}
                />
              </fieldset>
            )}
            <TextField label="Owner" help="One named person." placeholder="e.g. Sam Patel" value={a.owner} onChange={(v) => change(a.id, { owner: v })} />
            <TextField label="Due date" type="date" value={a.dueDate} onChange={(v) => change(a.id, { dueDate: v })} />
            <SelectField label="Status" value={a.status} onChange={(v) => change(a.id, { status: v })} options={ACTION_STATUS} />
            <NumberField label="Cost" prefix={cur} value={a.cost} onChange={(v) => change(a.id, { cost: v })} />
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-5">
      <SectionCard
        title="5. Fix it and track every action"
        help="Corrective actions fix this failure; preventive actions stop it happening again. Tap an action to edit it."
        right={
          roots.length > 0 && (
            <button className="btn btn-primary" onClick={() => add()}>
              <Icon name="plus" /> Add action
            </button>
          )
        }
      >
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile label="Total action cost" value={formatMoney(total, cur)} />
          <Tile label="Actions" value={`${done} of ${inv.actions.length} done`} />
          <Tile label="Overdue" value={String(overdue)} bad={overdue > 0} />
          <Tile label="Root causes without action" value={String(unlinkedRoots.length)} bad={unlinkedRoots.length > 0} />
        </dl>

        <section className="mt-3" aria-labelledby="corrective-heading" data-testid="corrective-section">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="corrective-heading" className="text-base font-semibold text-slate-900">
              Corrective actions <span className="text-sm font-normal text-slate-600">Fix this failure and its damage.</span>
            </h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => add(inv.tree.id, "corrective")}>
              <Icon name="plus" size={14} /> Add corrective action
            </button>
          </div>
          {corrective.length === 0 ? (
            <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900" data-testid="no-corrective">
              No corrective action yet. What was done to repair the failure and its damage?
            </p>
          ) : (
            <ul className="mt-1.5 space-y-1">{corrective.map(renderRow)}</ul>
          )}
        </section>

        <section className="mt-4" aria-labelledby="preventive-heading" data-testid="preventive-section">
          <h3 id="preventive-heading" className="text-base font-semibold text-slate-900">
            Preventive actions <span className="text-sm font-normal text-slate-600">Stop it happening again, by root cause.</span>
          </h3>
          {roots.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="Flag a root cause first"
                action={
                  <button className="btn btn-primary" onClick={() => go("cause")}>
                    Go to the cause tree
                  </button>
                }
              >
                Preventive actions are linked to root causes so every fix has a reason. In the cause tree, tick
                “This is a root cause” on the cause you will fix.
              </EmptyState>
            </div>
          ) : (
            <div className="mt-2 space-y-1.5">
              {groups.map((g) => (
                <section
                  key={g.root.id}
                  aria-label={`Actions for root cause: ${g.root.text || "(no text)"}`}
                  data-testid="root-group"
                  className="rounded-xl border border-slate-200 bg-white p-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h4 title={g.root.text} className="min-w-0 flex-1 basis-72 line-clamp-2 text-sm font-semibold leading-snug lg:line-clamp-1 text-slate-900">
                      <span className="mr-2 rounded bg-slate-900 px-1.5 py-px align-middle text-[10px] font-semibold uppercase text-white">
                        Root cause
                      </span>
                      {g.root.text || "(no text)"}
                    </h4>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => add(g.root.id, "preventive")}>
                      <Icon name="plus" size={14} /> Add preventive action
                    </button>
                  </div>
                  {g.actions.length === 0 ? (
                    <p className="mt-2 text-sm text-amber-900">No action yet for this root cause.</p>
                  ) : (
                    <ul className="mt-1 space-y-1">{g.actions.map(renderRow)}</ul>
                  )}
                  <CapaSuggest inv={inv} update={update} root={g.root} />
                </section>
              ))}
            </div>
          )}
        </section>

        {unlinked.length > 0 && (
          <section className="mt-4" aria-labelledby="unlinked-heading" data-testid="unlinked-actions">
            <h3 id="unlinked-heading" className="mb-2 text-base font-semibold text-slate-900">
              Not linked to a root cause{" "}
              <span className="text-sm font-normal text-slate-600">
                {roots.length === 0
                  ? "Flag a root cause in the cause tree, then link these."
                  : "General, or the cause was removed. Open one to link it."}
              </span>
            </h3>
            <ul className="space-y-1">{unlinked.map(renderRow)}</ul>
          </section>
        )}
      </SectionCard>

      <ChallengePanel inv={inv} focus="actions" go={go} />

      <MaintenancePlan inv={inv} />

      <SparesCheck inv={inv} update={update} />
    </div>
  );
}

function Tile({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-100 px-3 py-2">
      <dt className="eyebrow">{label}</dt>
      <dd className={`text-lg font-semibold tabular-nums ${bad ? "text-red-700" : "text-slate-900"}`}>
        {value}
      </dd>
    </div>
  );
}
