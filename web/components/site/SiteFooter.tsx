import Link from "next/link";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/brand";

const LINK = "inline-flex min-h-10 items-center underline-offset-2 hover:underline";

/** Small footer used in the app and the info pages: Help, Privacy, Terms, Support. */
export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer
      data-testid="site-footer"
      className={`no-print border-t border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 sm:px-6 ${className}`}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5">
          <Link href="/help" className={LINK}>
            Help
          </Link>
          <Link href="/privacy" className={LINK}>
            Privacy
          </Link>
          <Link href="/terms" className={LINK}>
            Terms
          </Link>
        </nav>
        <p className="flex flex-wrap items-center gap-x-1.5">
          Support:{" "}
          <a href={SUPPORT_MAILTO} className={`${LINK} font-semibold underline`}>
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>
    </footer>
  );
}

/** One line for sign-in and sign-up pages. */
export function NeedHelp() {
  return (
    <div className="mt-8 border-t border-slate-200 pt-4 text-center text-sm text-slate-600">
      <p>
        Need help?{" "}
        <a href={SUPPORT_MAILTO} className={`${LINK} font-semibold underline`}>
          {SUPPORT_EMAIL}
        </a>
      </p>
      <p className="mt-1.5 space-x-4">
        <Link href="/help" className={`${LINK} underline`}>
          Help
        </Link>
        <Link href="/privacy" className={`${LINK} underline`}>
          Privacy
        </Link>
        <Link href="/terms" className={`${LINK} underline`}>
          Terms
        </Link>
      </p>
    </div>
  );
}
