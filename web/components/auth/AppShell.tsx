"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { decideImport, prepareImport, type ImportDecision } from "@/lib/store/import";
import { getAccountStore, getLocalStore } from "@/lib/store";
import { useAuth } from "./AuthProvider";

/**
 * Wraps everything under /app: waits for the session check, shows the demo
 * banner when signed out, offers the one-time copy of browser data when signed
 * in, and remounts the page whenever the user (and so the store) changes.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { state, configured } = useAuth();
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-8 sm:px-6" aria-busy="true">
        <div className="h-8 w-1/3 animate-pulse rounded bg-slate-200" />
        <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
      </div>
    );
  }
  const userId = state.status === "in" ? state.user.id : "demo";
  return (
    <>
      {state.status === "out" && configured && <DemoBanner />}
      {state.status === "in" && <ImportOffer key={userId} userId={userId} onImported={refresh} />}
      <div key={`${userId}:${tick}`}>{children}</div>
    </>
  );
}

function DemoBanner() {
  return (
    <div
      role="note"
      data-testid="demo-banner"
      className="no-print border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-sm text-amber-900"
    >
      You are in demo mode: work is saved only in this browser.{" "}
      <Link href="/signup" className="font-semibold underline">
        Create a free account
      </Link>{" "}
      to keep it.{" "}
      <Link href="/login" className="whitespace-nowrap font-semibold underline">
        Sign in
      </Link>
    </div>
  );
}

const flagKey = (userId: string) => `rca.importOffered.${userId}`;

function readFlag(userId: string): boolean {
  try {
    return window.localStorage.getItem(flagKey(userId)) === "1";
  } catch {
    return false;
  }
}
function writeFlag(userId: string) {
  try {
    window.localStorage.setItem(flagKey(userId), "1");
  } catch {
    /* ignore: worst case the offer shows again */
  }
}

function ImportOffer({ userId, onImported }: { userId: string; onImported: () => void }) {
  const [decision, setDecision] = useState<ImportDecision | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    if (readFlag(userId)) return;
    getLocalStore()
      .list()
      .then((local) => {
        if (!live) return;
        const d = decideImport(local, readFlag(userId));
        if (d.offer) setDecision(d);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [userId]);

  if (!decision) return null;
  const n = decision.candidates.length;

  async function copy() {
    const store = getAccountStore();
    if (!store || !decision) return;
    setBusy(true);
    setError(null);
    try {
      await store.importMany(decision.candidates.map(prepareImport));
      writeFlag(userId);
      setDecision(null);
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not copy. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function skip() {
    writeFlag(userId);
    setDecision(null);
  }

  return (
    <div
      role="region"
      aria-label="Copy browser data to your account"
      data-testid="import-offer"
      className="no-print border-b border-sky-200 bg-sky-50 px-4 py-3 sm:px-6"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 text-sm text-sky-950">
          <strong>
            This browser has {n} {n === 1 ? "investigation" : "investigations"} from demo mode.
          </strong>{" "}
          Copy {n === 1 ? "it" : "them"} into your account? The browser copy stays as it is. We
          will only ask once.
          {error && (
            <span role="alert" className="ml-2 font-semibold text-red-700">
              {error}
            </span>
          )}
        </p>
        <div className="flex gap-2">
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={copy}>
            {busy ? "Copying…" : "Copy to my account"}
          </button>
          <button className="btn btn-secondary btn-sm" disabled={busy} onClick={skip}>
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
