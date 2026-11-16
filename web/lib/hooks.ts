"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getStore, StoreError } from "./store";
import type { Investigation, InvestigationPatch } from "./types";

export type SaveState =
  | { status: "saved" }
  | { status: "dirty" }
  | { status: "saving" }
  | { status: "error"; message: string };

const DEBOUNCE_MS = 350;

/**
 * Holds an investigation in React state and writes every change to the store
 * after a short pause. Also flushes when the tab is hidden or unmounted.
 */
export function useAutosavedInvestigation(initial: Investigation) {
  const [inv, setInv] = useState(initial);
  const latest = useRef(initial);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [save, setSave] = useState<SaveState>({ status: "saved" });

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!dirty.current) return;
    dirty.current = false;
    const cur = latest.current;
    const patch: InvestigationPatch = {
      isSample: cur.isSample,
      problem: cur.problem,
      loss: cur.loss,
      evidence: cur.evidence,
      tree: cur.tree,
      actions: cur.actions,
      verification: cur.verification,
    };
    setSave({ status: "saving" });
    try {
      await getStore().update(cur.id, patch);
      setSave(dirty.current ? { status: "dirty" } : { status: "saved" });
    } catch (e) {
      dirty.current = true;
      setSave({
        status: "error",
        message: e instanceof StoreError ? e.message : "Could not save your changes.",
      });
    }
  }, []);

  const update = useCallback(
    (fn: (i: Investigation) => Investigation) => {
      latest.current = fn(latest.current);
      setInv(latest.current);
      dirty.current = true;
      setSave((s) => (s.status === "saving" ? s : { status: "dirty" }));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
    },
    [flush],
  );

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    const onPageHide = () => void flush();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      void flush();
    };
  }, [flush]);

  return { inv, update, save, retry: flush };
}

export type LoadState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; inv: Investigation };

export function useLoadedInvestigation(id: string): LoadState {
  const [state, setState] = useState<{ id: string; inv: Investigation | null } | null>(null);
  useEffect(() => {
    let live = true;
    getStore()
      .get(id)
      .then((inv) => live && setState({ id, inv }))
      .catch(() => live && setState({ id, inv: null }));
    return () => {
      live = false;
    };
  }, [id]);
  if (!state || state.id !== id) return { status: "loading" };
  return state.inv ? { status: "ready", inv: state.inv } : { status: "missing" };
}
