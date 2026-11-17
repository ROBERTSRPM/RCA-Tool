"use client";

import { blankTask, groupByRootCause, isTaskCategory } from "@/lib/capa";
import { formatDate } from "@/lib/dates";
import { formatMoney, totalActionCost } from "@/lib/finance";
import { uid } from "@/lib/id";
import { ACTION_CATEGORIES, ACTION_KINDS, INTERVAL_UNITS } from "@/lib/options";
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
  const { groups, unlinked } = groupByRootCause(inv);

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

  const renderCard = (a: ActionItem) => {
    const idx = inv.actions.indexOf(a);
    const late = isOverdue(a);
    const cause = findNode(inv.tree, a.causeId);
    const stale = cause !== null && !cause.isRootCause;
    const isLinked = rootIds.has(a.causeId);
    const task = a.task ?? blankTask();
    return (
      <li
        key={a.id}
        className={`rounded-xl border p-4 ${
          late ? "border-red-300 bg-red-50/60" : "border-slate-200 bg-slate-50/50"
        }`}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-700">
            Action {idx + 1}
            {late && (
              <span className="chip bg-red-600 text-white">
                Overdue since {formatDate(a.dueDate)}
              </span>
            )}
            {a.status === "done" && (
              <span className="chip bg-emerald-100 text-emerald-800">Done</span>
            )}
          </p>
          <button
            className="btn btn-danger btn-sm"
            aria-label={`Delete action ${idx + 1}`}
            onClick={() => remove(a)}
          >
            <Icon name="trash" size={16} /> Delete
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            className="sm:col-span-2"
            label={isLinked ? "Fixes this root cause" : "Re-link to a root cause"}
            help={
              isLinked
                ? undefined
                : stale
                  ? `This action was linked to "${cause.text || "(no text)"}", which is no longer flagged as a root cause.`
                  : roots.length === 0
                    ? "There is no root cause to link to yet. Flag one in the cause tree."
                    : "Pick the root cause this action addresses."
            }
            value={isLinked ? a.causeId : ""}
            onChange={(v) => change(a.id, { causeId: v })}
            options={[
              { value: "", label: "Not linked, choose a root cause" },
              ...roots.map((r) => ({
                value: r.id,
                label: r.text || "(no text)",
              })),
            ]}
          />
          <SelectField
            label="Corrective or preventive?"
            help={ACTION_KINDS.find((k) => k.value === a.kind)?.help}
            value={a.kind ?? ""}
            onChange={(v) => change(a.id, { kind: v })}
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
          <TextAreaField
            className="sm:col-span-2"
            label="What will be done?"
            rows={2}
            placeholder="e.g. Add seal replacement to the 6-monthly PM plan"
            value={a.description}
            onChange={(v) => change(a.id, { description: v })}
          />
          {isTaskCategory(a.category) && (
            <fieldset
              className="grid gap-4 rounded-lg border border-slate-300 bg-white p-3 sm:col-span-2 sm:grid-cols-2"
              data-testid="task-fields"
            >
              <legend className="px-1 text-sm font-bold text-slate-800">
                Task for the maintenance plan
              </legend>
              <TextAreaField
                className="sm:col-span-2"
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
          <TextField
            label="Owner"
            help="One named person."
            placeholder="e.g. Sam Patel"
            value={a.owner}
            onChange={(v) => change(a.id, { owner: v })}
          />
          <TextField
            label="Due date"
            type="date"
            value={a.dueDate}
            onChange={(v) => change(a.id, { dueDate: v })}
          />
          <SelectField
            label="Status"
            value={a.status}
            onChange={(v) => change(a.id, { status: v })}
            options={ACTION_STATUS}
          />
          <NumberField
            label="Cost"
            prefix={cur}
            value={a.cost}
            onChange={(v) => change(a.id, { cost: v })}
          />
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-5">
      <SectionCard
        title="5. Fix it and track every action"
        help="Each root cause needs two kinds of action: corrective (fix this failure and its damage) and preventive (stop it happening again). Give each one a named owner and a due date."
        right={
          roots.length > 0 && (
            <button className="btn btn-primary" onClick={() => add()}>
              <Icon name="plus" /> Add action
            </button>
          )
        }
      >
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Total action cost" value={formatMoney(total, cur)} />
          <Tile label="Actions" value={`${done} of ${inv.actions.length} done`} />
          <Tile label="Overdue" value={String(overdue)} bad={overdue > 0} />
          <Tile label="Root causes without action" value={String(unlinkedRoots.length)} bad={unlinkedRoots.length > 0} />
        </dl>

        {unlinkedRoots.length > 0 && inv.actions.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">These root causes still need an action:</p>
            <ul className="mt-2 space-y-2">
              {unlinkedRoots.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 basis-60">{r.text || "(no text)"}</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => add(r.id)}>
                    <Icon name="plus" size={14} /> Add action
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5">
          {inv.actions.length === 0 && roots.length === 0 ? (
            <EmptyState
              title="Flag a root cause first"
              action={
                <button className="btn btn-primary" onClick={() => go("cause")}>
                  Go to the cause tree
                </button>
              }
            >
              Actions are linked to root causes so every fix has a reason. In the cause tree, tick
              “This is a root cause” on the cause you will fix.
            </EmptyState>
          ) : inv.actions.length === 0 ? (
            <EmptyState
              title="No actions yet"
              action={
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button className="btn btn-primary" onClick={() => add()}>
                    <Icon name="plus" /> Add the first action
                  </button>
                  <button className="btn btn-secondary" onClick={() => add(roots[0].id, "corrective")}>
                    Add corrective action
                  </button>
                  <button className="btn btn-secondary" onClick={() => add(roots[0].id, "preventive")}>
                    Add preventive action
                  </button>
                </div>
              }
            >
              What will you change so this cannot happen again? Add one action per fix.
            </EmptyState>
          ) : null}
          {inv.actions.length > 0 && (
            <div className="space-y-6">
              {groups
                .filter((g) => g.corrective.length + g.preventive.length + g.unclassified.length > 0)
                .map((g) => (
                  <section
                    key={g.root.id}
                    aria-label={`Actions for root cause: ${g.root.text || "(no text)"}`}
                    data-testid="root-group"
                    className="rounded-xl border-2 border-slate-200 p-3 sm:p-4"
                  >
                    <h3 className="text-base font-bold leading-snug text-slate-900">
                      <span className="mr-2 rounded bg-slate-900 px-1.5 py-px align-middle text-[10px] font-bold uppercase text-white">
                        Root cause
                      </span>
                      {g.root.text || "(no text)"}
                    </h3>
                    <div className="mt-3 grid gap-4 lg:grid-cols-2">
                      <KindColumn
                        title="Corrective"
                        help="Fix this failure and its damage."
                        addLabel="Add corrective action"
                        onAdd={() => add(g.root.id, "corrective")}
                        empty={g.preventive.length > 0 ? "No corrective action. Is the damage fixed?" : undefined}
                      >
                        {g.corrective.map(renderCard)}
                      </KindColumn>
                      <KindColumn
                        title="Preventive"
                        help="Stop it happening again."
                        addLabel="Add preventive action"
                        onAdd={() => add(g.root.id, "preventive")}
                        empty={g.corrective.length > 0 ? "No preventive action yet. Fixing the damage alone will not stop it coming back." : undefined}
                      >
                        {g.preventive.map(renderCard)}
                      </KindColumn>
                    </div>
                    {g.unclassified.length > 0 && (
                      <div className="mt-4" data-testid="unclassified-actions">
                        <p className="text-sm font-bold text-slate-800">Not classified yet</p>
                        <p className="mb-2 text-sm text-slate-600">
                          Choose corrective or preventive on each action and it moves to the right column.
                        </p>
                        <ul className="grid gap-4 lg:grid-cols-2">{g.unclassified.map(renderCard)}</ul>
                      </div>
                    )}
                  </section>
                ))}
              {unlinked.length > 0 && (
                <section aria-labelledby="unlinked-heading" data-testid="unlinked-actions">
                  <h3 id="unlinked-heading" className="text-base font-bold text-slate-900">
                    Not linked to a root cause
                  </h3>
                  <p className="mb-3 mt-0.5 text-sm text-slate-600">
                    {roots.length === 0
                      ? "No cause is flagged as a root cause right now, so these actions have nothing to link to. Flag a root cause in the cause tree, then re-link them here, or delete them."
                      : "These actions are not tied to a current root cause: the cause may have been deleted or un-flagged, or the action was left general. They still count in the totals. Pick a root cause below to re-link each one."}
                  </p>
                  <ul className="grid gap-4 lg:grid-cols-2">{unlinked.map(renderCard)}</ul>
                </section>
              )}
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Maintenance plan changes"
        help="Every new or changed maintenance task and condition monitoring task, with its interval. Hand this to your planner to load into the maintenance system."
      >
        <MaintenancePlan inv={inv} />
      </SectionCard>

      <SparesCheck inv={inv} update={update} />
    </div>
  );
}

function KindColumn({
  title,
  help,
  addLabel,
  onAdd,
  empty,
  children,
}: {
  title: string;
  help: string;
  addLabel: string;
  onAdd: () => void;
  empty?: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children.length : children ? 1 : 0;
  return (
    <div className="min-w-0 rounded-lg bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-slate-900">{title}</h4>
          <p className="text-sm text-slate-600">{help}</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onAdd}>
          <Icon name="plus" size={14} /> {addLabel}
        </button>
      </div>
      {items === 0 && empty && (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">{empty}</p>
      )}
      {items > 0 && <ul className="mt-3 space-y-4">{children}</ul>}
    </div>
  );
}

function Tile({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-100 p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-lg font-bold tabular-nums ${bad ? "text-red-600" : "text-slate-900"}`}>
        {value}
      </dd>
    </div>
  );
}
