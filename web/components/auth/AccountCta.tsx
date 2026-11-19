"use client";

import Link from "next/link";
import { accountCta } from "@/lib/landing-cta";
import { useAuth } from "./AuthProvider";

/**
 * "Create account" for visitors, "Open the app" once signed in. Renders the
 * signed-out version on the server and until the session is known, so the
 * page itself stays static.
 */
export function AccountCta({ className }: { className: string }) {
  const { state } = useAuth();
  const cta = accountCta(state.status);
  return (
    <Link href={cta.href} className={className}>
      {cta.label}
    </Link>
  );
}
