"use client";

import { useState } from "react";
import { formatDate } from "@/lib/dates";
import { maintenancePlan, planAsText, type PlanLine } from "@/lib/capa";
import type { Investigation } from "@/lib/types";
import { Icon } from "../icons";
import { SectionCard } from "../ui";

type PlanInv = Pick<Investigation, "problem" | "tree" | "actions">;

/**
 * "Maintenance plan changes": the new or changed tasks with their intervals,
 * written so it can be handed to a planner. Screen version shown on the
 * Actions step; the Report uses PlanReportTable.
 */
export function MaintenancePlan({ inv }: { inv: PlanInv }) {
  const lines = maintenancePlan(inv);
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const text = planAsText(lines, inv);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      setTimeout(() => setState("idle"), 3000);
    } catch {
      setState("manual");
    }
  }

  return (
    <SectionCard
      title="Maintenance plan changes"
      help="New or changed tasks with their intervals, ready to hand to your planner."
      right={
        lines.length > 0 ? (
          <div className="flex flex-col items-end gap-1">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void copy()}>
              <Icon name="copy" size={16} /> Copy for the planner
            </button>
            {state === "copied" && (
              <span role="status" className="text-sm font-medium text-emerald-800">
                Copied. Paste it into a spreadsheet or an email.
              </span>
            )}
          </div>
        ) : undefined
      }
    >
      <div data-testid="maintenance-plan">
        {lines.length === 0 ? (
          <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
            No maintenance tasks yet. When an action&apos;s category is <strong>Maintenance task</strong> or{" "}
            <strong>Condition monitoring</strong>, it is listed here with its interval, ready to hand to
            your planner.
          </p>
        ) : (
          <>
            <ul className="space-y-3 md:hidden">
              {lines.map((l) => (
                <li key={l.actionId} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="chip bg-slate-900 text-white">{l.change}</span>
                    <span className="chip bg-slate-100 text-slate-700">{l.category}</span>
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">{l.task || "(no task text)"}</p>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-slate-700">
                    <dt className="font-semibold">Interval</dt>
                    <dd className={l.interval ? "" : "font-semibold text-red-700"}>{l.interval || "Not set"}</dd>
                    <dt className="font-semibold">Craft</dt>
                    <dd className={l.craft ? "" : "text-slate-600"}>{l.craft || "Not set"}</dd>
                    <dt className="font-semibold">Prevents</dt>
                    <dd>{l.rootCause || "Not linked"}</dd>
                    <dt className="font-semibold">Owner</dt>
                    <dd>{l.owner || "Unassigned"}</dd>
                    <dt className="font-semibold">Due</dt>
                    <dd>{l.dueDate ? formatDate(l.dueDate) : "None"}</dd>
                  </dl>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <PlanTable lines={lines} />
            </div>
            {state === "manual" && (
              <div className="mt-3">
                <label className="label" htmlFor="plan-text">
                  Select all of this text and copy it
                </label>
                <textarea
                  id="plan-text"
                  readOnly
                  rows={6}
                  className="input font-mono text-xs"
                  value={text}
                  onFocus={(e) => e.currentTarget.select()}
                />
              </div>
            )}
          </>
        )}
      </div>
    </SectionCard>
  );
}

export function PlanTable({ lines }: { lines: PlanLine[] }) {
  return (
    <table className="w-full border-collapse text-left text-xs sm:text-sm">
      <thead>
        <tr className="border-b-2 border-slate-900">
          <th className="py-1 pr-2">Task</th>
          <th className="py-1 pr-2">Interval</th>
          <th className="py-1 pr-2">Craft</th>
          <th className="py-1 pr-2">Prevents</th>
          <th className="py-1 whitespace-nowrap">Owner and due</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l) => (
          <tr key={l.actionId} className="avoid-break border-b border-slate-200 align-top">
            <td className="min-w-[16rem] py-1 pr-2">
              <span className="mr-1 font-semibold">{l.change}:</span>
              {l.task || "(no task text)"}
              <span className="text-slate-600"> ({l.category})</span>
            </td>
            <td className={`py-1 pr-2 whitespace-nowrap ${l.interval ? "" : "font-semibold text-red-700"}`}>
              {l.interval || "Not set"}
            </td>
            <td className="min-w-[8rem] py-1 pr-2">{l.craft || <span className="text-slate-600">Not set</span>}</td>
            <td className="min-w-[12rem] py-1 pr-2 text-slate-700">{l.rootCause || "Not linked"}</td>
            <td className="min-w-[8rem] py-1">
              {l.owner || "Unassigned"}
              <span className="block whitespace-nowrap text-slate-600">{l.dueDate ? formatDate(l.dueDate) : "No date"}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
