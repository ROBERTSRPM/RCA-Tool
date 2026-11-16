"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { calcLoss, formatMoney } from "@/lib/finance";
import { formatDate, todayISO } from "@/lib/dates";
import { getStore } from "@/lib/store";
import { summarise } from "@/lib/status";
import type { Investigation } from "@/lib/types";
import { useAuth } from "../auth/AuthProvider";
import { Icon } from "../icons";
import { StartNewButton } from "../StartNewButton";
import { StatusBadge } from "../StatusBadge";
import { EmptyState, IconButton, useConfirm } from "../ui";

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  let best = "$";
  let n = 0;
  counts.forEach((c, v) => {
    if (c > n) {
      best = v;
      n = c;
    }
  });
  return best;
}

export function Dashboard() {
  const router = useRouter();
  const confirm = useConfirm();
  const { state: auth } = useAuth();
  const where = auth.status === "in" ? "your account" : "this browser";
  const [items, setItems] = useState<Investigation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = todayISO();

  const refresh = useCallback(async () => {
    try {
      setItems(await getStore().list());
    } catch {
      setError(`Could not read saved investigations from ${where}.`);
      setItems([]);
    }
  }, [where]);

  useEffect(() => {
    let live = true;
    getStore()
      .list()
      .then((l) => live && setItems(l))
      .catch((e) => {
        if (!live) return;
        setError(
          e instanceof Error && e.message
            ? e.message
            : `Could not read saved investigations from ${where}.`,
        );
        setItems([]);
      });
    return () => {
      live = false;
    };
  }, [where]);

  const rows = useMemo(
    () =>
      (items ?? []).map((inv) => ({
        inv,
        sum: summarise(inv, today),
        annual: calcLoss(inv.loss).annualLoss,
      })),
    [items, today],
  );

  const currency = mostCommon(rows.map((r) => r.inv.loss.currency || "$"));
  const mixed = rows.some((r) => (r.inv.loss.currency || "$") !== currency);
  const counted = rows.filter((r) => (r.inv.loss.currency || "$") === currency);
  const totals = {
    loss: counted.filter((r) => r.sum.status !== "closed").reduce((s, r) => s + r.annual, 0),
    open: rows.reduce((s, r) => s + r.sum.openActions, 0),
    overdue: rows.reduce((s, r) => s + r.sum.overdueActions, 0),
    saved: counted.reduce((s, r) => s + r.sum.verifiedSaving, 0),
  };

  /** Runs a store change and shows a readable error instead of failing silently. */
  async function attempt(fn: () => Promise<void>) {
    try {
      setError(null);
      await fn();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "That did not work. Try again.");
    }
  }

  async function duplicate(inv: Investigation) {
    await attempt(async () => {
      const copy = await getStore().duplicate(inv.id);
      await refresh();
      if (copy) router.push(`/app/investigations/${copy.id}`);
    });
  }

  async function remove(inv: Investigation) {
    const name = inv.problem.title || "this untitled investigation";
    const ok = await confirm({
      title: "Delete this investigation?",
      message: `"${name}" and all its evidence, causes and actions will be permanently deleted from ${where}.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    await attempt(async () => {
      await getStore().delete(inv.id);
      await refresh();
    });
  }

  async function resetSample() {
    const ok = await confirm({
      title: "Reset the sample data?",
      message:
        "The sample investigation will be restored to its original state. Any changes you made to it are lost. Your own investigations are not touched.",
      confirmLabel: "Reset sample",
    });
    if (!ok) return;
    await attempt(async () => {
      await getStore().resetSample();
      await refresh();
    });
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-page">Investigations</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            Every failure you are working on, what it costs, and what is still open.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary" onClick={resetSample}>
            <Icon name="reset" />
            Reset sample data
          </button>
          <StartNewButton label="New investigation" />
        </div>
      </div>

      <section aria-label="Totals" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Annual loss under investigation"
          value={items ? formatMoney(totals.loss, currency) : "…"}
          hint="Open investigations, per year"
        />
        <Stat
          label="Open actions"
          value={items ? String(totals.open) : "…"}
          hint="Not yet done"
        />
        <Stat
          label="Overdue actions"
          value={items ? String(totals.overdue) : "…"}
          hint="Past their due date"
          tone={totals.overdue > 0 ? "bad" : "neutral"}
        />
        <Stat
          label="Verified annual savings"
          value={items ? formatMoney(totals.saved, currency) : "…"}
          hint="Failure confirmed stopped"
          tone={totals.saved > 0 ? "good" : "neutral"}
        />
      </section>
      {mixed && (
        <p className="mt-2 text-xs text-slate-500">
          Money totals only include investigations measured in {currency}.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <section aria-label="Investigations list" className="mt-8">
        {items === null ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No investigations yet"
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <StartNewButton />
                <button className="btn btn-secondary" onClick={resetSample}>
                  Load the sample investigation
                </button>
              </div>
            }
          >
            Start one when something fails. You will be guided from the first description to
            proof that the fix worked.
          </EmptyState>
        ) : (
          <div className="card overflow-hidden">
            <div className="hidden grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_70px_80px_auto] items-center gap-4 border-b border-slate-200 bg-slate-50 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
              <span>Investigation</span>
              <span>Status</span>
              <span className="text-right">Annual loss</span>
              <span className="text-right">Open</span>
              <span className="text-right">Overdue</span>
              <span className="w-[136px]" />
            </div>
            <ul className="divide-y divide-slate-200">
              {rows.map(({ inv, sum, annual }) => (
                <li
                  key={inv.id}
                  className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_70px_80px_auto] lg:items-center"
                >
                  <div className="col-span-2 min-w-0 lg:col-span-1">
                    <Link
                      href={`/app/investigations/${inv.id}`}
                      className="block text-base font-semibold leading-snug text-slate-900 hover:text-amber-700 hover:underline"
                    >
                      {inv.problem.title || "Untitled investigation"}
                    </Link>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {inv.problem.asset || "No asset yet"}
                      {inv.problem.eventDate && ` · ${formatDate(inv.problem.eventDate)}`}
                    </p>
                    {inv.isSample && (
                      <span className="chip mt-1.5 bg-amber-100 text-amber-900">
                        Illustrative sample
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-slate-400 lg:hidden">
                      Status
                    </p>
                    <StatusBadge status={sum.status} />
                  </div>
                  <div className="lg:text-right">
                    <p className="mb-1 text-xs font-semibold uppercase text-slate-400 lg:hidden">
                      Annual loss
                    </p>
                    <p className="font-semibold tabular-nums text-slate-900">
                      {annual > 0 ? formatMoney(annual, inv.loss.currency) : "Not quantified"}
                    </p>
                  </div>
                  <div className="lg:text-right">
                    <p className="mb-1 text-xs font-semibold uppercase text-slate-400 lg:hidden">
                      Open actions
                    </p>
                    <p className="font-semibold tabular-nums">{sum.openActions}</p>
                  </div>
                  <div className="lg:text-right">
                    <p className="mb-1 text-xs font-semibold uppercase text-slate-400 lg:hidden">
                      Overdue
                    </p>
                    <p
                      className={`font-semibold tabular-nums ${
                        sum.overdueActions > 0 ? "text-red-600" : ""
                      }`}
                    >
                      {sum.overdueActions}
                    </p>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 lg:col-span-1 lg:justify-end">
                    <Link
                      href={`/app/investigations/${inv.id}`}
                      className="btn btn-dark btn-sm flex-1 lg:flex-none"
                    >
                      Open
                    </Link>
                    <IconButton label={`Duplicate ${inv.problem.title || "investigation"}`} icon="copy" onClick={() => duplicate(inv)} />
                    <IconButton label={`Delete ${inv.problem.title || "investigation"}`} icon="trash" danger onClick={() => remove(inv)} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const color =
    tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-600" : "text-slate-900";
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl ${color}`}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
