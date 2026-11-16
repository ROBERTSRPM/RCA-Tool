"use client";

import { formatDate, todayISO } from "@/lib/dates";
import {
  calcLoss,
  calcVerification,
  formatMoney,
  formatMonths,
  formatNumber,
} from "@/lib/finance";
import { failureText } from "@/lib/investigation";
import { SAMPLE_NOTE } from "@/lib/sample";
import { deriveStatus, isOverdue, STATUS_LABELS } from "@/lib/status";
import { CATEGORY_LABEL, findNode, flatten, rootCauses, STATUS_LABEL } from "@/lib/tree";
import { Icon } from "../../icons";
import { evidenceTypeLabel } from "./EvidenceStep";
import { ACTION_STATUS } from "./ActionsStep";
import type { StepProps } from "../types";

const RECURRENCE = {
  unreviewed: "Not yet reviewed",
  no: "No, it has not recurred",
  yes: "Yes, it happened again",
} as const;

export function ReportStep({ inv }: StepProps) {
  const cur = inv.loss.currency || "$";
  const unit = inv.loss.unitName || "units";
  const c = calcLoss(inv.loss);
  const v = calcVerification(inv);
  const roots = rootCauses(inv.tree);
  const evNo = new Map(inv.evidence.map((e, i) => [e.id, i + 1]));
  const outline = flatten(inv.tree);
  const status = STATUS_LABELS[deriveStatus(inv)];
  const p = inv.problem;

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">7. Report</h2>
          <p className="text-sm text-slate-500">
            A one-page summary for your manager or the next shift. Use the button to print it or
            save it as a PDF.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Icon name="print" /> Print / Save as PDF
        </button>
      </div>

      <article className="print-sheet card p-5 text-sm leading-relaxed text-slate-800 sm:p-8">
        <header className="avoid-break border-b-2 border-slate-900 pb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Root cause analysis report
          </p>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight text-slate-900">
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
              label="Annual saving"
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

        <Section title="2. Loss">
          <p>
            ({formatNumber(inv.loss.downtimeHours ?? 0, 2)} h × {formatNumber(inv.loss.ratePerHour ?? 0, 2)}{" "}
            {unit}/h × {cur}
            {formatNumber(inv.loss.marginPerUnit ?? 0, 2)} + {formatMoney(inv.loss.repairCost ?? 0, cur)} repair) ×{" "}
            {formatNumber(inv.loss.eventsPerYear ?? 0, 2)} events per year ={" "}
            <strong>{formatMoney(c.annualLoss, cur)} per year</strong>.
          </p>
          <p className="mt-1 text-slate-600">
            Each event loses {formatNumber(c.lostUnitsPerEvent, 1)} {unit} and costs{" "}
            {formatMoney(c.costPerEvent, cur)}.
          </p>
        </Section>

        <Section title="3. Evidence">
          {inv.evidence.length === 0 ? (
            <Muted>No evidence recorded.</Muted>
          ) : (
            <ol className="space-y-1.5">
              {inv.evidence.map((e, i) => (
                <li key={e.id} className="avoid-break flex gap-2">
                  <span className="w-7 flex-none font-bold">E{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <strong>{e.title || "Untitled"}</strong>{" "}
                    <span className="text-slate-500">
                      ({evidenceTypeLabel(e.type)}
                      {e.date && `, ${formatDate(e.date)}`})
                    </span>
                    {e.note && <> {e.note}</>}
                    {e.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.image} alt="" className="mt-1 max-h-32 rounded border border-slate-200" />
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
                  <span className="w-4 flex-none text-center font-bold">
                    {top ? "▣" : node.status === "verified" ? "✓" : node.status === "ruled_out" ? "✕" : "?"}
                  </span>
                  <span
                    className={`min-w-0 flex-1 ${
                      node.status === "ruled_out" && !top ? "text-slate-400 line-through" : ""
                    } ${node.isRootCause ? "font-bold text-slate-900" : ""}`}
                  >
                    {top ? failureText(inv) || "Failure event" : node.text || "(no text)"}
                    {!top && (
                      <span className="font-normal not-italic text-slate-500 no-underline">
                        {" "}
                        [{CATEGORY_LABEL[node.category]}
                        {node.status !== "verified" && `, ${STATUS_LABEL[node.status].toLowerCase()}`}
                        {node.evidenceIds.length > 0 &&
                          `, evidence ${node.evidenceIds.map((id) => `E${evNo.get(id) ?? "?"}`).join(" ")}`}
                        ]
                      </span>
                    )}
                    {node.isRootCause && !top && (
                      <span className="ml-1 rounded bg-slate-900 px-1.5 py-px text-[10px] font-bold uppercase text-white">
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
                    <th className="py-1 pr-2">Fixes</th>
                    <th className="py-1 pr-2">Owner</th>
                    <th className="py-1 pr-2">Due</th>
                    <th className="py-1 pr-2">Status</th>
                    <th className="py-1 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.actions.map((a) => {
                    const cause = findNode(inv.tree, a.causeId);
                    return (
                      <tr key={a.id} className="avoid-break border-b border-slate-200 align-top">
                        <td className="py-1 pr-2">{a.description || "(no description)"}</td>
                        <td className="py-1 pr-2 text-slate-600">
                          {cause ? cause.text.slice(0, 60) + (cause.text.length > 60 ? "…" : "") : "Not linked"}
                        </td>
                        <td className="py-1 pr-2">{a.owner || "Unassigned"}</td>
                        <td className={`py-1 pr-2 whitespace-nowrap ${isOverdue(a) ? "font-bold text-red-700" : ""}`}>
                          {a.dueDate ? formatDate(a.dueDate) : "None"}
                          {isOverdue(a) && " (overdue)"}
                        </td>
                        <td className="py-1 pr-2 whitespace-nowrap">
                          {ACTION_STATUS.find((s) => s.value === a.status)?.label}
                        </td>
                        <td className="py-1 text-right tabular-nums">{formatMoney(a.cost ?? 0, cur)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} className="pt-1 pr-2 text-right font-bold">
                      Total
                    </td>
                    <td className="pt-1 text-right font-bold tabular-nums">
                      {formatMoney(v.totalActionCost, cur)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Section>

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
              <strong>{formatMoney(v.annualLossAfter, cur)}</strong>: a saving of{" "}
              <strong>{formatMoney(v.annualSaving, cur)} per year</strong> for an action cost of{" "}
              {formatMoney(v.totalActionCost, cur)}, paid back in {formatMonths(v.paybackMonths)}.
              {inv.verification.recurred !== "no" && " This saving is not yet verified."}
            </p>
          ) : (
            <Muted>Savings cannot be calculated until the expected events per year after the fix are entered.</Muted>
          )}
        </Section>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <h2 className="mb-1.5 border-b border-slate-300 pb-0.5 text-xs font-bold uppercase tracking-wider text-slate-500">
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
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-lg font-extrabold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="space-y-1">
      {rows.map(([k, val]) => (
        <div key={k} className="avoid-break flex gap-2">
          <dt className="w-32 flex-none font-bold text-slate-700">{k}</dt>
          <dd className="min-w-0 flex-1">{val || <span className="text-slate-400">Not recorded</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
