"use client";

import {
  calcLoss,
  calcVerification,
  formatMoney,
  formatMonths,
  isVerifiedClosed,
} from "@/lib/finance";
import type { Recurrence } from "@/lib/types";
import { Icon } from "../../icons";
import { NumberField, SectionCard, TextAreaField, TextField } from "../../ui";
import { RolloutPanel } from "../RolloutPanel";
import type { StepProps } from "../types";

const OPTIONS: { value: Recurrence; label: string }[] = [
  { value: "unreviewed", label: "Not yet reviewed" },
  { value: "no", label: "No, it has not recurred" },
  { value: "yes", label: "Yes, it happened again" },
];

export function VerifyStep({ inv, update, go }: StepProps) {
  const v = inv.verification;
  const cur = inv.loss.currency || "$";
  const calc = calcVerification(inv);
  const verified = isVerifiedClosed(inv);
  const split = (cash: number, opp: number) =>
    `Cash ${formatMoney(cash, cur)} · Opportunity ${formatMoney(opp, cur)}`;
  const setV = (patch: Partial<typeof v>) =>
    update((i) => ({ ...i, verification: { ...i.verification, ...patch } }));
  const openActions = inv.actions.filter((a) => a.status !== "done").length;

  return (
    <div className="space-y-5">
      <SectionCard
        title="6. Prove it stopped"
        help="Some weeks or months after the last action was done, check the failure record and write down what you found."
      >
        {inv.actions.length > 0 && openActions > 0 && (
          <p className="mb-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
            {openActions} {openActions === 1 ? "action is" : "actions are"} not done yet. You can
            record a review at any time, but it is only meaningful once all actions are complete.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Review date"
            help="The day you checked."
            type="date"
            value={v.reviewDate}
            onChange={(x) => setV({ reviewDate: x })}
          />
          <div>
            <label className="label" htmlFor="recurred">
              Has the failure recurred since the actions were completed?
            </label>
            <select
              id="recurred"
              className="input"
              value={v.recurred}
              onChange={(e) => setV({ recurred: e.target.value as Recurrence })}
            >
              {OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <NumberField
            label="Expected events per year after the fix"
            help={`Before the fix: ${inv.loss.eventsPerYear ?? 0} per year. Use 0 if none are expected, or a cautious number such as 1.`}
            value={v.eventsPerYearAfter}
            onChange={(x) => setV({ eventsPerYearAfter: x })}
            suffix="per year"
          />
          <TextAreaField
            className="sm:col-span-2"
            label="What did you find?"
            help="Failure history since the fix, alarms that fired, anything unexpected."
            rows={4}
            value={v.notes}
            onChange={(x) => setV({ notes: x })}
          />
        </div>

        {v.recurred === "yes" && (
          <div role="alert" className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4">
            <p className="font-semibold text-red-900">The failure came back. The analysis is not finished.</p>
            <p className="mt-1 text-sm text-red-800">
              Reopen the cause tree: look for a cause you ruled out too early, a hypothesis you
              never proved, or a branch that stopped before reaching a System / Latent cause.
            </p>
            <button className="btn btn-danger-solid mt-3" onClick={() => go("cause")}>
              <Icon name="tree" /> Reopen the cause tree
            </button>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="The result in money"
        help={
          calc.hasAfterFigure
            ? undefined
            : "Enter the expected events per year after the fix to see the saving."
        }
      >
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Metric
            label="Annual loss before"
            value={formatMoney(calc.annualLossBefore, cur)}
            sub={split(calc.cashBefore, calc.opportunityBefore)}
          />
          <Metric
            label="Annual loss after"
            value={calc.hasAfterFigure ? formatMoney(calc.annualLossAfter, cur) : "Not entered"}
            sub={
              calc.hasAfterFigure
                ? `${formatMoney(calcLoss(inv.loss).costPerEvent, cur)} × ${v.eventsPerYearAfter}` +
                  (calcLoss(inv.loss).bufferHoldingPerYear > 0
                    ? ` + ${formatMoney(calcLoss(inv.loss).bufferHoldingPerYear, cur)} buffer holding (assumed to continue)`
                    : "") +
                  `. ${split(calc.cashAfter, calc.opportunityAfter)}`
                : undefined
            }
          />
          <Metric
            label={verified ? "Annual saving (verified)" : "Expected saving (not yet verified)"}
            value={calc.hasAfterFigure ? formatMoney(calc.annualSaving, cur) : "Not entered"}
            good={calc.annualSaving > 0}
            sub={
              calc.hasAfterFigure
                ? `${split(calc.cashSaving, calc.opportunitySaving)}. ${
                    verified
                      ? "Verified: all actions are done and the failure has not recurred."
                      : "Counts as verified, and in the dashboard total, only when all actions are done and the review (with a date) says it has not recurred."
                  }`
                : undefined
            }
          />
          <Metric label="Total action cost" value={formatMoney(calc.totalActionCost, cur)} />
          <Metric
            label="Payback period"
            value={formatMonths(calc.paybackMonths)}
            sub="Action cost ÷ monthly saving"
          />
        </dl>
      </SectionCard>

      <RolloutPanel inv={inv} update={update} go={go} />
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  good,
}: {
  label: string;
  value: string;
  sub?: string;
  good?: boolean;
}) {
  return (
    <div className="rounded-lg bg-slate-100 p-3">
      <dt className="eyebrow">{label}</dt>
      <dd className={`mt-0.5 break-words text-xl font-semibold tabular-nums ${good ? "text-emerald-700" : "text-slate-900"}`}>
        {value}
      </dd>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
