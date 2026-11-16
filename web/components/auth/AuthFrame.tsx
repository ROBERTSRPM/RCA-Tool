"use client";

import Link from "next/link";
import { useId, type ReactNode } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { Logo } from "../Logo";
import { useAuth } from "./AuthProvider";

/** Page chrome shared by the sign-in, sign-up and password pages. */
export function AuthFrame({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { configured } = useAuth();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <Link href="/app" className="btn btn-sm text-slate-200 hover:bg-slate-800">
            Try the demo
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:py-14">
        <div className="card p-5 sm:p-7">
          <h1 className="h-page">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-600">{subtitle}</p>}
          <div className="mt-6">
            {configured ? (
              children
            ) : (
              <p role="status" className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
                Accounts are not set up in this copy of {BRAND_NAME}, so everything is saved in your
                browser only. You can still use the app.{" "}
                <Link href="/app" className="font-semibold underline">
                  Open the app
                </Link>
              </p>
            )}
          </div>
        </div>
        {configured && footer && (
          <div className="mt-5 text-center text-sm text-slate-600">{footer}</div>
        )}
      </main>
    </div>
  );
}

export function FormField({
  label,
  error,
  hint,
  type = "text",
  value,
  onChange,
  onBlur,
  autoComplete,
  name,
  autoFocus,
}: {
  label: string;
  error?: string | null;
  hint?: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  autoComplete?: string;
  name: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        autoCapitalize="none"
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={[error ? errId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined}
        className={`input ${error ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      {error ? (
        <p id={errId} className="mt-1 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="help">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
      {message}
    </p>
  );
}
