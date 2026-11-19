import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { SiteFooter } from "./SiteFooter";

/** Chrome for static information pages (help, privacy, terms). */
export function InfoPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4 sm:px-6">
          <Logo />
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 text-slate-800">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function DraftNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{children}</p>
  );
}
