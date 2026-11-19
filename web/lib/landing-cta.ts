export interface PrimaryCta {
  href: string;
  label: string;
}

/** The account call to action on public pages: sign up when signed out, the app when signed in. */
export function accountCta(status: "loading" | "out" | "in"): PrimaryCta {
  return status === "in"
    ? { href: "/app", label: "Open the app" }
    : { href: "/signup", label: "Create account" };
}
