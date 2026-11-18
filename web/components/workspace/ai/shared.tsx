"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { callAi } from "@/lib/ai/api";
import type { AiFeature } from "@/lib/ai/requests";
import { useAuth } from "../../auth/AuthProvider";
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

export function AiCard({
  title,
  intro,
  children,
  className = "",
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  className?: string;
}) {
  const { ready, loading } = useAiAccess();
  return (
    <section className={`card border-violet-200 p-4 sm:p-5 ${className}`} aria-label={title} data-testid="ai-card">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <span className="chip bg-violet-100 text-violet-800">
          <Icon name="sparkle" size={14} /> AI
        </span>
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
      </div>
      <p className="mt-1 max-w-prose text-sm text-slate-600">
        {intro ? `${intro} ` : ""}
        These are suggestions only. You decide what goes in, and nothing is marked verified because of AI.
      </p>
      {!ready && !loading && (
        <p className="mt-3 rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-800" data-testid="ai-signin">
          <strong>Sign in to use AI.</strong> AI suggestions are not available in demo mode.{" "}
          <Link href="/login" className="font-semibold underline">
            Sign in
          </Link>{" "}
          or{" "}
          <Link href="/signup" className="font-semibold underline">
            create an account
          </Link>
          . The quality check and similar-failure matching work without it.
        </p>
      )}
      <div className="mt-3">{children}</div>
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
      className={`btn ${secondary ? "btn-secondary" : "btn-dark"}`}
      disabled={!ready || running || disabled}
      aria-busy={running}
      data-testid={testId}
      onClick={onClick}
    >
      {running ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      ) : (
        <Icon name="sparkle" size={16} />
      )}
      {children}
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
  <span className="chip bg-violet-100 text-violet-800" title="Suggested by AI, accepted by you. Edit it like any other entry.">
    <Icon name="sparkle" size={12} /> AI-suggested
  </span>
);
