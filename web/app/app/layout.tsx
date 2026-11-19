import { AccountMenu } from "@/components/auth/AccountMenu";
import { AppNav } from "@/components/AppNav";
import { AppShell } from "@/components/auth/AppShell";
import { Logo } from "@/components/Logo";
import { SiteFooter } from "@/components/site/SiteFooter";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo href="/app" />
            <AppNav variant="inline" />
          </div>
          <AccountMenu />
        </div>
        <AppNav variant="row" />
      </header>
      <div className="flex-1">
        <AppShell>{children}</AppShell>
      </div>
      <SiteFooter />
    </div>
  );
}
