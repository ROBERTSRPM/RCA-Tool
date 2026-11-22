"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  actionsToCsv,
  buildRows,
  csvFileName,
  DEFAULT_FILTERS,
  dueText,
  filterChoices,
  filterRows,
  filtersFromParams,
  NO_ASSET,
  NO_OWNER,
  setActionDone,
  STATUS_WORD,
  TYPE_OPTIONS,
  typeLabel,
  type ActionFilters,
  type ActionRow,
  type DueFilter,
  type StatusFilter,
} from "@/lib/action-list";
import { todayISO } from "@/lib/dates";
import { isOverdue } from "@/lib/status";
import { getStore } from "@/lib/store";
import type { Investigation } from "@/lib/types";
import { useAuth } from "../auth/AuthProvider";
import { Icon } from "../icons";
import { EmptyState, SelectField } from "../ui";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "done", label: "Done" },
  { value: "all", label: "All" },
];
const DUE_OPTIONS: { value: DueFilter; label: string }[] = [
  { value: "any", label: "Any date" },
  { value: "overdue", label: "Overdue" },
  { value: "week", label: "Due this week" },
];

const GRID = "lg:grid-cols-[28px_minmax(0,2.6fr)_92px_minmax(0,1.1fr)_96px_96px_minmax(0,1.2fr)_minmax(0,1.6fr)]";

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ActionsPage() {
  const params = useSearchParams();
  const { state: auth } = useAuth();
  const where = auth.status === "in" ? "your account" : "this browser";
  const [invs, setInvs] = useState<Investigation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Set<string>>(() => new Set());
  const [filters, setFilters] = useState<ActionFilters>(() => filtersFromParams((k) => params.get(k)));
  const today = todayISO();

  const [reloadTick, setReloadTick] = useState(0);
  const reload = useCallback(() => setReloadTick((t) => t + 1), []);

  useEffect(() => {
    let live = true;
    getStore()
      .listAll()
      .then((res) => {
        if (live) setInvs(res.items);
      })
      .catch((e) => {
        if (!live) return;
        setError(e instanceof Error && e.message ? e.message : `Could not read saved investigations from ${where}.`);
        setInvs((cur) => cur ?? []);
      });
    return () => {
      live = false;
    };
  }, [where, reloadTick]);

  // A tick made in another tab, or before coming back to this one, shows up here too.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onVisible);
    };
  }, [reload]);

  // Follow the link when the dashboard sends a different filter to a page that is already open.
  const paramString = params.toString();
  const [seenParams, setSeenParams] = useState(paramString);
  if (seenParams !== paramString) {
    setSeenParams(paramString);
    setFilters(filtersFromParams((k) => new URLSearchParams(paramString).get(k)));
  }

  const all = useMemo(() => buildRows(invs ?? []), [invs]);
  const choices = useMemo(() => filterChoices(all), [all]);
  const shown = useMemo(() => filterRows(all, filters, today), [all, filters, today]);
  const set = <K extends keyof ActionFilters>(k: K, v: ActionFilters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const filtered = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);
  const overdueShown = shown.filter((r) => isOverdue(r.action, today)).length;

  async function tick(row: ActionRow, done: boolean) {
    if (busy.has(row.key)) return;
    setBusy((b) => new Set(b).add(row.key));
    setError(null);
    try {
      const saved = await setActionDone(getStore(), row.invId, row.action.id, done);
      setInvs((cur) => (cur ?? []).map((i) => (i.id === saved.id ? saved : i)));
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "That did not save. Try again.");
      reload(); // show what is really saved
    } finally {
      setBusy((b) => {
        const n = new Set(b);
        n.delete(row.key);
        return n;
      });
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-page">Actions</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            Every countermeasure from every investigation, in one list. Tick an action when it is done.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={shown.length === 0}
          onClick={() => download(csvFileName(todayISO()), actionsToCsv(shown))}
        >
          <Icon name="list" /> Export to Excel
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {invs === null ? (
        <div className="mt-6 space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      ) : all.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No actions yet"
            action={
              <Link href="/app" className="btn btn-primary">
                Go to investigations
              </Link>
            }
          >
            Actions are the countermeasures you plan in an investigation. Add them in the Actions step and they
            will appear here.
          </EmptyState>
        </div>
      ) : (
        <>
          <section aria-label="Filters" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <SelectField label="Status" value={filters.status} onChange={(v) => set("status", v)} options={STATUS_OPTIONS} />
            <SelectField label="Due" value={filters.due} onChange={(v) => set("due", v)} options={DUE_OPTIONS} />
            <SelectField
              label="Type"
              value={filters.type}
              onChange={(v) => set("type", v)}
              options={TYPE_OPTIONS}
            />
            <SelectField
              label="Owner"
              value={filters.owner}
              onChange={(v) => set("owner", v)}
              options={[
                { value: "", label: "All owners" },
                ...choices.owners.map((o) => ({ value: o, label: o })),
                ...(choices.blankOwner ? [{ value: NO_OWNER, label: "No owner" }] : []),
              ]}
            />
            <SelectField
              label="Asset"
              value={filters.asset}
              onChange={(v) => set("asset", v)}
              options={[
                { value: "", label: "All assets" },
                ...choices.assets.map((o) => ({ value: o, label: o })),
                ...(choices.blankAsset ? [{ value: NO_ASSET, label: "No asset" }] : []),
              ]}
            />
          </section>

          <p className="mt-4 flex flex-wrap items-center gap-x-3 text-sm text-slate-600" aria-live="polite">
            <span data-testid="actions-count">
              {shown.length} {shown.length === 1 ? "action" : "actions"}
            </span>
            {overdueShown > 0 && <span className="font-semibold text-red-700">{overdueShown} overdue</span>}
            {filtered && (
              <button type="button" className="font-medium text-accent hover:underline" onClick={() => setFilters(DEFAULT_FILTERS)}>
                Reset filters
              </button>
            )}
          </p>

          {shown.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title={filtered ? "No actions match these filters" : "No open actions"}
                action={
                  filtered ? (
                    <button type="button" className="btn btn-secondary" onClick={() => setFilters(DEFAULT_FILTERS)}>
                      Reset filters
                    </button>
                  ) : (
                    <button type="button" className="btn btn-secondary" onClick={() => set("status", "all")}>
                      Show all actions
                    </button>
                  )
                }
              >
                {filtered
                  ? "Change a filter to see more."
                  : "Every action is done. Well done. Show all actions to see them."}
              </EmptyState>
            </div>
          ) : (
            <div className="card mt-3 overflow-hidden">
              <div className={`hidden items-center gap-4 border-b border-slate-200 bg-slate-50 px-5 py-2.5 eyebrow lg:grid ${GRID}`}>
                <span aria-hidden="true" />
                <span>Action</span>
                <span>Type</span>
                <span>Owner</span>
                <span>Due date</span>
                <span>Status</span>
                <span>Asset</span>
                <span>Investigation</span>
              </div>
              <ul className="divide-y divide-slate-200" data-testid="actions-list">
                {shown.map((r) => (
                  <Row key={r.key} row={r} today={today} busy={busy.has(r.key)} onTick={tick} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function Row({
  row,
  today,
  busy,
  onTick,
}: {
  row: ActionRow;
  today: string;
  busy: boolean;
  onTick: (row: ActionRow, done: boolean) => void;
}) {
  const a = row.action;
  const late = isOverdue(a, today);
  const done = a.status === "done";
  const label = a.description.trim() || "Untitled action";
  return (
    <li
      data-testid="action-row"
      data-overdue={late ? "true" : undefined}
      className={`grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 gap-y-2 px-4 py-4 sm:px-5 lg:items-center lg:gap-x-4 ${GRID} ${
        late ? "bg-red-50/70" : ""
      }`}
    >
      <label className="flex h-11 w-7 cursor-pointer items-start pt-1 lg:h-auto lg:items-center lg:pt-0">
        <input
          type="checkbox"
          className="h-5 w-5 accent-emerald-600"
          checked={done}
          disabled={busy}
          aria-label={`${done ? "Mark not done" : "Mark done"}: ${label}`}
          onChange={(e) => onTick(row, e.target.checked)}
        />
      </label>
      <p className={`min-w-0 text-sm font-semibold leading-snug ${done ? "text-slate-500 line-through" : "text-slate-900"}`}>
        {a.description.trim() || <span className="font-normal text-slate-600">(no description yet)</span>}
      </p>
      <div className="col-span-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm lg:contents">
        <Cell label="Type">
          <span className={`chip ${a.kind ? "bg-slate-200 text-slate-800" : "bg-amber-100 text-amber-900"}`}>{typeLabel(a.kind)}</span>
        </Cell>
        <Cell label="Owner">
          <span className={`block truncate ${a.owner.trim() ? "" : "text-slate-600"}`} title={a.owner}>
            {a.owner.trim() || "No owner"}
          </span>
        </Cell>
        <Cell label="Due date">
          <span className={late ? "font-semibold text-red-700" : a.dueDate ? "" : "text-slate-600"}>
            {dueText(a)}
            {late && <span className="chip ml-1.5 bg-red-600 text-white">Overdue</span>}
          </span>
        </Cell>
        <Cell label="Status">
          <span
            className={`chip ${
              done ? "bg-emerald-100 text-emerald-800" : a.status === "in_progress" ? "bg-sky-100 text-sky-900" : "bg-slate-200 text-slate-800"
            }`}
          >
            {STATUS_WORD[a.status]}
          </span>
        </Cell>
        <Cell label="Asset">
          <span className={`block truncate ${row.asset ? "" : "text-slate-600"}`} title={row.asset}>
            {row.asset || "No asset"}
          </span>
        </Cell>
        <Cell label="Investigation">
          <Link
            href={`/app/investigations/${row.invId}#actions`}
            className="block truncate font-medium text-accent hover:underline"
            title={row.invTitle}
          >
            {row.invTitle}
          </Link>
        </Cell>
      </div>
    </li>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-0.5 eyebrow lg:hidden">{label}</p>
      {children}
    </div>
  );
}
