"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { registerFlusher } from "./pending";
import { getStore, StoreError } from "./store";
import { DATA_KEY } from "./store/local";
import type { Investigation, InvestigationPatch } from "./types";

export type SaveState =
  | { status: "saved" }
  | { status: "dirty" }
  | { status: "saving" }
  /** Someone else saved a newer version; our edits are held back, not written. */
  | { status: "conflict" }
  | { status: "error"; message: string; code?: string };

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
  /** updatedAt of the version this tab last loaded or saved (optimistic concurrency token) */
  const base = useRef(initial.updatedAt);
  const conflict = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);

  const clearTimers = () => {
    if (timer.current) clearTimeout(timer.current);
    if (retryTimer.current) clearTimeout(retryTimer.current);
    timer.current = null;
    retryTimer.current = null;
  };

  const flushRef = useRef<() => Promise<boolean>>(async () => true);

  const run = useCallback(async (): Promise<boolean> => {
    if (conflict.current) return false; // never write over a newer version
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
        spares: cur.spares,
        rollouts: cur.rollouts ?? [],
        reportDrafts: cur.reportDrafts,
      };
      setSave({ status: "saving" });
      try {
        const saved = await getStore().update(cur.id, patch, base.current);
        base.current = saved.updatedAt;
      } catch (e) {
        dirty.current = true; // keep every edit; nothing is discarded
        if (e instanceof StoreError && e.code === "conflict") {
          conflict.current = true;
          setSave({ status: "conflict" });
          return false;
        }
        failed.current = true;
        setSave({
          status: "error",
          message: e instanceof StoreError ? e.message : "Could not save your changes.",
          code: e instanceof StoreError ? e.code : undefined,
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
      setNotice(null);
      setSave((s) =>
        s.status === "saving" || s.status === "error" || s.status === "conflict"
          ? s
          : { status: "dirty" },
      );
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
    },
    [flush],
  );

  /** Looks for a newer saved version (another tab or device) and reacts to it. */
  const checkRemote = useCallback(async () => {
    if (running.current || conflict.current || unmounted.current) return;
    let latestInv: Investigation | null;
    try {
      latestInv = await getStore().get(latest.current.id);
    } catch {
      return;
    }
    if (!latestInv || latestInv.updatedAt === base.current) return;
    if (running.current || conflict.current) return;
    if (dirty.current || timer.current) {
      // Unsaved edits here and a newer version there: never pick a winner silently.
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      dirty.current = true;
      conflict.current = true;
      setSave({ status: "conflict" });
      return;
    }
    latest.current = latestInv;
    base.current = latestInv.updatedAt;
    setInv(latestInv);
    setNotice("This investigation was updated from another tab or device. Showing the latest version.");
  }, []);

  /** Conflict choice 1: drop my unsaved edits and show what is saved. */
  const loadLatest = useCallback(async () => {
    try {
      const fresh = await getStore().get(latest.current.id);
      if (!fresh) {
        setSave({ status: "error", message: "Could not load the latest version: it no longer exists." });
        return;
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      latest.current = fresh;
      base.current = fresh.updatedAt;
      dirty.current = false;
      conflict.current = false;
      failed.current = false;
      setInv(fresh);
      setNotice(null);
      setSave({ status: "saved" });
    } catch (e) {
      setSave({
        status: "error",
        message: e instanceof StoreError ? e.message : "Could not load the latest version.",
      });
    }
  }, []);

  /** Conflict choice 2: keep what is on screen and overwrite the saved version. */
  const keepMine = useCallback(async () => {
    try {
      const fresh = await getStore().get(latest.current.id);
      if (!fresh) {
        setSave({ status: "error", message: "Could not save: this investigation was deleted elsewhere." });
        return;
      }
      base.current = fresh.updatedAt;
      conflict.current = false;
      dirty.current = true;
      await flush();
    } catch (e) {
      conflict.current = true;
      setSave({
        status: "error",
        message: e instanceof StoreError ? e.message : "Could not save your changes.",
      });
    }
  }, [flush]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      // Another tab wrote to browser storage (demo mode keeps everything there).
      if (e.key === null || e.key === DATA_KEY) void checkRemote();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkRemote();
    };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [checkRemote]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    const onPageHide = () => void flush();
    const onOnline = () => {
      if (dirty.current) void flush();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current || failed.current || conflict.current) e.preventDefault();
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

  return { inv, update, save, retry: flush, loadLatest, keepMine, notice };
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
