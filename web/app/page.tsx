import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AccountCta } from "@/components/auth/AccountCta";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { DeletedNotice } from "@/components/auth/DeletedNotice";
import { Logo } from "@/components/Logo";
import { VideoFacade } from "@/components/site/VideoFacade";
import { BRAND_BYLINE, BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { SAMPLE_ID } from "@/lib/sample";
import { DEMO_VIDEO, EXPLAINER_VIDEO } from "@/lib/youtube";

/**
 * Headline options. Swap HEADLINE to change the hero:
 *   "Find the real cause. Fix it once."
 *   "Root cause analysis your team will actually finish."
 */
const HEADLINE = "Get your plant out of firefighting mode.";
const SUB =
  `${BRAND_NAME} takes your team from failure to verified solution, with an AI reviewer that suggests causes and actions while your people decide.`;
const CREDIBILITY =
  "Built by a former maintenance, production and site manager, around the way plants actually run RCAs.";

const STEPS = [
  {
    n: "01",
    title: "Cost the failure",
    body: "Turn downtime and repairs into one annual figure. Rough numbers are fine.",
    src: "/landing/step-cost.webp",
    width: 760,
    height: 780,
    alt: "Loss step: money spent, lost margin and an annual loss of $238,440 calculated from events per year, hours lost and margin.",
    frame: "max-w-[400px]",
  },
  {
    n: "02",
    title: "Find the root cause",
    body: "Keep asking why. Link the evidence behind every cause.",
    src: "/landing/step-cause.webp",
    width: 1424,
    height: 590,
    alt: "Selected cause with a root cause checkbox and the evidence that supports it, such as the DCS flow trend and pump curve overlay.",
    frame: "max-w-[640px]",
  },
  {
    n: "03",
    title: "Prove the countermeasure held",
    body: "Savings count only once every action is done and the failure has not come back.",
    src: "/landing/step-verify.webp",
    width: 1330,
    height: 438,
    alt: "Result in money: annual loss before $238,440, after $0, and a verified annual saving of $238,440.",
    frame: "max-w-[640px]",
  },
];

const AI_POINTS = [
  { title: "Cause coach", body: "Suggests likely causes and the evidence that would confirm or rule each out." },
  { title: "Challenge my analysis", body: "Questions the logic of your tree the way a senior reviewer would." },
  { title: "Action and report drafting", body: "Drafts corrective actions and report text from your investigation." },
];

const wrap = "mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8";
const eyebrow = "text-xs font-medium uppercase tracking-[0.14em] text-slate-500";

export default function Home() {
  const sampleHref = `/app/investigations/${SAMPLE_ID}`;
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header>
        <div className={`${wrap} flex h-16 items-center justify-between`}>
          <Logo />
          <div className="flex items-center gap-1">
            <Link href="/app" className="btn btn-sm btn-ghost hidden sm:inline-flex">
              Open the app
            </Link>
            <AccountMenu />
          </div>
        </div>
      </header>

      <div className={wrap}>
        <Suspense fallback={null}>
          <DeletedNotice />
        </Suspense>
      </div>

      <main className="flex-1">
        {/* Hero */}
        <section className="overflow-hidden pb-16 pt-10 sm:pt-16 lg:pb-28">
          <div className={wrap}>
            <p className={`${eyebrow} flex items-center gap-3`}>
              <span aria-hidden="true" className="h-px w-8 bg-accent" />
              {BRAND_TAGLINE}
            </p>
            <h1 className="mt-6 max-w-[15ch] text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.04em] text-slate-900 sm:text-[4.25rem] lg:max-w-[18ch] lg:text-[5.25rem]">
              {HEADLINE}
            </h1>
            <p className="mt-6 max-w-[44rem] text-lg leading-relaxed text-slate-600 sm:text-xl">{SUB}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href={sampleHref} className="btn btn-primary min-h-12 px-6 text-base">
                Try the sample investigation
              </Link>
              <AccountCta className="btn btn-secondary min-h-12 px-6 text-base" />
              <a href="#demo" className="btn btn-ghost min-h-12 px-4 text-base">
                Watch the 3-minute demo
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-500">No account needed to try it.</p>
          </div>

          <div className={`${wrap} relative mt-14 sm:mt-20`}>
            <div className="relative max-h-[330px] overflow-hidden rounded-t-2xl border border-b-0 sm:max-h-[560px] lg:max-h-[760px] border-slate-200 bg-white shadow-[0_40px_80px_-30px_rgb(15_18_23/0.28)]">
              <Image
                src="/landing/hero-workspace.webp"
                width={2400}
                height={1997}
                priority
                unoptimized
                sizes="(min-width: 1280px) 1200px, 100vw"
                alt="The investigation workspace: a cause tree for a repeat pump failure, with physical, human and system causes, and root causes flagged on the right."
                className="block h-auto w-[230%] max-w-none sm:w-full"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-white/0 to-white"
              />
            </div>
            <figure className="relative mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_24px_48px_-16px_rgb(15_18_23/0.3)] lg:absolute lg:-bottom-24 lg:right-12 lg:mt-0 lg:w-[46%] lg:max-w-[560px]">
              <Image
                src="/landing/hero-suggestion.webp"
                width={1356}
                height={622}
                unoptimized
                sizes="(min-width: 1024px) 560px, 100vw"
                alt="An AI suggestion: pipe strain or a weak baseplate pulls the casing out of position, with what would confirm it, what would rule it out, and Add to tree and Dismiss buttons."
                className="block h-auto w-full"
              />
            </figure>
          </div>
        </section>

        {/* Demo video */}
        <section id="demo" aria-labelledby="demo-title" className="scroll-mt-4 bg-slate-50 py-16 sm:py-24 lg:pt-32">
          <div className={wrap}>
            <p className={eyebrow}>Demo</p>
            <h2
              id="demo-title"
              className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.03em] text-slate-900 sm:text-5xl"
            >
              See it in 3 minutes.
            </h2>
            <p className="mt-4 max-w-xl text-base text-slate-600 sm:text-lg">
              One failure, from the cost to the verified solution.
            </p>
            <div className="mx-auto mt-10 max-w-[960px]">
              <VideoFacade
                id={DEMO_VIDEO.id}
                duration={DEMO_VIDEO.duration}
                title={`${BRAND_NAME} demo: from failure to verified solution`}
                thumb="/landing/yt-demo.webp"
              />
            </div>
          </div>
        </section>

        {/* Credibility */}
        <section aria-label="Who built it" className="border-y border-slate-200 bg-slate-50">
          <div className={`${wrap} py-10 lg:pt-12`}>
            <p className="max-w-3xl text-xl font-medium leading-snug tracking-tight text-slate-900 sm:text-2xl">
              {CREDIBILITY}
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 sm:py-28">
          <div className={wrap}>
            <p className={eyebrow}>How it works</p>
            <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.03em] text-slate-900 sm:text-5xl">
              From failure to verified solution.
            </h2>
            <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="w-full sm:w-64 sm:shrink-0">
                <VideoFacade
                  size="small"
                  id={EXPLAINER_VIDEO.id}
                  duration={EXPLAINER_VIDEO.duration}
                  title="Root cause analysis explainer: why it matters and the method"
                  thumb="/landing/yt-explainer.webp"
                />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">New to root cause analysis?</p>
                <p className="mt-1 text-base text-slate-600">
                  Watch the 12-minute explainer: why RCA matters and the method behind it.
                </p>
              </div>
            </div>
            <ol className="mt-14 space-y-12 sm:mt-16 sm:space-y-16">
              {STEPS.map((s, i) => (
                <li key={s.n} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
                  <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                    <p className="text-sm font-medium tabular-nums text-accent">{s.n}</p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-3xl">{s.title}</h3>
                    <p className="mt-3 max-w-md text-base leading-relaxed text-slate-600 sm:text-lg">{s.body}</p>
                  </div>
                  <div className={`rounded-2xl bg-slate-100 p-3 sm:p-6 ${i % 2 === 1 ? "lg:order-1" : ""}`}>
                    <div className={`mx-auto overflow-hidden rounded-lg border border-slate-200 bg-white ${s.frame}`}>
                      <Image
                        src={s.src}
                        width={s.width}
                        height={s.height}
                        unoptimized
                        sizes="(min-width: 1024px) 600px, 100vw"
                        alt={s.alt}
                        className="block h-auto w-full"
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* AI */}
        <section className="border-t border-slate-200 bg-slate-50 py-20 sm:py-28">
          <div className={`${wrap} grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-20`}>
            <div>
              <p className={eyebrow}>AI reviewer</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.03em] text-slate-900 sm:text-5xl">
                An experienced reviewer, on every investigation.
              </h2>
              <ul className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
                {AI_POINTS.map((p) => (
                  <li key={p.title} className="py-5">
                    <p className="text-base font-semibold text-slate-900">{p.title}</p>
                    <p className="mt-1 text-base text-slate-600">{p.body}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                The AI suggests. <span className="text-accent">You decide.</span>
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_60px_-30px_rgb(15_18_23/0.25)]">
              <Image
                src="/landing/ai-suggestions.webp"
                width={1356}
                height={1308}
                unoptimized
                sizes="(min-width: 1024px) 600px, 100vw"
                alt="Two AI suggested causes for a bearing failure, each with what would confirm it, what would rule it out, and Add to tree and Dismiss buttons."
                className="block h-auto w-full"
              />
            </div>
          </div>
        </section>
      </main>

      {/* Closing band and footer share one dark surface so the page ends cleanly */}
      <div className="bg-ink text-white">
        <section className={`${wrap} py-16 sm:py-24`}>
          <h2 className="max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-5xl">
            Open a finished investigation and click around.
          </h2>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href={sampleHref} className="btn btn-primary min-h-12 px-6 text-base">
              Try the sample investigation
            </Link>
            <AccountCta className="btn min-h-12 border border-slate-500 px-6 text-base text-white hover:border-slate-300 hover:bg-white/10" />
          </div>
        </section>
        <footer className="border-t border-slate-800">
          <div className={`${wrap} flex flex-col gap-4 py-8 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between`}>
            <p className="font-medium text-white">
              {BRAND_NAME} <span className="font-normal text-slate-400">{BRAND_BYLINE}</span>
            </p>
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <li>
                <Link href="/help" className="underline-offset-4 hover:underline">
                  Help
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="underline-offset-4 hover:underline">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="underline-offset-4 hover:underline">
                  Terms
                </Link>
              </li>
              <li>
                <a href="mailto:roberts@intelbeyond.com" className="underline-offset-4 hover:underline">
                  roberts@intelbeyond.com
                </a>
              </li>
              <li className="text-slate-400">© 2026 Intelbeyond</li>
            </ul>
          </div>
        </footer>
      </div>
    </div>
  );
}
