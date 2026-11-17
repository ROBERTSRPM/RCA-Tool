import Link from "next/link";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { AppShell } from "@/components/auth/AppShell";
import { Logo } from "@/components/Logo";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-30 border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
          <Logo href="/app" />
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/app" className="hidden rounded-lg px-3 py-2 font-medium text-slate-200 hover:bg-slate-800 sm:block">
              Investigations
            </Link>
            <Link href="/app/assets" className="hidden rounded-lg px-3 py-2 font-medium text-slate-200 hover:bg-slate-800 sm:block">
              Assets
            </Link>
            <Link href="/" className="hidden rounded-lg px-3 py-2 font-medium text-slate-400 hover:bg-slate-800 sm:block">
              Home
            </Link>
            <Link href="/app/account" className="hidden rounded-lg px-3 py-2 font-medium text-slate-400 hover:bg-slate-800 sm:block">
              Account
            </Link>
            <AccountMenu />
          </nav>
        </div>
        <nav aria-label="Sections" className="flex gap-1 border-t border-slate-800 px-3 py-1 text-sm sm:hidden">
          <Link href="/app" className="flex min-h-11 items-center rounded-lg px-3 font-medium text-slate-200 hover:bg-slate-800">
            Investigations
          </Link>
          <Link href="/app/assets" className="flex min-h-11 items-center rounded-lg px-3 font-medium text-slate-200 hover:bg-slate-800">
            Assets
          </Link>
        </nav>
      </header>
      <div className="flex-1">
        <AppShell>{children}</AppShell>
      </div>
    </div>
  );
}
