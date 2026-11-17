"use client";

import { useSearchParams } from "next/navigation";

/** Confirmation shown on the landing page after an account was deleted. */
export function DeletedNotice() {
  const params = useSearchParams();
  if (!params.get("deleted")) return null;
  return (
    <p
      role="status"
      data-testid="account-deleted-notice"
      className="mx-auto max-w-6xl rounded-lg bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-200 ring-1 ring-inset ring-emerald-400/30"
    >
      Your account and all its investigations have been deleted. You have been signed out.
    </p>
  );
}
