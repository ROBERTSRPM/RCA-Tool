# Fix round: pre-launch blockers, should-fix items, loss without figures, security

Branch `claude/new-session-tdmk2t`. Source reports: `qa/prelaunch-report.md`, `security/owasp-audit-v1.md`, `qa/ai-round1.md`.
Tests: unit tests in `web/lib/**` (vitest), browser tests in `qa/prelaunch-fixes.js` (new) plus the repaired older suites.

## A. Pre-launch blockers and copy

| Item | Status | Notes |
|---|---|---|
| Support contact `SUPPORT_EMAIL` = roberts@intelbeyond.com in `web/lib/brand.ts` | Fixed | App footer, account menu, 404, new error page (`app/error.tsx`), auth pages ("Need help?"), account-deletion errors, privacy, help, terms. |
| `/help` page | Fixed | Getting started, the 7 steps, how AI works, AI data notice, loss optional, contact. |
| `/terms` page | Fixed | Marked "Draft — under review". Service, acceptable use, data ownership, AI advisory, liability limits, Australian law. Only "Intelbeyond" named. |
| Help, Privacy, Terms linked from app footer and auth pages | Fixed | The landing page footer is the designer's file and was not touched: it has Privacy only. Suggest adding Help and Terms there. |
| `/privacy` draft note kept | Fixed | Now also says data is stored in Sydney, AI requests are processed by Anthropic in the United States, no training under commercial terms, "retained only for a limited period", no data to China, contact us to keep AI processing in Australia. Retention days not stated (not confirmed from Anthropic docs). |
| Signup: no "Free" claims | Fixed | "Keeps your investigations safe... Try it with the sample investigation first if you like." "Create a free account" is now "Create an account" everywhere. |
| Owner feedback: AI data notice once, not in every panel | Fixed | `AiNoticeHost`: small dismissible note the first time a signed-in user runs any AI action, dismissal remembered per user in localStorage (falls back to showing it if storage is blocked). Still on /help and /privacy. |
| Owner feedback: demo-mode Problem step AI panel | Fixed | Signed out: no notes box and no greyed button; one quiet "Sign in to get AI suggestions on this step." line. Signed in: "Use this draft" fills the "Describe the problem" fields and offers Undo. |

## B. Should-fix

| Item | Status | Notes |
|---|---|---|
| S1 print/PDF clipping and mid-word breaks | Fixed | Print CSS: tables never clip, cells wrap only at word boundaries, headers do not wrap, "Fixes" column dropped in print. Browser test `P-REPORT-1`. |
| S2 session-expired save error | Fixed | Plain message "You've been signed out. Sign in again to keep saving; your changes are still on this page." Sticky toast at the bottom of the screen with a sign-in link (new tab, so the text on the page is kept). Test `P-AUTH-1.session-lost`. |
| S3 demo-mode AI panels | Fixed | One quiet note per step (Problem, Cause tree, Actions, Report), no per-root-cause blocks. |
| S3 new investigation opens with red findings | Fixed | Findings are neutral "To do" guidance until the step has been visited or edited; saved work counts as visited. Panel starts closed when there is nothing active. |
| S4 similarity offers the sample | Fixed | The sample is only offered to the sample. Words alone never match: needs same asset/type, or same failure mode plus two shared words. |
| S5 ghost asset on tag rename | Fixed | Register entry is created when the tag field is left (or after 5 s idle, not 1.5 s). A register entry this page created for a tag that is then renamed is removed if no other investigation uses it. |
| S6 photo help text | Fixed | Signed in: "kept in your account". |
| S7 AI report drafts not saved | Fixed | Edited or printed/copied drafts are stored in the investigation (`reportDrafts`), restored on return, removed on Dismiss. Normaliser and tests added. |
| S8 export file name | Fixed | `rca-pilot-my-data-DATE.json`. The internal format tag `rootloop-export-v1` is kept so older exports stay readable. |
| S9 stale QA tests | Fixed | Landing tests, dashboard tile label, "Create an account", quality-check wording, new-investigation start. README title. Phone feature tests that need the collapsed Asset details are listed under "Not re-run" below. |

## C. Loss step without dollar figures

Fixed. "Not known yet" choice, rough single yearly estimate ("Or one rough cost per year"), partial inputs accepted. Report, Verify, dashboard and AI context say "Loss not costed yet" instead of $0. Quality check: low-severity "Add a rough figure when you can. Managers act on dollars." Savings: no saving or payback is claimed while the loss is not costed, an estimate-only loss can only be compared after the fix when events per year are known, and unverified savings still never count. Unit tests in `finance.test.ts`, `quality.test.ts`; browser test `P-LOSS-1`. The normaliser keeps the two new fields (checked by test).

## D. Security (owasp-audit-v1)

Migration `web/supabase/migrations/20261119000100_ai_global_cap_refund_storage_cap.sql`, applied to project `ccigtztlrvgkzyppjmxt`.

| Item | Status | Notes |
|---|---|---|
| V-01 global daily AI cap | Fixed | DB-enforced in `ai_consume` across all users, env `AI_GLOBAL_DAILY_LIMIT`, default 300 per rolling 24 h, friendly "very busy today" message. Verified in SQL. |
| V-02 per-user storage cap | Fixed | Trigger: investigations plus assets at most 50 MB per account, message "Storage limit reached", mapped to a clear in-app message. Verified: the 11th 4.9 MB row is refused. |
| V-03 `ai_refund` abuse | Fixed | `ai_consume` issues a secret ticket per call (not readable by users: column-level grants); refund needs the id and the ticket, once, within 5 minutes, max 5 a day. Old one-argument `ai_refund` removed. Verified: wrong ticket refused, right ticket once. |
| V-05 TRUNCATE etc. | Fixed | TRUNCATE, REFERENCES, TRIGGER revoked from anon and authenticated on all public tables, and from default privileges. |
| F-08 old QA password at HEAD | Fixed | Removed from `security/lib.sh` and three scripts; they read `QA_PW_FILE`. Still in git history (password is dead). |
| V-06 CSP without 'unsafe-inline' | Skipped | Nonces need dynamic rendering of every page (landing, help, terms, auth): no static caching and the designer's landing page would be affected. Next 16 experimental SRI keeps static pages but does not cover Next's inline bootstrap scripts: tested, the browser blocked them (CSP violations) and hydration would break. Kept as is; revisit when Next supports hashing inline scripts. |
| Supabase advisors after the migration | Done | Only the expected "SECURITY DEFINER callable by signed-in users" notes (ai_consume, ai_refund, delete_own_account) and "leaked password protection off" (owner dashboard action). |
| Compatibility note | | The old three-argument `ai_consume` remains as a wrapper so an older build keeps working; an older build's refunds are silently ignored. |

## E. Known minor

| Item | Status | Notes |
|---|---|---|
| Plan vs quality-check task text mismatch | Fixed | The check now accepts the action description as the task text, as the plan does. |
| Asset status lag (about 4 s) | Fixed | The register entry is made when the tag field is left, not after a pause. |

## Test results (local production build, `npm run build` and `npm start -p 3555`, QA accounts, local sign-out scope)

- `npm run build`, `npm run lint`, `npm test` (311 unit tests): green.
- `qa/demo.js`: 210 of 211. The one failure is `D-PERS-1.concurrent-window`, the known demo-mode two-tab race (NEW-01), not part of this round.
- `qa/loss.js`: green after updating the loss-wording expectations (LOSS-2 re-run 26 of 26).
- `qa/prelaunch-fixes.js` (new): 31 of 31, including the signed-in checks (photo help, ghost asset, session-lost toast) run as qa-user-b and cleaned up afterwards.
- Not re-run: `qa/account.js` and `qa/features.js` (signed in, two accounts). They sign out globally and clean up qa-user-a's data, which would disturb the demo recording; `QA_LOCAL_SIGNOUT=1` now makes the harness use local sign-out. The landing page was not touched by this round and its Help/Terms footer links are for the designer.
- AI calls: none made (no real or mock AI run). The one-time AI notice and the kept report drafts are covered by unit tests and structure checks only; they need one signed-in manual check with a real AI call.
