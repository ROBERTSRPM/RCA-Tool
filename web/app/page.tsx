import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { DeletedNotice } from "@/components/auth/DeletedNotice";
import { Logo } from "@/components/Logo";
import { StartNewButton } from "@/components/StartNewButton";
import { BRAND_TAGLINE } from "@/lib/brand";
import { SAMPLE_ID } from "@/lib/sample";

const BENEFITS: { title: string; body: string }[] = [
  { title: "Costed failures", body: "Turn downtime and repairs into one annual figure." },
  { title: "Causes with evidence", body: "Link each cause to the evidence behind it." },
  { title: "Fixes that get checked", body: "Every action has an owner and due date. Savings count once verified." },
];

export default function Home() {
  return (
    <div className="bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-1">
            <Link href="/app" className="btn btn-sm btn-ghost hidden sm:inline-flex">
              Open the app
            </Link>
            <AccountMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Suspense fallback={null}>
          <DeletedNotice />
        </Suspense>
      </div>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1fr_1fr] lg:gap-14 lg:pb-20">
          <div>
            <p className="text-sm font-medium text-slate-600">{BRAND_TAGLINE}</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.1]">
              Find the cause. Put a cost on it. Check the fix held.
            </h1>
            <p className="mt-4 max-w-lg text-base text-slate-600 sm:text-lg">
              Investigate one failure from first report to final review.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href={`/app/investigations/${SAMPLE_ID}`} className="btn btn-primary min-h-11 px-5">
                Open the sample investigation
              </Link>
              <StartNewButton variant="secondary" className="min-h-11 px-5" label="Start a new investigation" />
            </div>
            <p className="mt-4 text-sm text-slate-500">No account needed. Your work stays in this browser.</p>
          </div>
          <Image
            src="/cause-tree.webp"
            width={1100}
            height={630}
            priority
            sizes="(min-width: 1024px) 560px, 100vw"
            alt="Cause tree for a repeat pump failure: the failure event on the left, with physical causes and their linked evidence branching to the right."
            className="h-auto w-full rounded-lg border border-slate-200"
          />
        </section>

        <section aria-label="Benefits" className="border-t border-slate-200 bg-slate-50">
          <dl className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-3 md:gap-10">
            {BENEFITS.map((b) => (
              <div key={b.title}>
                <dt className="text-sm font-semibold text-slate-900">{b.title}</dt>
                <dd className="mt-1 text-sm text-slate-600">{b.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-lg font-semibold tracking-tight text-slate-900">See a finished investigation.</p>
          <Link href={`/app/investigations/${SAMPLE_ID}`} className="btn btn-primary min-h-11 px-5">
            Open the sample investigation
          </Link>
        </section>
      </main>

      <footer className="border-t border-slate-200 px-4 py-5 text-sm text-slate-500">
        <p className="mx-auto max-w-6xl sm:px-6">Sample figures are illustrative.</p>
      </footer>
    </div>
  );
}
