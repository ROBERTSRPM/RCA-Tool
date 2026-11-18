import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = { title: "Privacy" };

/*
 * DRAFT. A short plain-language statement, not a reviewed legal document.
 * To be replaced by the owner's reviewed privacy policy before public launch.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-slate-800">
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        Draft. This is a short summary and has not been reviewed by a lawyer. A full privacy policy will replace it.
      </p>
      <h1 className="mt-6 text-2xl font-bold text-slate-900">Privacy</h1>

      <h2 className="mt-6 text-lg font-semibold text-slate-900">What we store</h2>
      <p className="mt-2 text-sm leading-relaxed">
        When you sign in, {BRAND_NAME} stores your investigations and asset register in your account. Only you can read them. In demo
        mode (no account) everything stays in your browser.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-900">AI features</h2>
      <p className="mt-2 text-sm leading-relaxed">
        The AI features (cause coach, challenge, action recommendations and write-up drafting) are optional and only run when you
        press an AI button while signed in. When you do, the text of that investigation (problem description, evidence notes, causes
        and actions) and any notes you type into an AI box are sent from our server to our AI provider, Anthropic, to produce the
        answer. Photos are not sent. Anthropic&rsquo;s commercial terms do not allow it to train models on this content. We do not
        log the content, and we count only how many AI requests each account makes, to apply fair-use limits. Suggestions are never
        saved unless you accept them.
      </p>

      <p className="mt-8 text-sm">
        <Link href="/" className="underline">
          Back to the home page
        </Link>
      </p>
    </main>
  );
}
