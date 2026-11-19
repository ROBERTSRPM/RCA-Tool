"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { callAi } from "@/lib/ai/api";
import type { AiFeature } from "@/lib/ai/requests";
import { useAuth } from "../../auth/AuthProvider";
import { AI_NOTICE_EVENT } from "./notice";
import { Icon } from "../../icons";

export type RunState<T> =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; result: T; remainingToday: number }
  | { status: "error"; message: string };

/** Runs one AI call at a time; a newer run replaces an older one. */
export function useAiRun<T>(feature: AiFeature) {
  const [state, setState] = useState<RunState<T>>({ status: "idle" });
  const seq = useRef(0);
  const run = useCallback(
    async (body: Record<string, unknown>) => {
      const mine = ++seq.current;
      setState({ status: "running" });
      if (typeof window !== "undefined") window.dispatchEvent(new Event(AI_NOTICE_EVENT));
      const out = await callAi<T>(feature, body);
      if (mine !== seq.current) return;
      setState(out.ok ? { status: "done", result: out.result, remainingToday: out.remainingToday } : { status: "error", message: out.message });
    },
    [feature],
  );
  const reset = useCallback(() => {
    seq.current++;
    setState({ status: "idle" });
  }, []);
  return { state, run, reset, running: state.status === "running" };
}

/** True once the user is signed in. AI is never available in demo mode. */
export function useAiAccess(): { ready: boolean; loading: boolean } {
  const { state } = useAuth();
  return { ready: state.status === "in", loading: state.status === "loading" };
}

/** One small, quiet line per step for signed-out users, in place of a disabled AI panel. */
export function DemoAiNote({ className = "" }: { className?: string }) {
  const { state, configured } = useAuth();
  if (!configured || state.status !== "out") return null;
  return (
    <p className={`text-sm text-slate-500 ${className}`} data-testid="ai-demo-note">
      <Link href="/login" className="font-semibold underline">
        Sign in
      </Link>{" "}
      to get AI suggestions on this step.
    </p>
  );
}

export function AiCard({
  title,
  intro,
  children,
  className = "",
  collapseOnMobile = false,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  className?: string;
  /** Phones: body starts closed, the title row toggles it. */
  collapseOnMobile?: boolean;
}) {
  const { ready, loading } = useAiAccess();
  const [open, setOpen] = useState(!collapseOnMobile);
  // Signed out: no panel at all. Each step shows one quiet DemoAiNote instead.
  if (!ready && !loading) return null;
  const hide = collapseOnMobile && !open ? "hidden sm:block" : "";
  return (
    <section className={`card p-4 ${className}`} aria-label={title} data-testid="ai-card">
      {collapseOnMobile ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-baseline justify-between gap-2 text-left sm:pointer-events-none"
        >
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-semibold text-slate-900">{title}</span>
            <span className="eyebrow">Suggestions</span>
          </span>
          <span className="text-slate-500 sm:hidden" aria-hidden="true">
            <Icon name={open ? "up" : "down"} size={16} />
          </span>
        </button>
      ) : (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <span className="eyebrow">Suggestions</span>
        </div>
      )}
      <p className={`mt-1 max-w-prose text-sm text-slate-600 ${hide}`}>
        {intro ? `${intro} ` : ""}
        You decide what goes in. Nothing is marked verified because of a suggestion.
      </p>
      <div className={`mt-3 ${hide}`}>{children}</div>
    </section>
  );
}

export function AiButton({
  onClick,
  running,
  disabled,
  children,
  secondary,
  testId,
}: {
  onClick: () => void;
  running: boolean;
  disabled?: boolean;
  children: ReactNode;
  secondary?: boolean;
  testId?: string;
}) {
  const { ready } = useAiAccess();
  return (
    <button
      type="button"
      className={`btn max-w-full whitespace-normal py-2 text-left ${secondary ? "btn-secondary" : "btn-dark"}`}
      disabled={!ready || running || disabled}
      aria-busy={running}
      data-testid={testId}
      onClick={onClick}
    >
      {running ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      ) : null}
      <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
    </button>
  );
}

export function RunStatus<T>({ state, working }: { state: RunState<T>; working: string }) {
  if (state.status === "running") {
    return (
      <p role="status" className="mt-3 text-sm font-medium text-slate-700" data-testid="ai-running">
        {working} This can take up to a minute.
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <p role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" data-testid="ai-error">
        {state.message}
      </p>
    );
  }
  return null;
}

export function AcceptDismiss({
  onAccept,
  onDismiss,
  acceptLabel = "Accept",
}: {
  onAccept: () => void;
  onDismiss: () => void;
  acceptLabel?: string;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" className="btn btn-primary btn-sm" onClick={onAccept} data-testid="ai-accept">
        <Icon name="check" size={16} /> {acceptLabel}
      </button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={onDismiss} data-testid="ai-dismiss">
        Dismiss
      </button>
    </div>
  );
}

export const LEVEL_CHIP: Record<string, string> = {
  physical: "bg-sky-50 text-sky-800 ring-1 ring-sky-200",
  human: "bg-violet-50 text-violet-800 ring-1 ring-violet-200",
  system: "bg-amber-50 text-amber-900 ring-1 ring-amber-300",
};

export const AI_BADGE = (
  <span className="chip bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200" title="Suggested by AI, accepted by you. Edit it like any other entry.">
    Suggested
  </span>
);
