import Link from "next/link";
import { Suspense } from "react";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { DeletedNotice } from "@/components/auth/DeletedNotice";
import { Logo } from "@/components/Logo";
import { StartNewButton } from "@/components/StartNewButton";
import { BRAND_NAME } from "@/lib/brand";
import { SAMPLE_ID } from "@/lib/sample";

const STEPS: { name: string; body: string }[] = [
  { name: "Problem", body: "What failed, where, when, and the asset it happened on. Tag, type, criticality and failure mode go in the register." },
  { name: "Loss", body: "Downtime, lost production, repair and spares cost as one annual figure. Cash cost and lost opportunity are kept apart." },
  { name: "Evidence", body: "Photos and notes on what was seen, measured or said, each linked to the cause it supports." },
  { name: "Cause tree", body: "Keep asking why. Tree, 5 Whys and fishbone views of the same data. Each cause is marked physical, human or system." },
  { name: "Actions", body: "Corrective and preventive actions with an owner and a due date, plus maintenance plan changes and a spares check." },
  { name: "Verify", body: "Set a review date and record whether it recurred. Savings only count once the failure is confirmed stopped." },
  { name: "Report", body: "A one-page summary you can print or save as PDF for the site meeting." },
];

const POINTS: { title: string; body: string }[] = [
  {
    title: "Checks before you close",
    body: "A rule-based quality check flags what is missing: a cause marked verified with no evidence, an action with no owner or due date, a loss with no figure.",
  },
  {
    title: "Similar failures and rollout",
    body: "See past investigations that look like this one. When a fix works, list the similar assets that need it and tick them off.",
  },
  {
    title: "Natural or forced deterioration",
    body: "Each cause is classed as wear that was expected or damage that was forced by how the asset was run, built or maintained.",
  },
  {
    title: "Suggestions, not decisions",
    body: "When signed in you can ask for suggested causes, actions and a draft report. You accept or dismiss each one. Nothing is marked verified because of a suggestion.",
  },
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
        <section className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pb-16 sm:pt-20">
          <p className="eyebrow">Root cause analysis for maintenance, reliability and plant teams</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.1]">
            Find the cause. Put a cost on it. Check that the fix held.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            {BRAND_NAME} walks you through one failure from the first description to the last
            review: loss in money, cause tree, actions with owners and dates, and a check on whether
            it came back. It runs on a phone or tablet, so you can start at the pump.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={`/app/investigations/${SAMPLE_ID}`} className="btn btn-primary min-h-11 px-5">
              Open the sample investigation
            </Link>
            <StartNewButton variant="secondary" className="min-h-11 px-5" label="Start a new investigation" />
          </div>
          <p className="mt-4 text-sm text-slate-500">
            No account needed to try it. Without one, your work stays in this browser.
          </p>
        </section>

        <section aria-labelledby="steps-h" className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_2fr] lg:gap-16">
            <div>
              <h2 id="steps-h" className="text-xl font-semibold tracking-tight text-slate-900">
                Seven steps, one record
              </h2>
              <p className="mt-2 max-w-sm text-sm text-slate-600">
                Every investigation follows the same order, so two people looking at the same
                failure end up with the same kind of record.
              </p>
            </div>
            <ol className="divide-y divide-slate-200 border-y border-slate-200 bg-white">
              {STEPS.map((s, i) => (
                <li key={s.name} className="grid grid-cols-[2rem_1fr] gap-x-3 px-4 py-3 sm:grid-cols-[2rem_9rem_1fr]">
                  <span className="pt-0.5 text-sm tabular-nums text-slate-500">{i + 1}</span>
                  <span className="text-sm font-semibold text-slate-900">{s.name}</span>
                  <span className="col-start-2 text-sm text-slate-600 sm:col-start-3">{s.body}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="points-h" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 id="points-h" className="text-xl font-semibold tracking-tight text-slate-900">
            Built around how plants actually work
          </h2>
          <dl className="mt-6 grid gap-x-12 gap-y-6 sm:grid-cols-2">
            {POINTS.map((p) => (
              <div key={p.title} className="border-t border-slate-200 pt-4">
                <dt className="text-sm font-semibold text-slate-900">{p.title}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-slate-600">{p.body}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
        <p className="mx-auto max-w-6xl sm:px-6">
          Without an account your work stays in this browser; with an account it is saved to your
          account. Sample figures are illustrative.
        </p>
      </footer>
    </div>
  );
}
