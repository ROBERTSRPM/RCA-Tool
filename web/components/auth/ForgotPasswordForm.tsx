"use client";

import Link from "next/link";
import { useState } from "react";
import { friendlyAuthError, validateEmail } from "@/lib/auth/validate";
import { getSupabase } from "@/lib/supabase/client";
import { AuthFrame, FormError, FormField } from "./AuthFrame";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const emailErr = touched ? validateEmail(email) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (validateEmail(email)) return;
    const db = getSupabase();
    if (!db) return;
    setBusy(true);
    setFormError(null);
    const { error } = await db.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) setFormError(friendlyAuthError(error, "forgot"));
    else setSent(true);
  }

  if (sent) {
    return (
      <AuthFrame title="Check your email">
        <div role="status" className="space-y-3 text-sm text-slate-700">
          <p>
            If an account exists for <strong>{email.trim()}</strong>, a link to reset your password
            is on its way. It can take a minute.
          </p>
          <Link href="/login" className="btn btn-secondary w-full">
            Back to sign in
          </Link>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title="Reset your password"
      subtitle="Enter your email and we will send you a link to choose a new password."
      footer={
        <Link href="/login" className="font-semibold text-slate-900 underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4" aria-label="Request password reset">
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          onBlur={() => setTouched(true)}
          error={emailErr}
        />
        <FormError message={formError} />
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </AuthFrame>
  );
}
