import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME, SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/brand";
import { DraftNote, InfoPage } from "@/components/site/InfoPage";

export const metadata: Metadata = { title: "Terms" };

/*
 * DRAFT. A plain-language statement of terms, not a reviewed legal document.
 * To be replaced by the owner's reviewed terms before public launch.
 */
const SECTIONS: [string, string][] = [
  [
    "The service",
    `${BRAND_NAME} is an online tool from Intelbeyond for recording and analysing equipment failures: describing the problem, costing the loss, collecting evidence, building a cause tree, tracking actions and writing a report. We may improve, change or pause features, and we will try to give notice of changes that affect your work.`,
  ],
  [
    "Acceptable use",
    "Use the service for lawful work purposes. Do not try to break, overload or probe the service, access other people's data, or use it to store material you have no right to hold. Do not enter passwords or personal information that is not needed for the analysis. We may limit or suspend accounts that are used unfairly, including the daily limit on AI suggestions.",
  ],
  [
    "Your data",
    "What you enter belongs to you or your organisation. We store it to run the service for you and do not sell it. You can download all of it, and delete your account and everything in it, from the Account page. See the privacy page for what is stored and how the AI features use it.",
  ],
  [
    "AI suggestions are advisory",
    "AI suggestions are drafts to help you think. They can be wrong or incomplete. You decide what to accept, what the causes are, what actions to take and what goes in a report. You remain responsible for engineering, safety and business decisions made using the service.",
  ],
  [
    "No guarantee, and limits on liability",
    "The service is provided as is, without a promise that it will be uninterrupted or error free. To the extent the law allows, Intelbeyond is not liable for indirect or consequential loss, lost profit or lost production, or for decisions made using the service, and our total liability is limited to the amount you paid for the service in the 12 months before the claim. Nothing here excludes rights you have under the Australian Consumer Law that cannot be excluded.",
  ],
  [
    "Governing law",
    "These terms are governed by the laws of Australia. Disputes are subject to the courts of Australia.",
  ],
  [
    "Changes and contact",
    "We may update these terms, and will tell signed-in users about material changes.",
  ],
];

export default function TermsPage() {
  return (
    <InfoPage>
      <DraftNote>Draft — under review. These terms have not been reviewed by a lawyer and may change before launch.</DraftNote>
      <h1 className="mt-6 text-2xl font-bold text-slate-900">Terms of use</h1>
      {SECTIONS.map(([h, body]) => (
        <section key={h}>
          <h2 className="mt-6 text-lg font-semibold text-slate-900">{h}</h2>
          <p className="mt-2 text-sm leading-relaxed">
            {body}
            {h === "Changes and contact" && (
              <>
                {" "}
                Questions:{" "}
                <a href={SUPPORT_MAILTO} className="underline">
                  {SUPPORT_EMAIL}
                </a>
                .
              </>
            )}
          </p>
        </section>
      ))}
      <p className="mt-8 text-sm">
        <Link href="/privacy" className="underline">
          Privacy
        </Link>
        {" · "}
        <Link href="/" className="underline">
          Back to the home page
        </Link>
      </p>
    </InfoPage>
  );
}
