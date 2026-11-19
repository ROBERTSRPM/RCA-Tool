import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME, SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/brand";
import { DraftNote, InfoPage } from "@/components/site/InfoPage";

export const metadata: Metadata = { title: "Privacy" };

/*
 * DRAFT. A short plain-language statement, not a reviewed legal document.
 * To be replaced by the owner's reviewed privacy policy before public launch.
 */
export default function PrivacyPage() {
  return (
    <InfoPage>
      <DraftNote>
        Draft. This is a short summary and has not been reviewed by a lawyer. A full privacy policy will replace it.
      </DraftNote>
      <h1 className="mt-6 text-2xl font-bold text-slate-900">Privacy</h1>

      <h2 className="mt-6 text-lg font-semibold text-slate-900">What we store, and where</h2>
      <p className="mt-2 text-sm leading-relaxed">
        When you sign in, {BRAND_NAME} stores your investigations and asset register in your account. Only you can read them.
        This data is stored in our database provider, Supabase, in Sydney, Australia. In demo mode (no account) everything
        stays in your browser.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-900">AI features</h2>
      <p className="mt-2 text-sm leading-relaxed">
        The AI features (cause coach, challenge, action recommendations and write-up drafting) are optional and only run when you
        press an AI button while signed in. When you do, the text of that investigation (problem description, evidence notes,
        causes and actions) and any notes you type into an AI box are sent from our server to our AI provider, Anthropic, to
        produce the answer. Photos are not sent.
      </p>
      <p className="mt-2 text-sm leading-relaxed">
        Anthropic is a US company and processes these requests outside Australia, in the United States. Anthropic&rsquo;s
        commercial terms do not allow it to train models on data sent through its API, and the content is retained only for a
        limited period under those terms. No data is sent to China. If you need AI processing to stay in Australia, contact us
        at{" "}
        <a href={SUPPORT_MAILTO} className="underline">
          {SUPPORT_EMAIL}
        </a>{" "}
        and you can keep using {BRAND_NAME} with the AI features switched off.
      </p>
      <p className="mt-2 text-sm leading-relaxed">
        We do not log the content, and we count only how many AI requests each account makes, to apply fair-use limits.
        Suggestions are never saved unless you accept them.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-900">Questions</h2>
      <p className="mt-2 text-sm leading-relaxed">
        Write to{" "}
        <a href={SUPPORT_MAILTO} className="underline">
          {SUPPORT_EMAIL}
        </a>
        . See also the{" "}
        <Link href="/terms" className="underline">
          terms
        </Link>
        .
      </p>

      <p className="mt-8 text-sm">
        <Link href="/" className="underline">
          Back to the home page
        </Link>
      </p>
    </InfoPage>
  );
}
