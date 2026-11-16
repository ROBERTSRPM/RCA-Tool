"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { friendlyAuthError, validateNewPassword, validatePasswordMatch } from "@/lib/auth/validate";
import { getSupabase } from "@/lib/supabase/client";
import { AuthFrame, FormError, FormField } from "./AuthFrame";
import { useAuth } from "./AuthProvider";

/**
 * Landing page of the emailed recovery link. supabase-js turns the link into a
 * temporary session; without one the link is invalid or expired.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const { state } = useAuth();
  const [waited, setWaited] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState({ password: false, confirm: false });
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Give supabase-js a moment to exchange the link's token for a session.
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const pwErr = touched.password ? validateNewPassword(password) : null;
  const confirmErr = touched.confirm ? validatePasswordMatch(password, confirm) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ password: true, confirm: true });
    if (validateNewPassword(password) || validatePasswordMatch(password, confirm)) return;
    const db = getSupabase();
    if (!db) return;
    setBusy(true);
    setFormError(null);
    const { error } = await db.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setFormError(friendlyAuthError(error, "reset"));
      return;
    }
    setDone(true);
    setTimeout(() => router.replace("/app"), 1500);
  }

  if (done) {
    return (
      <AuthFrame title="Password updated">
        <p role="status" className="text-sm text-slate-700">
          Your password has been changed. Taking you to your investigations…
        </p>
      </AuthFrame>
    );
  }

  if (state.status !== "in") {
    if (state.status === "loading" || !waited) {
      return (
        <AuthFrame title="Choose a new password">
          <p role="status" className="text-sm text-slate-600">
            Checking your reset link…
          </p>
        </AuthFrame>
      );
    }
    return (
      <AuthFrame title="Reset link not valid">
        <div className="space-y-3 text-sm text-slate-700">
          <p role="alert">This reset link is invalid or has expired. Links work once and for a short time.</p>
          <Link href="/forgot-password" className="btn btn-primary w-full">
            Request a new link
          </Link>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Choose a new password" subtitle={`For ${state.user.email}`}>
      <form onSubmit={submit} noValidate className="space-y-4" aria-label="Choose a new password">
        <FormField
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          value={password}
          onChange={setPassword}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={pwErr}
        />
        <FormField
          label="Confirm new password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
          error={confirmErr}
        />
        <FormError message={formError} />
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Saving…" : "Update password"}
        </button>
      </form>
    </AuthFrame>
  );
}
