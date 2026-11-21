# QA: label rename "Cash" -> "Money spent", "Opportunity" -> "Lost margin" (commit 009e4d6)

Verdict: FAIL (one Medium: the landing page screenshots still show the old labels, and one alt text now contradicts its image). The rename in the app itself is PASS. Everything else is Low.

## Method
- Read `git show 009e4d6` (7 files, 28 lines changed) and grepped `web/` and the rest of the repo (excluding video/, node_modules) for cash / opportunity.
- vitest 335/335, `tsc --noEmit` clean, lint clean, build OK.
- Real Vercel preview (share link, signed in as qa-user-a, Supabase): preview already showed the new labels. Checked dashboard, the sample investigation's Loss, Verify and Report steps, and the landing page, at 1280px and 390px. I created no test data (the built-in sample was read only, not edited), so there was nothing to clean up. Sign-out was local (browser sessions discarded). qa-user-b not used.

## Code review
- Diff is strings only. No identifiers (`cashPerEvent`, `annualOpportunity`, `opportunitySaving` ...), data fields or calculations changed. The one test edit is a test description.
- No user-visible "cash"/"opportunity" remains in `web/` (app, components, lib/ai context, help, privacy, public). Remaining hits are code identifiers and code comments only. There are no email templates in the repo that use them.
- Browser: no line containing cash/opportunity on any checked page at either width; new labels present on dashboard tile and row, Loss (live calculation, per event, per year, formula text, Other costs help), Verify tiles and Report (headline sentence and loss table "Money spent: repair", "Money spent", "Lost margin (...)").

## Findings
1. Medium: landing page images were not updated. `web/public/landing/step-cost.webp` still shows "Cash costs", "Opportunity loss" and "$57,000 cash costs + $181,440 opportunity loss"; `step-verify.webp` still shows "Cash $57,000 . Opportunity $181,440". The `step-cost` alt text was changed to "money spent, lost margin" so it now describes labels the image does not show. Retake both screenshots (hero-workspace and the others contain no money labels) or revert the alt text until they are retaken.
2. Low: awkward wording in the Loss step "Other costs per event" help: "Anything else that one failure costs in money spent, on top of the repair cost above." Suggest "Anything else that one failure costs, on top of the repair cost above." Similarly "the extra money it costs to make the production up" is fine, "counted as money spent" is fine.
3. Low: the labels now repeat a lot in one sentence in the "formula, in words" block ("Money spent is what you actually pay out" ... "Money spent plus lost margin ..."), but it reads naturally.
4. Low: code comments in `lib/finance.ts`, `lib/types.ts`, `lib/options.ts` still say cash/opportunity (not user visible). Fine to leave or tidy.
5. Low: the repo's own QA scripts (`qa/account.js`, `qa/demo.js`) and older QA reports assert the old strings ("Cash $8,801 . Opportunity $3,840", "Cash costs", "Opportunity loss"). They will fail if re-run until updated.

## Layout
- 390px: no horizontal overflow on dashboard, Loss, Verify or Report. Dashboard tile and row split lines ("Money spent $57,000 . Lost margin $181,440") wrap cleanly onto two lines; live calculation rows and the dark Annual loss card wrap fine.
- 1280px: no overflow; Report loss table columns still aligned.
- Landing at 390px reports one element wider than the viewport (page scroll width is still 390); not related to this change and not investigated.

## Not tested
- Email templates (none found in the repo); the PDF print output itself (only the on-screen report); AI responses (context string only read, AI buttons not used); creating a new costed investigation with other-cost lines on the preview (the sample covers all labels).
