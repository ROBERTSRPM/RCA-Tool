"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/app", label: "Investigations", match: (p: string) => p === "/app" || p.startsWith("/app/investigations") },
  { href: "/app/assets", label: "Assets", match: (p: string) => p.startsWith("/app/assets") },
  { href: "/app/actions", label: "Actions", match: (p: string) => p.startsWith("/app/actions") },
  { href: "/app/account", label: "Account", match: (p: string) => p.startsWith("/app/account") },
];

/** Section links in the app header. Desktop sits inline; phones get a second row. */
export function AppNav({ variant }: { variant: "inline" | "row" }) {
  const path = usePathname() ?? "";
  const links = variant === "row" ? LINKS.slice(0, 3) : LINKS;
  return (
    <nav
      aria-label={variant === "row" ? "Sections" : "Main"}
      className={variant === "row" ? "flex gap-1 border-t border-slate-200 px-3 sm:hidden" : "hidden items-center gap-1 sm:flex"}
    >
      {links.map((l) => {
        const on = l.match(path);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className={
              variant === "row"
                ? `flex min-h-11 items-center border-b-2 px-3 text-sm font-medium ${on ? "border-accent text-slate-900" : "border-transparent text-slate-600"}`
                : `rounded-md px-3 py-1.5 text-sm font-medium ${on ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`
            }
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
