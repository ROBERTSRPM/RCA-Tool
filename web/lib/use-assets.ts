"use client";

import { useCallback, useEffect, useState } from "react";
import { notifyAssetsChanged, onAssetsChanged } from "./assets-events";
import { planEnsureAsset } from "./assets";
import { getAssetStore, StoreError } from "./store";
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

let registerUnavailable = false;
let chain: Promise<unknown> = Promise.resolve();

/**
 * Makes sure an investigation's asset tag exists in the register (creating the
 * asset, or filling blanks on the existing one). Runs one at a time, never
 * throws, and stops trying once the server says it has no assets table.
 */
export function ensureAssetFor(problem: Partial<Problem>): Promise<"created" | "updated" | "none"> {
  const run = async (): Promise<"created" | "updated" | "none"> => {
    if (registerUnavailable) return "none";
    try {
      const store = getAssetStore();
      const plan = planEnsureAsset(await store.list(), problem);
      if (plan.action === "create") {
        await store.create(plan.asset);
        notifyAssetsChanged();
        return "created";
      }
      if (plan.action === "update") {
        const { id, ...rest } = plan.asset;
        await store.update(id, rest);
        notifyAssetsChanged();
        return "updated";
      }
    } catch (e) {
      if (e instanceof StoreError && e.code === "unavailable") registerUnavailable = true;
    }
    return "none";
  };
  const next = chain.then(run, run);
  chain = next.catch(() => undefined);
  return next;
}
