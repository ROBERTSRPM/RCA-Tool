# RCA Pilot: release retest

Tester: independent (did not build it). Date: 19 Nov 2026.
Build: branch `claude/new-session-tdmk2t`, commit 5034cc6 (the Vercel preview serves it: home headline "Get your plant out of firefighting mode." and footer links Help, Privacy, Terms confirmed).
Targets: the branch preview (production settings, real AI key), a local production build (`npm ci && npm run build && npm start -p 3611`, `QA_LOCAL_SIGNOUT=1`), and the Supabase project (SQL, advisors).
Real AI calls used: 9 of 10 (all as qa-user-b). Screenshots: `qa/release-shots/` (2.5 MB).

## Verdict: GO, with conditions

Go live for demos and for the first pilot customers **if their accounts are created by hand** (or if the owner has already proven that signup and password-reset emails reach real addresses). Every fix in `qa/fix-round-prelaunch.md` that I could check is fixed on the preview and in the database. I found no data-loss bug, no wrong number, no security regression and no console error. The new defects below are cosmetic or copy.

Conditions that are owner actions, not code (unchanged since the pre-launch report, and I could not verify any of them):
1. Email: self-signup and "Forgot your password" are still unproven for real customers (B1). Until SMTP is set up and a real test arrives, create pilot accounts yourself.
2. `/privacy` and `/terms` are still marked "Draft" and unreviewed. Acceptable for a pilot you are talking to personally, not for a buyer's legal review.
3. Supabase Auth: the advisor still reports "leaked password protection disabled". I did not re-test the 6-character server minimum (F-02, Medium, open).
4. Anthropic monthly spend cap and Vercel Pro / Supabase Pro, as in the pre-launch report. The new global AI cap (300 calls per rolling 24 h) protects the key but is not a billing limit.
5. Landing page still says "Create free account" (new defect N-1).

## Fixes: verified or failed

| Item (fix-round-prelaunch.md) | Result | How checked |
|---|---|---|
| A. Support email in footer, account menu, 404, error page, auth pages | Verified | `/help`, `/privacy`, `/terms`, 404 on the preview show roberts@intelbeyond.com; local `P-PAGES-1` 7/7 |
| A. `/help` page | Verified | 200, seven steps, AI notice, loss optional, contact |
| A. `/terms` page, "Draft — under review" | Verified | 200 |
| A. Help, Privacy, Terms linked (app footer, auth pages, landing footer) | Verified | Landing footer has all three at 1440 and 390 px |
| A. `/privacy` draft note plus Sydney and United States wording | Verified | `P-PAGES-1.privacy` |
| A. Signup has no "Free" claim (B3) | Partly: signup page verified, landing failed | `/signup` is clean (local test), but the landing has "Create free account" twice (N-1) |
| A. AI data notice shown once, not in every panel | Verified | Preview: no notice before AI; appears at the first AI run; "Got it" hides it; after reload a second AI run did not show it again |
| A. Demo-mode Problem AI panel; "Use this draft" fills fields, Undo | Verified | Signed out: one note, no greyed box. Signed in (real AI, 6.9 s): "Use this draft" changed "What happened?", Undo restored the original text |
| S1 print/PDF clipping and mid-word breaks | Verified | Sample report to PDF (A4, 4 pages): all three tables fit, no split words, Fixes column dropped (`print-p2.png`, `print-p3.png`); local `P-REPORT-1` |
| S2 session-expired save message | Verified | Local `P-AUTH-1.session-lost` (sticky toast, sign-in link, text kept) |
| S3 demo AI panels: one quiet note per step | Verified | Preview demo sample: one note on Problem, Cause tree, Actions, Report; none on Loss, Evidence, Verify |
| S3 new investigation opens neutral | Verified | Quality check shows "3 things to do as you go", no red (`new-problem-empty.png`) |
| S4 similarity does not offer the sample | Verified | Local `P-SIM-1` |
| S5 ghost asset on tag rename | Verified | Local `P-AUTH-1.ghost-asset` |
| S6 photo help text | Verified | Preview: "kept in your account, with the investigation" |
| S7 AI report drafts saved | Verified | Report draft (16 s, real AI) kept after leaving the step and after reload; an edit I made was stored in the database (`reportDrafts`) |
| S8 export file name | Verified | `rca-pilot-my-data-2026-11-19.json`, contains the account email, no tokens |
| S9 stale QA tests repaired | Verified | demo 210/211, loss 114/114, prelaunch-fixes 31/31 |
| C. Loss "Not known yet", downtime-only, rough estimate | Verified, one gap | Preview, signed in: "Loss not costed yet" in Loss, Report, Verify, dashboard rows; downtime hours only still "not costed", no NaN, Verify says "no saving can be shown". Gap: dashboard tile (N-2) |
| D. V-01 global daily AI cap | Verified | SQL as qa-user-b: `ai_consume(..., p_global = 1)` returned `reason: global`; the function exists with the 4-argument signature |
| D. V-02 per-user storage cap | Verified | SQL, rolled back: 10 rows of 4.9 MB inserted, the 11th refused with "Storage limit reached" |
| D. V-03 `ai_refund` needs a ticket | Verified | Wrong ticket false, null ticket false, right ticket true, repeat false; `select refund_secret` gives "permission denied"; old one-argument function gone |
| D. V-05 TRUNCATE etc. revoked | Verified | No TRUNCATE, REFERENCES or TRIGGER grants for anon or authenticated on public tables; `truncate public.investigations` as authenticated: "permission denied". Info: default privileges for objects created by `supabase_admin` in `public` still grant them, but the migrations run as `postgres` |
| D. F-08 password out of HEAD | Not re-checked in code | I read the password from the file only; nothing in my commands needed the old one |
| D. Advisors | As documented | Only the expected SECURITY DEFINER notes (ai_consume x2, ai_refund, delete_own_account) and leaked-password protection off |
| D. V-06 CSP `unsafe-inline` | Skipped by the team, confirmed unchanged | Header `script-src 'self' 'unsafe-inline'` on `/`, `/app`, `/login`, `/help`, 404 |
| E. Plan vs quality-check text; asset status lag | Verified | Local suites; no related failure |

All test rows I created were cleaned up (qa-user-b is back to its sample and the five sample assets; the SQL tests were rolled back).

## Regression sweep

| Area | Result |
|---|---|
| Landing 1440 and 390 px | Pass: headline, no horizontal overflow, footer links, no console errors (`landing-1440.png`, `landing-390.png`). Copy issue N-1 |
| Demo mode, sample through all 7 steps | Pass: no NaN or undefined, no overflow, no console errors or failed requests |
| Signed-in new investigation, all 7 steps | Pass: Problem (with asset tag, register entry), Loss "Not known yet", Evidence, tree (root cause with category and status), action with owner and due, Verify, Report. Reload keeps "Not known yet" |
| Loss with only downtime hours | Pass: "Loss not costed yet", report and Verify wording correct, no NaN |
| Each AI feature once (real key) | Pass: problem draft 6.9 s, cause coach 12.9 s, challenge 9.4 s, CAPA 15.9 s, report draft 16 s, management summary about 10 s. No errors. Report draft text used the user's own facts, did not leak N#/A#/E# labels, said "loss not costed yet", flagged that the "Verified" root cause had no evidence |
| One-time AI notice | Pass (see fixes table) |
| Print / PDF report | Pass |
| Help, privacy, terms, 404 | Pass (200, 200, 200, 404 with support address) |
| Account page export | Pass |
| Phones at 390 px | Pass: dashboard, all seven steps, account, assets, help, privacy, terms: no horizontal overflow, no console errors |
| Headers via curl (preview) | Pass: HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, CSP (with `unsafe-inline` for scripts, known and accepted), also on the 404. `access-control-allow-origin: *` on pages (known, info). Unauthenticated `POST /api/ai/draft` gives 401 "Sign in to use AI." |
| Console | Only preview-only noise: Vercel's toolbar script (vercel.live feedback.js) is blocked by the CSP. It does not exist on the production domain |

## Automated suites (local production build, port 3611)

| Suite | Result |
|---|---|
| `npm ci`, `npm run build` | Green |
| `qa/demo.js` | 210 of 211. The one failure is `D-PERS-1.concurrent-window` (known NEW-01: demo mode, two tabs editing inside the same 350 ms; Low, not part of this round) |
| `qa/loss.js` | 114 of 114 |
| `qa/prelaunch-fixes.js` | 31 of 31 (signed-in part as qa-user-b) |
| `qa/account.js`, `qa/features.js` (and so `run-all.js`) | **Not run.** They hard-code qa-user-a, sign in as both accounts and delete qa-user-a's data (A-ZZ cleanup, account tests); there is no switch to point them at qa-user-b only, and a demo video may be using qa-user-a. The signed-in areas they cover were checked by hand on the preview as qa-user-b (above). Recommend running them once after the demo recording is finished |
| Not run: `npm run lint`, `npm test` (unit tests) | Reported green by the builder; not repeated |

Process note: running two things as qa-user-b at once is unsafe. The `prelaunch-fixes.js` cleanup deleted the investigation my preview script was using, so I rebuilt it and re-ran the report-draft check on a new one. Results above are from the clean re-runs.

## New defects

| ID | Severity | Title | Steps | Evidence |
|---|---|---|---|---|
| N-1 | Medium (copy) | Landing page still promises "Create free account" | Open `/` at any width: the hero button and the closing call to action both say "Create free account". Signup says "Create an account" and has no "Free". This is the same concern as pre-launch B3 (paid pilot, A$2,500 plus A$450 a month). It is the designer's file, which the fix round left alone | `landing-1440.png` |
| N-2 | Low | Dashboard "Open annual loss" tile shows $0 while open investigations are not costed | Create an investigation, set Loss to "Not known yet", open `/app`. The list rows say "Loss not costed yet" (correct) but the tile reads "$0 ... Cash $0 · Opportunity $0". The fix round says the dashboard says "not costed" instead of $0 | `dashboard-uncosted.png` |
| N-3 | Info | Summary draft replaces the report draft | After a report draft, "Management summary" replaces it on screen (one draft at a time). Only the last is stored. Worth one line in Help | |
| N-4 | Info | CSP, CORS and server password rules unchanged | `unsafe-inline` scripts; `access-control-allow-origin: *` on static pages; leaked-password protection off. All were known and are listed in the security audit | headers above |

No Critical or High defects. No new data-loss, calculation or isolation problem.

## Suggested before the first demo call

1. Change the two landing buttons to "Create an account" (or "Try it free during the pilot", if that is the offer).
2. Make the dashboard tile say "Not costed" when no open investigation has a figure.
3. Demo from the production domain, signed in, on a fresh account; expect AI answers in 7 to 16 seconds.
