import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
          <Logo />
        </div>
      </header>
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-16">
        <p className="eyebrow">Error 404</p>
        <h1 className="h-page mt-2">This page does not exist</h1>
        <p className="mt-2 text-sm text-slate-600">
          The link may be out of date, or the address may have been typed wrong. Your investigations
          are not affected.
        </p>
        <div className="mt-6 flex gap-2">
          <Link href="/app" className="btn btn-primary">
            Go to investigations
          </Link>
          <Link href="/" className="btn btn-secondary">
            Home
          </Link>
        </div>
        <p className="mt-8 text-sm text-slate-600">
          Need help?{" "}
          <a href={SUPPORT_MAILTO} className="font-semibold underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </main>
    </div>
  );
}
