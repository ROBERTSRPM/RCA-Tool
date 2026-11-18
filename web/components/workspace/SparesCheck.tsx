"use client";

import { blankSpares, criticalSpareFlag, hasSparesAction, SPARES_FLAG_TEXT, sparesHoldingAction } from "@/lib/capa";
import { uid } from "@/lib/id";
import type { SparesCheck as Spares, YesNoUnknown } from "@/lib/types";
import { Icon } from "../icons";
import { ChoiceGroup, NumberField, SectionCard, TextAreaField } from "../ui";
import type { StepProps } from "./types";

const YES_NO = [
  { value: "yes" as const, label: "Yes" },
  { value: "no" as const, label: "No" },
];

/** Was the right spare available when it failed? Flags a long-lead spare that was not in stock. */
export function SparesCheck({ inv, update }: Pick<StepProps, "inv" | "update">) {
  const s = inv.spares ?? blankSpares();
  const set = (patch: Partial<Spares>) =>
    update((i) => ({ ...i, spares: { ...(i.spares ?? blankSpares()), ...patch } }));
  const flagged = criticalSpareFlag(inv.spares);
  const covered = hasSparesAction(inv.actions);

  return (
    <SectionCard
      className="!p-4"
      title="Spares check"
      help="Was the right spare there when it failed?"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ChoiceGroup<Exclude<YesNoUnknown, "">>
          label="Was a spare part needed?"
          options={YES_NO}
          value={s.needed}
          onChange={(v) => set({ needed: v })}
        />
        {s.needed === "yes" && (
          <>
            <ChoiceGroup<Exclude<YesNoUnknown, "">>
              label="Was it in stock?"
              options={YES_NO}
              value={s.inStock}
              onChange={(v) => set({ inStock: v })}
            />
            <NumberField
              label="Supplier lead time"
                            suffix="days"
              value={s.leadTimeDays}
              onChange={(v) => set({ leadTimeDays: v })}
            />
            <TextAreaField
              label="How was the gap covered?"
              placeholder="Borrowed, cannibalised, expedited..."
              rows={2}
              value={s.coverage}
              onChange={(v) => set({ coverage: v })}
            />
          </>
        )}
      </div>

      {flagged && (
        <div
          role="note"
          data-testid="spares-flag"
          className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3"
        >
          <p className="flex items-start gap-2 font-semibold text-amber-950">
            <Icon name="alert" size={18} className="mt-0.5 flex-none" />
            {SPARES_FLAG_TEXT}
          </p>
          <p className="mt-1 text-sm text-amber-900">
            Not in stock and {s.leadTimeDays} days to arrive. Holding one spare makes the next
            failure a repair, not a wait.{" "}
            {covered && <strong className="text-emerald-800">A spares holding action is on the list.</strong>}
          </p>
          {!covered && (
            <button
              type="button"
              className="btn btn-primary mt-3"
              onClick={() =>
                update((i) => ({ ...i, actions: [...i.actions, sparesHoldingAction(i, uid())] }))
              }
            >
              <Icon name="plus" /> Add a spares holding action
            </button>
          )}
        </div>
      )}
    </SectionCard>
  );
}
