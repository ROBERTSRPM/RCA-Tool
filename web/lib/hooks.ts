"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { registerFlusher } from "./pending";
import { getStore, StoreError } from "./store";
import type { Investigation, InvestigationPatch } from "./types";

export type SaveState =
  | { status: "saved" }
  | { status: "dirty" }
  | { status: "saving" }
  | { status: "error"; message: string };

const DEBOUNCE_MS = 350;

const RETRY_MS = 8000;

/**
 * Holds an investigation in React state and writes every change to the store
 * after a short pause. Writes are serialised (never two in flight), a failed
 * write keeps the edits in memory and retries on the next edit, when the
 * connection returns, or on the Try again button. Also flushes when the tab is
 * hidden or the page unmounts, and warns before leaving with unsaved edits.
 */
export function useAutosavedInvestigation(initial: Investigation) {
  const [inv, setInv] = useState(initial);
  const latest = useRef(initial);
  const dirty = useRef(false);
  const running = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failed = useRef(false);
  const unmounted = useRef(false);
  const [save, setSave] = useState<SaveState>({ status: "saved" });

  const clearTimers = () => {
    if (timer.current) clearTimeout(timer.current);
    if (retryTimer.current) clearTimeout(retryTimer.current);
    timer.current = null;
    retryTimer.current = null;
  };

  const flushRef = useRef<() => Promise<boolean>>(async () => true);

  const run = useCallback(async (): Promise<boolean> => {
    while (dirty.current) {
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
      } catch (e) {
        dirty.current = true; // keep every edit; nothing is discarded
        failed.current = true;
        setSave({
          status: "error",
          message: e instanceof StoreError ? e.message : "Could not save your changes.",
        });
        if (retryTimer.current) clearTimeout(retryTimer.current);
        if (!unmounted.current) {
          retryTimer.current = setTimeout(() => void flushRef.current(), RETRY_MS);
        }
        return false;
      }
    }
    failed.current = false;
    setSave({ status: "saved" });
    return true;
  }, []);

  const flush = useCallback((): Promise<boolean> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    if (!running.current) {
      running.current = run().finally(() => {
        running.current = null;
      });
    }
    return running.current;
  }, [run]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const update = useCallback(
    (fn: (i: Investigation) => Investigation) => {
      latest.current = fn(latest.current);
      setInv(latest.current);
      dirty.current = true;
      setSave((s) => (s.status === "saving" || s.status === "error" ? s : { status: "dirty" }));
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
    const onOnline = () => {
      if (dirty.current) void flush();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current || failed.current) e.preventDefault();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("online", onOnline);
    window.addEventListener("beforeunload", onBeforeUnload);
    unmounted.current = false;
    const unregister = registerFlusher(flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeunload", onBeforeUnload);
      unregister();
      unmounted.current = true;
      void flush();
      clearTimers();
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
