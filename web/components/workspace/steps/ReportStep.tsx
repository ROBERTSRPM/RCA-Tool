"use client";

import { formatDate, todayISO } from "@/lib/dates";
import {
  calcLoss,
  calcVerification,
  formatMoney,
  formatMonths,
  formatNumber,
  isVerifiedClosed,
  wholeShares,
} from "@/lib/finance";
import { OTHER_COST_CATEGORIES } from "@/lib/types";
import { safeImage } from "@/lib/normalize";
import { failureText } from "@/lib/investigation";
import { SAMPLE_NOTE } from "@/lib/sample";
import { deriveStatus, isOverdue, STATUS_LABELS } from "@/lib/status";
import { CATEGORY_LABEL, findNode, flatten, rootCauses, STATUS_LABEL } from "@/lib/tree";
import { criticalSpareFlag, maintenancePlan, SPARES_FLAG_TEXT } from "@/lib/capa";
import { categoryLabel, criticalityLabel, DETERIORATION_OPTIONS, kindLabel } from "@/lib/options";
import { useState } from "react";
import { Icon } from "../../icons";
import { DraftReport } from "../ai/DraftReport";
import { PlanTable } from "../MaintenancePlan";
import { RolloutReport } from "../RolloutPanel";
import { evidenceTypeLabel } from "./EvidenceStep";
import { ACTION_STATUS } from "./ActionsStep";
import type { StepProps } from "../types";

const RECURRENCE = {
  unreviewed: "Not yet reviewed",
  no: "No, it has not recurred",
  yes: "Yes, it happened again",
} as const;

export function ReportStep({ inv }: StepProps) {
  // While an AI draft is being printed, the standard report is left out of the printout.
  const [draftPrinting, setDraftPrinting] = useState(false);
  const cur = inv.loss.currency || "$";
  const unit = inv.loss.unitName || "units";
  const c = calcLoss(inv.loss);
  const v = calcVerification(inv);
  const verified = isVerifiedClosed(inv);
  const shares = wholeShares(inv.loss);
  const others = (inv.loss.otherCosts ?? []).filter((o) => (o.amount ?? 0) > 0);
  const roots = rootCauses(inv.tree);
  const evNo = new Map(inv.evidence.map((e, i) => [e.id, i + 1]));
  const outline = flatten(inv.tree);
  const status = STATUS_LABELS[deriveStatus(inv)];
  const p = inv.problem;
  const plan = maintenancePlan(inv);
  const spares = inv.spares;
  const hasSpares = !!spares && (spares.needed !== "" || spares.coverage.trim() !== "");
  const assetFacts: [string, string][] = [
    ["Asset tag", (p.assetTag ?? "").trim()],
    ["Asset type", (p.assetType ?? "").trim()],
    ["Make and model", (p.makeModel ?? "").trim()],
    ["Duty or service", (p.duty ?? "").trim()],
    ["Criticality", criticalityLabel(p.criticality)],
    ["Failure mode", (p.failureMode ?? "").trim()],
  ];
  const showAssetFacts = assetFacts.some(([, v]) => v);

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">7. Report</h2>
          <p className="text-sm text-slate-500">
            A one-page summary for your manager or the next shift. Use the button to print it or
            save it as a PDF.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Icon name="print" /> Print / Save as PDF
        </button>
      </div>

      <DraftReport inv={inv} onPrintingChange={setDraftPrinting} />

      <article className={`${draftPrinting ? "no-print " : ""}print-sheet card p-5 text-sm leading-relaxed text-slate-800 sm:p-8`}>
        <header className="avoid-break border-b-2 border-slate-900 pb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Root cause analysis report
          </p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight text-slate-900">
            {p.title || "Untitled investigation"}
          </h1>
          <p className="mt-1 text-slate-600">
            {[p.asset, p.site].filter(Boolean).join(" · ") || "No asset recorded"}
            {p.eventDate && ` · Event on ${formatDate(p.eventDate)}`}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Status: <strong>{status}</strong> · Generated {formatDate(todayISO())}
          </p>
          {inv.isSample && (
            <p className="mt-2 rounded border border-amber-400 bg-amber-50 px-2 py-1 text-xs text-amber-900">
              {SAMPLE_NOTE}
            </p>
          )}
        </header>

        <Section title="Headline">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Kpi label="Annual loss" value={formatMoney(c.annualLoss, cur)} />
            <Kpi
              label={verified ? "Annual saving (verified)" : "Expected saving (not yet verified)"}
              value={v.hasAfterFigure ? formatMoney(v.annualSaving, cur) : "Not yet"}
            />
            <Kpi label="Action cost" value={formatMoney(v.totalActionCost, cur)} />
            <Kpi label="Payback" value={formatMonths(v.paybackMonths)} />
          </div>
        </Section>

        <Section title="1. Problem">
          <Facts
            rows={[
              ["What happened", p.whatHappened],
              ["Where", p.where],
              ["When", p.when],
              ["Impact", p.impact],
            ]}
          />
        </Section>

        {showAssetFacts && (
          <Section title="Asset">
            <Facts rows={assetFacts.filter(([, v]) => v)} />
          </Section>
        )}

        <Section title="2. Loss">
          <p>
            Each event stops production for {formatNumber(inv.loss.downtimeHours ?? 0, 2)} h at{" "}
            {formatNumber(inv.loss.ratePerHour ?? 0, 2)} {unit}/h, so {formatNumber(c.lostUnitsPerEvent, 1)}{" "}
            {unit} are not produced. Of that, {shares.lost}% is lost for good, {shares.madeUp}% is
            made up later and {shares.buffer}% is covered by buffer stock.
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="py-1 pr-2">Cost</th>
                  <th className="py-1 pr-2 text-right">Per event</th>
                  <th className="py-1 text-right">Per year ({formatNumber(inv.loss.eventsPerYear ?? 0, 2)} events)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="py-1 pr-2">Cash: repair</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{formatMoney(c.repairPerEvent, cur)}</td>
                  <td className="py-1 text-right tabular-nums">
                    {formatMoney(c.repairPerEvent * (inv.loss.eventsPerYear ?? 0), cur)}
                  </td>
                </tr>
                {c.recoveryPerEvent > 0 && (
                  <tr className="border-b border-slate-200">
                    <td className="py-1 pr-2">
                      Cash: recovery of production made up later
                      {inv.loss.recoveryNote ? ` (${inv.loss.recoveryNote})` : ""}
                    </td>
                    <td className="py-1 pr-2 text-right tabular-nums">{formatMoney(c.recoveryPerEvent, cur)}</td>
                    <td className="py-1 text-right tabular-nums">
                      {formatMoney(c.recoveryPerEvent * (inv.loss.eventsPerYear ?? 0), cur)}
                    </td>
                  </tr>
                )}
                {others.map((o) => (
                  <tr key={o.id} className="border-b border-slate-200">
                    <td className="py-1 pr-2">
                      Cash: {OTHER_COST_CATEGORIES.find((k) => k.value === o.category)?.label ?? "Other"}
                      {o.description ? ` (${o.description})` : ""}
                    </td>
                    <td className="py-1 pr-2 text-right tabular-nums">{formatMoney(o.amount ?? 0, cur)}</td>
                    <td className="py-1 text-right tabular-nums">
                      {formatMoney((o.amount ?? 0) * (inv.loss.eventsPerYear ?? 0), cur)}
                    </td>
                  </tr>
                ))}
                {c.bufferHoldingPerYear > 0 && (
                  <tr className="border-b border-slate-200">
                    <td className="py-1 pr-2">Cash: buffer stock holding (yearly)</td>
                    <td className="py-1 pr-2 text-right">n/a</td>
                    <td className="py-1 text-right tabular-nums">{formatMoney(c.bufferHoldingPerYear, cur)}</td>
                  </tr>
                )}
                <tr className="border-b border-slate-200 font-semibold">
                  <td className="py-1 pr-2">Cash costs</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{formatMoney(c.cashPerEvent, cur)}</td>
                  <td className="py-1 text-right tabular-nums">{formatMoney(c.annualCash, cur)}</td>
                </tr>
                <tr className="border-b border-slate-200 font-semibold">
                  <td className="py-1 pr-2">
                    Opportunity loss ({formatNumber(c.unitsLostForGoodPerEvent, 1)} {unit} lost for good × {cur}
                    {formatNumber(inv.loss.marginPerUnit ?? 0, 2)})
                  </td>
                  <td className="py-1 pr-2 text-right tabular-nums">{formatMoney(c.opportunityPerEvent, cur)}</td>
                  <td className="py-1 text-right tabular-nums">{formatMoney(c.annualOpportunity, cur)}</td>
                </tr>
                <tr className="border-b-2 border-slate-900 font-semibold">
                  <td className="py-1 pr-2">Total</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{formatMoney(c.costPerEvent, cur)}</td>
                  <td className="py-1 text-right tabular-nums">{formatMoney(c.annualLoss, cur)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-slate-600">
            Per year: {formatNumber(c.hoursLostPerYear, 1)} hours lost and {formatNumber(c.unitsLostPerYear, 1)}{" "}
            {unit} not produced ({formatNumber(c.unitsLostForGoodPerYear, 1)} {unit} lost for good).{" "}
            <strong>{formatMoney(c.annualLoss, cur)} per year</strong> in total.
          </p>
        </Section>

        <Section title="3. Evidence">
          {inv.evidence.length === 0 ? (
            <Muted>No evidence recorded.</Muted>
          ) : (
            <ol className="space-y-1.5">
              {inv.evidence.map((e, i) => (
                <li key={e.id} className="avoid-break flex gap-2">
                  <span className="w-7 flex-none font-semibold">E{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <strong>{e.title || "Untitled"}</strong>{" "}
                    <span className="text-slate-500">
                      ({evidenceTypeLabel(e.type)}
                      {e.date && `, ${formatDate(e.date)}`})
                    </span>
                    {e.note && <> {e.note}</>}
                    {safeImage(e.image) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={safeImage(e.image) ?? undefined} alt="" className="mt-1 max-h-32 rounded border border-slate-200" />
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section title="4. Cause tree">
          <ul className="space-y-0.5">
            {outline.map(({ node, depth }) => {
              const top = depth === 0;
              return (
                <li
                  key={node.id}
                  className="avoid-break flex gap-1.5"
                  style={{ paddingLeft: `${depth * 18}px` }}
                >
                  <span className="w-4 flex-none text-center font-semibold">
                    {top ? "▣" : node.status === "verified" ? "✓" : node.status === "ruled_out" ? "✕" : "?"}
                  </span>
                  <span
                    className={`min-w-0 flex-1 ${
                      node.status === "ruled_out" && !top ? "text-slate-500 line-through" : ""
                    } ${node.isRootCause ? "font-semibold text-slate-900" : ""}`}
                  >
                    {top ? failureText(inv) || "Failure event" : node.text || "(no text)"}
                    {!top && (
                      <span className="font-normal not-italic text-slate-500 no-underline">
                        {" "}
                        [{CATEGORY_LABEL[node.category]}
                        {node.status !== "verified" && `, ${STATUS_LABEL[node.status].toLowerCase()}`}
                        {node.deterioration &&
                          `, ${DETERIORATION_OPTIONS.find((d) => d.value === node.deterioration)?.label.toLowerCase()} deterioration`}
                        {node.evidenceIds.length > 0 &&
                          `, evidence ${node.evidenceIds.map((id) => `E${evNo.get(id) ?? "?"}`).join(" ")}`}
                        ]
                      </span>
                    )}
                    {node.isRootCause && !top && (
                      <span className="ml-1 rounded bg-slate-900 px-1.5 py-px text-[10px] font-semibold uppercase text-white">
                        Root cause
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            ✓ verified · ? hypothesis · ✕ ruled out
          </p>
        </Section>

        <Section title="Root causes">
          {roots.length === 0 ? (
            <Muted>No root cause has been flagged.</Muted>
          ) : (
            <ol className="list-decimal space-y-0.5 pl-5">
              {roots.map((r) => (
                <li key={r.id} className="avoid-break">
                  {r.text || "(no text)"}
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section title="5. Actions">
          {inv.actions.length === 0 ? (
            <Muted>No actions recorded.</Muted>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-900">
                    <th className="py-1 pr-2">Action</th>
                    <th className="py-1 pr-2">Type</th>
                    <th className="py-1 pr-2">Fixes</th>
                    <th className="py-1 pr-2">Owner</th>
                    <th className="py-1 pr-2">Due</th>
                    <th className="py-1 pr-2 whitespace-nowrap">Status</th>
                    <th className="py-1 text-right whitespace-nowrap">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.actions.map((a) => {
                    const cause = findNode(inv.tree, a.causeId);
                    return (
                      <tr key={a.id} className="avoid-break border-b border-slate-200 align-top">
                        <td className="py-1 pr-2">{a.description || "(no description)"}</td>
                        <td className="py-1 pr-2 text-slate-700">
                          {[kindLabel(a.kind), categoryLabel(a.category)].filter(Boolean).join(": ") || "Not set"}
                        </td>
                        <td className="py-1 pr-2 text-slate-600">
                          {cause ? cause.text.slice(0, 60) + (cause.text.length > 60 ? "…" : "") : "Not linked"}
                        </td>
                        <td className="py-1 pr-2">{a.owner || "Unassigned"}</td>
                        <td className={`py-1 pr-2 whitespace-nowrap ${isOverdue(a) ? "font-semibold text-red-700" : ""}`}>
                          {a.dueDate ? formatDate(a.dueDate) : "None"}
                          {isOverdue(a) && " (overdue)"}
                        </td>
                        <td className="py-1 pr-2 whitespace-nowrap">
                          {ACTION_STATUS.find((s) => s.value === a.status)?.label}
                        </td>
                        <td className="py-1 text-right tabular-nums whitespace-nowrap">{formatMoney(a.cost ?? 0, cur)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6} className="pt-1 pr-2 text-right font-semibold">
                      Total
                    </td>
                    <td className="pt-1 text-right font-semibold tabular-nums">
                      {formatMoney(v.totalActionCost, cur)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Section>

        <Section title="Maintenance plan changes">
          {plan.length === 0 ? (
            <Muted>No new or changed maintenance tasks.</Muted>
          ) : (
            <>
              <p className="mb-1 text-slate-600">
                For the planner: load these into the maintenance system
                {p.assetTag ? ` against ${p.assetTag}` : ""}.
              </p>
              <div className="overflow-x-auto">
                <PlanTable lines={plan} />
              </div>
            </>
          )}
        </Section>

        {hasSpares && spares && (
          <Section title="Spares check">
            <Facts
              rows={[
                ["Spare needed?", spares.needed === "yes" ? "Yes" : spares.needed === "no" ? "No" : ""],
                ["In stock?", spares.needed === "yes" ? (spares.inStock === "yes" ? "Yes" : spares.inStock === "no" ? "No" : "") : ""],
                ["Supplier lead time", spares.leadTimeDays === null ? "" : `${spares.leadTimeDays} days`],
                ["Gap covered by", spares.coverage],
              ]}
            />
            {criticalSpareFlag(spares) && (
              <p className="mt-1 font-semibold text-amber-900">Flag: {SPARES_FLAG_TEXT}.</p>
            )}
          </Section>
        )}

        <Section title="6. Verification and savings">
          <Facts
            rows={[
              ["Review date", inv.verification.reviewDate ? formatDate(inv.verification.reviewDate) : ""],
              ["Recurred since actions?", RECURRENCE[inv.verification.recurred]],
              [
                "Events per year after",
                inv.verification.eventsPerYearAfter === null ? "" : String(inv.verification.eventsPerYearAfter),
              ],
              ["Findings", inv.verification.notes],
            ]}
          />
          {v.hasAfterFigure ? (
            <p className="mt-2">
              Annual loss falls from <strong>{formatMoney(v.annualLossBefore, cur)}</strong> to{" "}
              <strong>{formatMoney(v.annualLossAfter, cur)}</strong>: {verified ? "a saving" : "an expected saving"} of{" "}
              <strong>{formatMoney(v.annualSaving, cur)} per year</strong> (cash{" "}
              {formatMoney(v.cashSaving, cur)}, opportunity {formatMoney(v.opportunitySaving, cur)}) for an
              action cost of {formatMoney(v.totalActionCost, cur)}, paid back in{" "}
              {formatMonths(v.paybackMonths)}.
              {!verified &&
                " This saving is not yet verified: it counts only when all actions are done and the review, with a date, says the failure has not recurred."}
            </p>
          ) : (
            <Muted>Savings cannot be calculated until the expected events per year after the fix are entered.</Muted>
          )}
        </Section>
        <Section title="Rollout to similar assets">
          <RolloutReport inv={inv} />
        </Section>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <h2 className="mb-1.5 border-b border-slate-300 pb-0.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-slate-500">{children}</p>;
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="avoid-break rounded border border-slate-300 p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="space-y-1">
      {rows.map(([k, val]) => (
        <div key={k} className="avoid-break flex gap-2">
          <dt className="w-32 flex-none font-semibold text-slate-700">{k}</dt>
          <dd className="min-w-0 flex-1">{val || <span className="text-slate-500">Not recorded</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
