import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME, SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/brand";
import { InfoPage } from "@/components/site/InfoPage";

export const metadata: Metadata = { title: "Help" };

const STEP_LINES: [string, string][] = [
  ["Problem", "Say what failed, on which asset, and what you know so far. Plain facts, no guessing at causes yet."],
  ["Loss", "Put a money value on it: downtime, lost production, repair cost. Rough or partial figures are fine, or choose “Not known yet”."],
  ["Evidence", "Add the facts you collected: photos, readings, history, interviews. Link each one to the cause it supports."],
  ["Cause tree", "Ask why, again and again, until you reach causes you can act on. View it as a tree, 5 Whys or fishbone."],
  ["Actions", "Write the countermeasures, say who does them and by when, and add maintenance plan changes where they apply."],
  ["Verify", "Once actions are done, check the problem has not come back. Savings only count once they are verified."],
  ["Report", "Print or save a one-page summary and a full report for your manager or customer."],
];

export default function HelpPage() {
  return (
    <InfoPage>
      <h1 className="text-2xl font-bold text-slate-900">Help</h1>
      <p className="mt-2 text-sm leading-relaxed">
        {BRAND_NAME} walks you through a root cause analysis in seven steps. Your work saves as you type.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Getting started</h2>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
        <li>
          Open the <Link href="/app" className="underline">sample investigation</Link> to see a finished one.
        </li>
        <li>
          Start your own with “New investigation”. Without an account your work stays in this browser; with an account
          it is kept safely and is available on any device.
        </li>
        <li>Work through the steps in order, or jump to any step from the bar at the top.</li>
      </ol>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">The seven steps</h2>
      <ol className="mt-2 space-y-2 text-sm leading-relaxed">
        {STEP_LINES.map(([name, line], i) => (
          <li key={name}>
            <strong>
              {i + 1}. {name}.
            </strong>{" "}
            {line}
          </li>
        ))}
      </ol>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Process and quality failures</h2>
      <p className="mt-2 text-sm leading-relaxed">
        Not every failure is a broken machine. On the Problem step, choose “Process or quality failure” for things like
        leaking packs, then describe the line or process. In the cause tree, tag causes by area (materials, method,
        measurement and so on) and use “Not applicable” for causes that are not wear, such as a setting. Add the
        “Quality reference (NCR / CAPA number)” if you have one, so this investigation can feed your site’s QA or CAPA
        process. {BRAND_NAME} does not replace your HACCP, SQF or BRC system.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">How AI suggestions work</h2>
      <p className="mt-2 text-sm leading-relaxed">
        When you are signed in, optional AI buttons can draft a problem statement, coach a cause, challenge your analysis,
        suggest actions and draft the report. Suggestions are always shown for you to accept, edit or ignore. Nothing is
        added to your investigation until you accept it, and the AI never marks anything as verified.
      </p>
      <p className="mt-2 rounded-lg bg-slate-100 p-3 text-sm leading-relaxed">
        <strong>AI data notice.</strong> When you press an AI button, the text of that investigation (problem, evidence
        notes, causes and actions) and any notes you type into the AI box are sent from our server to our AI provider,
        Anthropic, to produce the answer. Photos are not sent. Your investigations are stored in Sydney, Australia; AI
        requests are processed by Anthropic in the United States. If you need AI processing to stay in Australia, contact
        us. See the{" "}
        <Link href="/privacy" className="underline">
          privacy page
        </Link>{" "}
        for details.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Loss figures are optional</h2>
      <p className="mt-2 text-sm leading-relaxed">
        You do not need dollar figures to start. Choose “Not known yet”, or enter whatever you have: just downtime hours,
        or a single rough annual cost. The report will say “Loss not costed yet” until you add something. Managers act on
        dollars, so add a rough figure when you can.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Contact</h2>
      <p className="mt-2 text-sm leading-relaxed">
        Questions, problems or ideas: write to{" "}
        <a href={SUPPORT_MAILTO} className="font-semibold underline">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </InfoPage>
  );
}
