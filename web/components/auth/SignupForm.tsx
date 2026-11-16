"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  friendlyAuthError,
  validateEmail,
  validateNewPassword,
  validatePasswordMatch,
} from "@/lib/auth/validate";
import { getSupabase } from "@/lib/supabase/client";
import { AuthFrame, FormError, FormField } from "./AuthFrame";
import { useAuth } from "./AuthProvider";

export function SignupForm() {
  const router = useRouter();
  const { state } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false, confirm: false });
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === "in" && !sentTo) router.replace("/app");
  }, [state.status, router, sentTo]);

  const emailErr = touched.email ? validateEmail(email) : null;
  const pwErr = touched.password ? validateNewPassword(password) : null;
  const confirmErr = touched.confirm ? validatePasswordMatch(password, confirm) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true, confirm: true });
    if (validateEmail(email) || validateNewPassword(password) || validatePasswordMatch(password, confirm)) {
      return;
    }
    const db = getSupabase();
    if (!db) return;
    setBusy(true);
    setFormError(null);
    const { data, error } = await db.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/login?confirmed=1` },
    });
    setBusy(false);
    if (error) {
      setFormError(friendlyAuthError(error, "signup"));
      return;
    }
    if (data.session) {
      router.replace("/app"); // email confirmation is switched off in this project
      return;
    }
    setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <AuthFrame title="Check your email">
        <div role="status" className="space-y-3 text-sm text-slate-700">
          <p>
            We sent a confirmation link to <strong>{sentTo}</strong>. Open it to confirm your
            address, then sign in.
          </p>
          <p>It can take a minute. Check your spam folder if it does not arrive.</p>
          <Link href="/login" className="btn btn-primary w-full">
            Go to sign in
          </Link>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title="Create your account"
      subtitle="Free. Keeps your investigations safe and available on any device."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-slate-900 underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4" aria-label="Create account">
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={emailErr}
        />
        <FormField
          label="Password"
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
          label="Confirm password"
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
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthFrame>
  );
}
