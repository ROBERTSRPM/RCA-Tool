"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { AI_NOTICE_EVENT, dismissAiNotice, isAiNoticeDismissed } from "./notice";

/**
 * Shows the AI data notice once: the first time a signed-in user runs an AI action.
 * Dismissal is remembered per user in this browser. Also lives on /help and /privacy.
 */
export function AiNoticeHost() {
  const { state } = useAuth();
  const userId = state.status === "in" ? state.user.id : null;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const onRun = () => {
      if (!isAiNoticeDismissed(userId)) setVisible(true);
    };
    window.addEventListener(AI_NOTICE_EVENT, onRun);
    return () => window.removeEventListener(AI_NOTICE_EVENT, onRun);
  }, [userId]);

  if (!userId || !visible) return null;
  return (
    <div
      role="status"
      data-testid="ai-notice"
      className="no-print fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-700 shadow-lg"
    >
      <p>
        <strong>About AI suggestions.</strong> The text of this investigation, and any notes you type into an AI box, is
        sent to our AI provider, Anthropic, to answer this request. Photos are not sent.{" "}
        <Link href="/privacy" className="underline">
          Privacy
        </Link>
      </p>
      <button
        type="button"
        className="btn btn-secondary btn-sm mt-3"
        onClick={() => {
          dismissAiNotice(userId);
          setVisible(false);
        }}
      >
        Got it
      </button>
    </div>
  );
}
