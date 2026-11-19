"use client";

import { useCallback, useEffect, useState } from "react";
import { notifyAssetsChanged, onAssetsChanged } from "./assets-events";
import { findAssetByTag, planEnsureAsset, tagKey } from "./assets";
import { getAssetStore, getStore, StoreError } from "./store";
import type { Asset, Problem } from "./types";

export type AssetsState =
  | { status: "loading" }
  | { status: "ready"; assets: Asset[] }
  /** The server has no assets table yet. Everything else keeps working. */
  | { status: "unavailable"; message: string }
  | { status: "error"; message: string };

/** The asset register, reloaded whenever it changes anywhere on screen. */
export function useAssets(): { state: AssetsState; reload: () => void } {
  const [state, setState] = useState<AssetsState>({ status: "loading" });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => onAssetsChanged(reload), [reload]);

  useEffect(() => {
    let live = true;
    getAssetStore()
      .list()
      .then((assets) => live && setState({ status: "ready", assets }))
      .catch((e) => {
        if (!live) return;
        if (e instanceof StoreError && e.code === "unavailable") {
          setState({ status: "unavailable", message: e.message });
        } else {
          setState({
            status: "error",
            message: e instanceof Error && e.message ? e.message : "Could not load the asset register.",
          });
        }
      });
    return () => {
      live = false;
    };
  }, [tick]);

  return { state, reload };
}

/** Fired when the asset tag field is left, so the register entry is made at once (not after a pause). */
export const ASSET_TAG_BLUR = "rca:asset-tag-blur";

/** Tags this page created for an investigation, so a typo that was corrected does not stay behind. */
const createdFor = new Map<string, string>();

async function discardAbandoned(oldTag: string, invId: string) {
  try {
    const all = await getStore().list();
    const key = tagKey(oldTag);
    if (all.some((o) => o.id !== invId && tagKey(o.problem.assetTag) === key)) return;
    const store = getAssetStore();
    const old = findAssetByTag(await store.list(), oldTag);
    if (old) {
      await store.delete(old.id);
      notifyAssetsChanged();
    }
  } catch {
    /* leaving one extra asset is harmless */
  }
}

let registerUnavailable = false;
let chain: Promise<unknown> = Promise.resolve();

/**
 * Makes sure an investigation's asset tag exists in the register (creating the
 * asset, or filling blanks on the existing one). Runs one at a time, never
 * throws, and stops trying once the server says it has no assets table.
 */
export function ensureAssetFor(
  problem: Partial<Problem>,
  invId?: string,
): Promise<"created" | "updated" | "none"> {
  const run = async (): Promise<"created" | "updated" | "none"> => {
    if (registerUnavailable) return "none";
    try {
      const store = getAssetStore();
      const plan = planEnsureAsset(await store.list(), problem);
      const before = invId ? createdFor.get(invId) : undefined;
      const moved = !!before && tagKey(before) !== tagKey(problem.assetTag);
      let outcome: "created" | "updated" | "none" = "none";
      if (plan.action === "create") {
        await store.create(plan.asset);
        notifyAssetsChanged();
        outcome = "created";
        if (invId) createdFor.set(invId, (problem.assetTag ?? "").trim());
      } else if (plan.action === "update") {
        const { id, ...rest } = plan.asset;
        await store.update(id, rest);
        notifyAssetsChanged();
        outcome = "updated";
      }
      if (moved && before && invId) {
        if (outcome !== "created") createdFor.delete(invId);
        await discardAbandoned(before, invId);
      }
      return outcome;
    } catch (e) {
      if (e instanceof StoreError && e.code === "unavailable") registerUnavailable = true;
    }
    return "none";
  };
  const next = chain.then(run, run);
  chain = next.catch(() => undefined);
  return next;
}
