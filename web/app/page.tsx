import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { StartNewButton } from "@/components/StartNewButton";
import { SAMPLE_ID } from "@/lib/sample";

const BENEFITS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "shield",
    title: "Stop repeat failures",
    body: "Ask why, step by step, until you reach the gap in your system, not just the broken part. Guided prompts flag weak spots before you close.",
  },
  {
    icon: "search",
    title: "Quantify the loss",
    body: "Turn downtime, lost production and repair cost into one annual number everyone understands, so the fix gets funded.",
  },
  {
    icon: "reset",
    title: "Close the loop",
    body: "Every fix has an owner, a due date and a status. Review later and see proof the failure stopped, with the saving worked out.",
  },
];

export default function Home() {
  return (
    <div className="bg-slate-950 text-slate-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <Link href="/app" className="btn btn-sm text-slate-200 hover:bg-slate-800">
          Open the app
        </Link>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-14 pt-8 sm:px-6 sm:pt-14 lg:pb-20">
          <p className="mb-4 inline-block rounded-full bg-amber-400/10 px-3 py-1 text-sm font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/30">
            For maintenance, reliability and plant teams
          </p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            The root cause tool that <span className="text-accent">closes the loop</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-300">
            Investigate quickly with guidance, track every action to done, and prove the failure
            stopped, with the money quantified. Works on a phone or tablet at the pump, not just at
            a desk.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={`/app/investigations/${SAMPLE_ID}`} className="btn btn-primary min-h-12 px-6 text-base">
              Open the sample investigation
            </Link>
            <StartNewButton variant="secondary" className="min-h-12 px-6 text-base" />
          </div>
        </section>

        <section aria-label="Benefits" className="border-y border-slate-800 bg-slate-900/60">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-3 md:gap-6">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400 text-slate-950">
                  <Icon name={b.icon} size={22} />
                </div>
                <h2 className="text-lg font-bold text-white">{b.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{b.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="mb-5 text-center text-sm font-semibold uppercase tracking-widest text-slate-400">
            See it in action
          </h2>
          <div
            className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 text-slate-400"
            role="img"
            aria-label="Video coming soon"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-slate-300">
              <Icon name="play" size={26} />
            </span>
            <span className="text-base font-semibold text-slate-300">Video coming soon</span>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 px-4 py-8 text-center text-sm text-slate-500">
        Your data stays in this browser for now. Sample figures are illustrative.
      </footer>
    </div>
  );
}
