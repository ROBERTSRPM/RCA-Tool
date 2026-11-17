"use client";

import Link from "next/link";
import { findAssetByTag } from "@/lib/assets";
import { useAssets } from "@/lib/use-assets";
import { CRITICALITY_OPTIONS, ASSET_TYPES, FAILURE_MODES } from "@/lib/options";
import type { Criticality, Problem } from "@/lib/types";
import { ChoiceGroup, ComboField, SectionCard, TextField } from "../ui";
import type { Updater } from "./types";

/**
 * Asset details and failure mode on the Problem step. The tag links the
 * investigation to the asset register (created automatically when it is new).
 */
export function AssetDetails({ problem, update }: { problem: Problem; update: Updater }) {
  const set = <K extends keyof Problem>(key: K, value: Problem[K]) =>
    update((i) => ({ ...i, problem: { ...i.problem, [key]: value } }));
  const { state } = useAssets();
  const tag = (problem.assetTag ?? "").trim();

  const inRegister =
    state.status === "ready" && tag ? findAssetByTag(state.assets, tag) : undefined;

  return (
    <SectionCard
      title="Asset details"
      help="These link this failure to the asset register and to similar failures on other assets. Fill in what you know; all of it is optional."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <TextField
            label="Asset tag"
            help="The tag number on the equipment."
            placeholder="e.g. P-101"
            value={problem.assetTag ?? ""}
            onChange={(v) => set("assetTag", v)}
          />
          {tag && state.status === "ready" && (
            <p className="mt-1 text-sm text-slate-600" data-testid="register-status">
              {inRegister ? (
                <>
                  In your <Link href="/app/assets" className="font-semibold underline">asset register</Link>.
                </>
              ) : (
                <>It will be added to your <Link href="/app/assets" className="font-semibold underline">asset register</Link>.</>
              )}
            </p>
          )}
          {tag && state.status === "unavailable" && (
            <p className="mt-1 text-sm text-slate-600">
              The asset register is not set up on this server yet, so this tag is saved with the
              investigation only.
            </p>
          )}
        </div>
        <ComboField
          label="Asset type"
          help="Pick from the list, or type your own."
          options={ASSET_TYPES}
          value={problem.assetType ?? ""}
          onChange={(v) => set("assetType", v)}
        />
        <TextField
          label="Make and model"
          placeholder="e.g. Warman 8/6 AH"
          value={problem.makeModel ?? ""}
          onChange={(v) => set("makeModel", v)}
        />
        <TextField
          label="Duty or service"
          help="What it does for the process."
          placeholder="e.g. tailings transfer"
          value={problem.duty ?? ""}
          onChange={(v) => set("duty", v)}
        />
        <ChoiceGroup<Exclude<Criticality, "">>
          className="sm:col-span-2"
          label="Criticality"
          help="How much it matters if this asset stops. Tap again to clear."
          options={CRITICALITY_OPTIONS}
          value={problem.criticality ?? ""}
          onChange={(v) => set("criticality", v)}
        />
        <ComboField
          className="sm:col-span-2"
          label="Failure mode"
          help="How it failed, in one phrase. Used to find similar failures."
          options={FAILURE_MODES}
          value={problem.failureMode ?? ""}
          onChange={(v) => set("failureMode", v)}
        />
      </div>
    </SectionCard>
  );
}
