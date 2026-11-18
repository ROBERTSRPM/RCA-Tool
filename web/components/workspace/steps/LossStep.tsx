"use client";

import { useId, useState } from "react";
import {
  calcLoss,
  formatMoney,
  formatNumber,
  setShare,
  wholeShares,
  type ShareKey,
} from "@/lib/finance";
import { uid } from "@/lib/id";
import { OTHER_COST_CATEGORIES, type Loss, type OtherCost } from "@/lib/types";
import { Icon } from "../../icons";
import { NumberField, SectionCard, SelectField, TextField } from "../../ui";
import type { StepProps } from "../types";

const SHARE_INFO: {
  key: ShareKey;
  title: string;
  sentence: string;
  bar: string;
  accent: string;
}[] = [
  {
    key: "lost",
    title: "Lost for good",
    sentence:
      "The production was never made up, so you lose the profit on every unit (units × margin per unit).",
    bar: "bg-red-600",
    accent: "accent-red-600",
  },
  {
    key: "madeUp",
    title: "Made up later",
    sentence:
      "You caught up afterwards with overtime, extra energy or rushed freight, so the units were still sold but the catch-up costs money.",
    bar: "bg-amber-500",
    accent: "accent-amber-600",
  },
  {
    key: "buffer",
    title: "Covered by buffer stock",
    sentence:
      "Customers were served from stock you already held, so nothing was lost per event; you may still carry a yearly cost for holding that stock.",
    bar: "bg-sky-600",
    accent: "accent-sky-600",
  },
];

export function LossStep({ inv, update }: StepProps) {
  const l = inv.loss;
  const set = <K extends keyof Loss>(key: K, value: Loss[K]) =>
    update((i) => ({ ...i, loss: { ...i.loss, [key]: value } }));
  const c = calcLoss(l);
  const cur = l.currency || "$";
  const unit = l.unitName || "units";
  const n = (v: number | null | undefined) => formatNumber(v ?? 0, 2);
  const shares = wholeShares(l);
  const others = l.otherCosts ?? [];

  const changeShare = (key: ShareKey, value: number | null) => {
    update((i) => {
      const next = setShare(wholeShares(i.loss), key, value);
      return {
        ...i,
        loss: { ...i.loss, shareLost: next.lost, shareMadeUp: next.madeUp, shareBuffer: next.buffer },
      };
    });
  };

  const setOthers = (fn: (list: OtherCost[]) => OtherCost[]) =>
    update((i) => ({ ...i, loss: { ...i.loss, otherCosts: fn(i.loss.otherCosts ?? []) } }));

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-5">
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
              help="Profit you make on one unit. This is what each unit lost for good costs you."
              value={l.marginPerUnit}
              onChange={(v) => set("marginPerUnit", v)}
              prefix={cur}
              placeholder="42"
            />
            <NumberField
              label="Repair cost per event"
              help="Parts, labour and contractors each time it fails. Add more detail under Other costs if you need it."
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

        <SectionCard
          title="What happened to the production you lost?"
          help="Not every lost hour is lost money. Split the production you did not make during the downtime into the three groups below. The three always add up to 100%: change one and the others adjust."
        >
          <div
            className="flex h-4 w-full overflow-hidden rounded-full bg-slate-200"
            role="img"
            aria-label={`Lost for good ${shares.lost}%, made up later ${shares.madeUp}%, covered by buffer stock ${shares.buffer}%`}
          >
            {SHARE_INFO.map((s) => (
              <div
                key={s.key}
                className={s.bar}
                style={{ width: `${shares[s.key]}%` }}
                data-testid={`share-bar-${s.key}`}
              />
            ))}
          </div>
          <p className="mt-1.5 text-sm text-slate-600" data-testid="share-total">
            Total: <strong>{shares.lost + shares.madeUp + shares.buffer}%</strong>
          </p>

          <div className="mt-4 space-y-4">
            {SHARE_INFO.map((s) => (
              <ShareRow
                key={s.key}
                info={s}
                value={shares[s.key]}
                onChange={(v) => changeShare(s.key, v)}
              />
            ))}
          </div>

          {(shares.madeUp > 0 || shares.buffer > 0) && (
            <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
              {shares.madeUp > 0 && (
                <>
                  <NumberField
                    label="Recovery cost per event"
                    help="One number for the extra cash it costs to make the production up: overtime premium, extra energy, expedited freight."
                    value={l.recoveryCost ?? null}
                    onChange={(v) => set("recoveryCost", v)}
                    prefix={cur}
                    placeholder="3000"
                  />
                  <TextField
                    label="Recovery note (optional)"
                    help="What the recovery cost covers, e.g. two Saturday shifts."
                    value={l.recoveryNote ?? ""}
                    onChange={(v) => set("recoveryNote", v)}
                    placeholder="e.g. overtime on two Saturdays"
                  />
                </>
              )}
              {shares.buffer > 0 && (
                <NumberField
                  className="sm:col-span-2"
                  label="Yearly cost of holding the buffer stock (optional)"
                  help="Only the part of the stock holding cost you attribute to this failure, per year. It is not multiplied by the number of events and it does not go away if the failure is fixed."
                  value={l.bufferHoldingCostPerYear ?? null}
                  onChange={(v) => set("bufferHoldingCostPerYear", v)}
                  prefix={cur}
                  suffix="per year"
                  placeholder="12000"
                />
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Other costs per event (optional)"
          help="Anything else that one failure costs in cash, on top of the repair cost above. Each line counts once per event."
          right={
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                setOthers((list) => [
                  ...list,
                  { id: uid(), category: "other", description: "", amount: null },
                ])
              }
            >
              <Icon name="plus" /> Add a cost
            </button>
          }
        >
          {others.length === 0 ? (
            <p className="text-sm text-slate-600">
              No other costs added. The repair cost above is counted as a cash cost.
            </p>
          ) : (
            <ul className="space-y-3">
              {others.map((o, idx) => (
                <li
                  key={o.id}
                  data-testid="other-cost-line"
                  className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-[minmax(0,1.8fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-end"
                >
                  <SelectField
                    label="Category"
                    value={o.category}
                    onChange={(v) =>
                      setOthers((list) => list.map((x) => (x.id === o.id ? { ...x, category: v } : x)))
                    }
                    options={OTHER_COST_CATEGORIES}
                  />
                  <TextField
                    label="Description"
                    value={o.description}
                    placeholder="e.g. Crane hire"
                    onChange={(v) =>
                      setOthers((list) => list.map((x) => (x.id === o.id ? { ...x, description: v } : x)))
                    }
                  />
                  <NumberField
                    label="Amount per event"
                    value={o.amount}
                    prefix={cur}
                    onChange={(v) =>
                      setOthers((list) => list.map((x) => (x.id === o.id ? { ...x, amount: v } : x)))
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    aria-label={`Remove other cost ${idx + 1}`}
                    onClick={() => setOthers((list) => list.filter((x) => x.id !== o.id))}
                  >
                    <Icon name="trash" size={16} /> Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <aside aria-label="Live calculation" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-slate-800">
          <h2 className="eyebrow">
            Live calculation
          </h2>

          <h3 className="mt-3 eyebrow">
            Production lost
          </h3>
          <dl className="mt-1 space-y-3">
            <Row
              label="Lost production per event"
              value={`${formatNumber(c.lostUnitsPerEvent, 1)} ${unit}`}
              formula={`${n(l.downtimeHours)} hours × ${n(l.ratePerHour)} ${unit} per hour`}
            />
            <Row
              label="Of which lost for good"
              value={`${formatNumber(c.unitsLostForGoodPerEvent, 1)} ${unit}`}
              formula={`${shares.lost}% lost for good · ${shares.madeUp}% made up later · ${shares.buffer}% from buffer stock`}
            />
          </dl>

          <h3 className="mt-4 eyebrow">
            Cost per event
          </h3>
          <dl className="mt-1 space-y-3">
            <Row
              label="Cash costs"
              value={formatMoney(c.cashPerEvent, cur)}
              formula={`${formatMoney(c.repairPerEvent, cur)} repair + ${formatMoney(c.recoveryPerEvent, cur)} recovery + ${formatMoney(c.otherPerEvent, cur)} other costs`}
            />
            <Row
              label="Opportunity loss"
              value={formatMoney(c.opportunityPerEvent, cur)}
              formula={`${formatNumber(c.unitsLostForGoodPerEvent, 1)} ${unit} lost for good × ${cur}${n(l.marginPerUnit)} margin`}
            />
            <Row
              label="Cost per event"
              value={formatMoney(c.costPerEvent, cur)}
              formula={`${formatMoney(c.cashPerEvent, cur)} cash + ${formatMoney(c.opportunityPerEvent, cur)} opportunity loss`}
            />
          </dl>

          <h3 className="mt-4 eyebrow">
            Per year
          </h3>
          <dl className="mt-1 space-y-3">
            <Row
              label="Cash costs"
              value={formatMoney(c.annualCash, cur)}
              formula={`${formatMoney(c.cashPerEvent, cur)} × ${n(l.eventsPerYear)} events${
                c.bufferHoldingPerYear > 0
                  ? ` + ${formatMoney(c.bufferHoldingPerYear, cur)} buffer holding`
                  : ""
              }`}
            />
            <Row
              label="Opportunity loss"
              value={formatMoney(c.annualOpportunity, cur)}
              formula={`${formatMoney(c.opportunityPerEvent, cur)} × ${n(l.eventsPerYear)} events`}
            />
            <Row
              label="Hours lost"
              value={`${formatNumber(c.hoursLostPerYear, 1)} h`}
              formula={`${n(l.downtimeHours)} hours × ${n(l.eventsPerYear)} events`}
            />
            <Row
              label="Units lost"
              value={`${formatNumber(c.unitsLostPerYear, 1)} ${unit}`}
              formula={`${formatNumber(c.unitsLostForGoodPerYear, 1)} ${unit} of them lost for good`}
            />
          </dl>

          <div className="mt-4 rounded-lg bg-slate-900 p-4 text-white">
            <p className="text-sm font-semibold">Annual loss</p>
            <p
              className="break-words text-3xl font-semibold tabular-nums tracking-tight"
              data-testid="annual-loss"
            >
              {formatMoney(c.annualLoss, cur)}
            </p>
            <p className="mt-1 text-sm">
              {formatMoney(c.annualCash, cur)} cash costs + {formatMoney(c.annualOpportunity, cur)}{" "}
              opportunity loss
            </p>
            <p className="text-sm">
              {formatMoney(c.costPerEvent, cur)} per event × {n(l.eventsPerYear)} events per year
              {c.bufferHoldingPerYear > 0 ? " + buffer holding" : ""}
            </p>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            <strong className="text-slate-900">The formula, in words:</strong> hours of downtime times
            the units you make per hour gives the production lost. The share lost for good,
            times the margin on each unit, is the <em>opportunity loss</em>: profit you will never
            get back. Cash costs are what you actually pay out: the repair cost, the recovery cost
            for production made up later, and any other cost lines. Production covered by buffer
            stock costs nothing per event. Cash plus opportunity loss is what one failure costs;
            multiply by how often it happens, then add any yearly buffer holding cost, to get the
            cost per year.
          </p>
        </div>
      </aside>
    </div>
  );
}

function ShareRow({
  info,
  value,
  onChange,
}: {
  info: (typeof SHARE_INFO)[number];
  value: number;
  onChange: (v: number | null) => void;
}) {
  const id = useId();
  const [text, setText] = useState<string | null>(null);
  return (
    <div className="rounded-lg border border-slate-200 p-3" data-testid={`share-${info.key}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <span className={`inline-block h-3 w-3 rounded-full ${info.bar}`} aria-hidden="true" />
          {info.title}
        </label>
        <div className="relative w-28">
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className="input pr-8 text-right"
            aria-label={`${info.title} percent`}
            value={text ?? String(value)}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              const t = e.target.value;
              if (!/^\d{0,3}$/.test(t)) return;
              setText(t);
              onChange(t === "" ? null : Number(t));
            }}
            onBlur={() => setText(null)}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">
            %
          </span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        aria-label={`${info.title} slider`}
        onChange={(e) => {
          setText(null);
          onChange(Number(e.target.value));
        }}
        className={`mt-2 h-6 w-full ${info.accent}`}
      />
      <p className="mt-1 text-sm text-slate-600">{info.sentence}</p>
    </div>
  );
}

function Row({ label, value, formula }: { label: string; value: string; formula: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-sm text-slate-700">{label}</dt>
        <dd className="min-w-0 break-words text-right text-base font-semibold tabular-nums text-slate-900">
          {value}
        </dd>
      </div>
      <p className="break-words text-xs text-slate-500">{formula}</p>
    </div>
  );
}
