"use client";

import { formatDate } from "@/lib/dates";
import { formatMoney, totalActionCost } from "@/lib/finance";
import { uid } from "@/lib/id";
import { isOverdue } from "@/lib/status";
import { findNode, rootCauses } from "@/lib/tree";
import type { ActionItem, ActionStatus } from "@/lib/types";
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
  const linked = inv.actions.filter((a) => rootIds.has(a.causeId));
  const unlinked = inv.actions.filter((a) => !rootIds.has(a.causeId));
  const unlinkedRoots = roots.filter((r) => !inv.actions.some((a) => a.causeId === r.id));

  function add(causeId = roots[0]?.id ?? "") {
    const a: ActionItem = {
      id: uid(),
      causeId,
      description: "",
      owner: "",
      dueDate: "",
      status: "open",
      cost: null,
    };
    update((i) => ({ ...i, actions: [...i.actions, a] }));
  }
  const change = (id: string, patch: Partial<ActionItem>) =>
    update((i) => ({
      ...i,
      actions: i.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField
            className="sm:col-span-2 lg:col-span-4"
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
          <TextAreaField
            className="sm:col-span-2 lg:col-span-4"
            label="What will be done?"
            rows={2}
            placeholder="e.g. Add seal replacement to the 6-monthly PM plan"
            value={a.description}
            onChange={(v) => change(a.id, { description: v })}
          />
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
        help="Each action should fix a root cause, have one named owner and a due date. Update the status as work gets done."
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
                <button className="btn btn-primary" onClick={() => add()}>
                  <Icon name="plus" /> Add the first action
                </button>
              }
            >
              What will you change so this cannot happen again? Add one action per fix.
            </EmptyState>
          ) : null}
          {inv.actions.length > 0 && (
            <div className="space-y-6">
              {linked.length > 0 && <ul className="space-y-4">{linked.map(renderCard)}</ul>}
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
                  <ul className="space-y-4">{unlinked.map(renderCard)}</ul>
                </section>
              )}
            </div>
          )}
        </div>
      </SectionCard>
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
