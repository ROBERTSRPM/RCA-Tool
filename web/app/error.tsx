"use client";

import Link from "next/link";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/brand";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="h-page mt-2">This page could not load</h1>
      <p className="mt-2 text-sm text-slate-600">
        Your saved investigations are not affected. Try again, and if it keeps happening write to{" "}
        <a href={SUPPORT_MAILTO} className="font-semibold underline">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
      <div className="mt-6 flex gap-2">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/app" className="btn btn-secondary">
          Go to investigations
        </Link>
      </div>
    </main>
  );
}
