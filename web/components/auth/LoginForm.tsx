"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { friendlyAuthError, safeNext, validateEmail, validateLoginPassword } from "@/lib/auth/validate";
import { getSupabase } from "@/lib/supabase/client";
import { AuthFrame, FormError, FormField } from "./AuthFrame";
import { useAuth } from "./AuthProvider";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(
    params.get("next"),
    "/app",
    typeof window === "undefined" ? undefined : window.location.origin,
  );
  const { state } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [formError, setFormError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state.status === "in") router.replace(next);
  }, [state.status, router, next]);

  const emailErr = touched.email ? validateEmail(email) : null;
  const pwErr = touched.password ? validateLoginPassword(password) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setInfo(null);
    if (validateEmail(email) || validateLoginPassword(password)) return;
    const db = getSupabase();
    if (!db) return;
    setBusy(true);
    setFormError(null);
    setNeedsConfirm(false);
    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setFormError(friendlyAuthError(error, "login"));
      setNeedsConfirm(error.code === "email_not_confirmed");
      setBusy(false);
      return;
    }
    router.replace(next);
  }

  async function resend() {
    const db = getSupabase();
    if (!db) return;
    const { error } = await db.auth.resend({ type: "signup", email: email.trim() });
    if (error) setFormError(friendlyAuthError(error, "resend"));
    else {
      setFormError(null);
      setInfo("We sent a new confirmation email. Check your inbox.");
    }
  }

  return (
    <AuthFrame
      title="Sign in"
      subtitle="Sign in to keep your investigations in your account."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-semibold text-slate-900 underline">
            Create a free account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4" aria-label="Sign in">
        {params.get("confirmed") && (
          <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
            Email confirmed. You can sign in now.
          </p>
        )}
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
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={pwErr}
        />
        <FormError message={formError} />
        {needsConfirm && (
          <button type="button" className="text-sm font-semibold underline" onClick={resend}>
            Send the confirmation email again
          </button>
        )}
        {info && (
          <p role="status" className="text-sm font-medium text-emerald-800">
            {info}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-center text-sm">
          <Link href="/forgot-password" className="font-semibold text-slate-700 underline">
            Forgot your password?
          </Link>
        </p>
      </form>
    </AuthFrame>
  );
}
