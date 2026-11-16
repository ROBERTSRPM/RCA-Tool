"use client";

import { calcLoss, formatMoney, formatNumber } from "@/lib/finance";
import type { Loss } from "@/lib/types";
import { NumberField, SectionCard, TextField } from "../../ui";
import type { StepProps } from "../types";

export function LossStep({ inv, update }: StepProps) {
  const l = inv.loss;
  const set = <K extends keyof Loss>(key: K, value: Loss[K]) =>
    update((i) => ({ ...i, loss: { ...i.loss, [key]: value } }));
  const c = calcLoss(l);
  const cur = l.currency || "$";
  const unit = l.unitName || "units";
  const n = (v: number | null) => formatNumber(v ?? 0, 2);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <SectionCard
        title="2. What does it cost?"
        help="Rough numbers are fine. You can refine them later and the totals update straight away."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="How many times a year does it happen?"
            help="Count failures over the last 12 months."
            value={l.eventsPerYear}
            onChange={(v) => set("eventsPerYear", v)}
            suffix="per year"
            placeholder="6"
          />
          <NumberField
            label="Downtime per event"
            help="Hours the process is stopped or slowed each time."
            value={l.downtimeHours}
            onChange={(v) => set("downtimeHours", v)}
            suffix="hours"
            placeholder="14"
          />
          <NumberField
            label="Production rate"
            help="What you would normally produce in one hour."
            value={l.ratePerHour}
            onChange={(v) => set("ratePerHour", v)}
            suffix={`${unit} per hour`}
            placeholder="85"
          />
          <TextField
            label="Unit name"
            help="What you count, e.g. tonnes, litres, parts."
            value={l.unitName}
            onChange={(v) => set("unitName", v)}
            placeholder="tonnes"
          />
          <NumberField
            label="Margin per unit"
            help="Profit you make on one unit. This is what each lost unit costs you."
            value={l.marginPerUnit}
            onChange={(v) => set("marginPerUnit", v)}
            prefix={cur}
            placeholder="42"
          />
          <NumberField
            label="Repair cost per event"
            help="Parts, labour and contractors each time it fails."
            value={l.repairCost}
            onChange={(v) => set("repairCost", v)}
            prefix={cur}
            placeholder="9500"
          />
          <TextField
            label="Currency symbol"
            help="Used for every money figure, e.g. $, £, €, R."
            value={l.currency}
            onChange={(v) => set("currency", v.slice(0, 4))}
            placeholder="$"
          />
        </div>
      </SectionCard>

      <aside aria-label="Live calculation" className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-xl bg-slate-900 p-5 text-slate-100 shadow-lg">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Live calculation
          </h2>
          <dl className="mt-3 space-y-3">
            <Row
              label="Lost production per event"
              value={`${formatNumber(c.lostUnitsPerEvent, 1)} ${unit}`}
              formula={`${n(l.downtimeHours)} hours × ${n(l.ratePerHour)} ${unit} per hour`}
            />
            <Row
              label="Lost margin per event"
              value={formatMoney(c.lostMarginPerEvent, cur)}
              formula={`${formatNumber(c.lostUnitsPerEvent, 1)} ${unit} × ${cur}${n(l.marginPerUnit)}`}
            />
            <Row
              label="Cost per event"
              value={formatMoney(c.costPerEvent, cur)}
              formula={`${formatMoney(c.lostMarginPerEvent, cur)} lost margin + ${formatMoney(l.repairCost ?? 0, cur)} repair`}
            />
          </dl>
          <div className="mt-4 rounded-lg bg-accent p-4 text-slate-950">
            <p className="text-sm font-semibold">Annual loss</p>
            <p
              className="text-3xl font-extrabold tabular-nums tracking-tight"
              data-testid="annual-loss"
            >
              {formatMoney(c.annualLoss, cur)}
            </p>
            <p className="mt-1 text-sm">
              {formatMoney(c.costPerEvent, cur)} per event × {n(l.eventsPerYear)} events per year
            </p>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            <strong className="text-white">The formula, in words:</strong> hours of downtime times
            the units you make per hour gives the units lost. Multiply by the margin on each unit,
            add the repair cost, and that is what one failure costs. Multiply by how often it
            happens to get the cost per year.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value, formula }: { label: string; value: string; formula: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-sm text-slate-300">{label}</dt>
        <dd className="text-lg font-bold tabular-nums text-white">{value}</dd>
      </div>
      <p className="text-xs text-slate-400">{formula}</p>
    </div>
  );
}
