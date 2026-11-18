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
      className="mx-auto max-w-6xl mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
    >
      Your account and all its investigations have been deleted. You have been signed out.
    </p>
  );
}
