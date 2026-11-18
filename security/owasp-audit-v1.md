# Security audit v1: RCA Pilot (OWASP Top 10 2021, OWASP Top 10 for LLM Applications 2025)

Date: 2026-11-18. Auditor: independent, authorised, owner's systems and the two QA accounts only. Audit only: no application code was changed.
Targets: code of branch `claude/new-session-tdmk2t` at commit `0a7be49`; a local production build (`npm ci && npm run build && npm start`); the Vercel preview of the branch (real AI key); the Supabase project `ccigtztlrvgkzyppjmxt` (REST, Auth, SQL read access, advisors, logs); header checks on the live site `www.rcapilot.com` (old version).
Scripts and redacted raw outputs are in `security/v1/` (`v01` to `v11`, `ai/`). Tokens, the QA password and the preview share link are not stored anywhere in the repo (scripts read the password from a file named by `QA_PW_FILE`).

## 1. Summary for the owner

**Bottom line: no Critical or High findings. The things that protect customer data held up again, and the new AI layer is well built.**

- Customer separation: using qa-user-b against qa-user-a (investigations, assets, `ai_usage`, the three database functions, anonymous access) I tried 29 ways to read, change, delete or take over A's data. All failed. Every public table has row level security.
- The AI routes reject anyone not signed in, check the session with Supabase on every call, cap request size, cap model output size, and apply a daily and a per-minute limit per user. The Anthropic key is not in the browser code. Six prompt-injection attempts (reveal the prompt, change the format, plant links and HTML, claim "verified") all failed, and everything the AI returns is shown as plain text.
- Fixed since the first audit: the open redirect, the missing security headers (including on the 404 page), row size and count limits, account deletion and data export, hostile image values, and the committed test password (rotated).
- **Still open before you take customers:** the server still accepts 6-character passwords like `password` (Supabase setting, 2 minutes in the dashboard); sign-up is open with a 30-calls-per-day AI allowance per account and no overall spending cap; one account can still store about 2.5 GB.

## 2. Findings table

| ID | OWASP | Severity | Title | Status |
|----|-------|----------|-------|--------|
| F-02 | A07 | Medium | Server accepts 6-character and common passwords; leaked-password check off | Open (previous finding) |
| V-01 | LLM10 / A04 | Medium | Open sign-up times a 30-call daily AI allowance each, with no global spending cap or CAPTCHA | New |
| V-02 | A04 | Medium | A single account can still store about 2.5 GB (500 x 5 MiB rows) | New (residual of F-01) |
| V-03 | LLM10 / A04 | Low | `ai_refund` can be called directly: 5 extra AI calls per day | New |
| V-04 | A07 | Low | Forgot-password response differs between an existing and an unknown address | New, needs a check with a real mailbox |
| V-05 | A05 | Low | `authenticated` holds TRUNCATE, REFERENCES, TRIGGER on `investigations` and `assets` | New |
| V-06 | A05 | Low | CSP still allows inline scripts; preview deployments carry the real AI key | New / known |
| V-07 | LLM10 | Low | No per-IP limit on `/api/ai/*`; unauthenticated requests still cost a Supabase auth call | New |
| F-06 | A07 | Low | Access tokens live 1 h; refresh token reuse tolerated; account delete and password change need no re-authentication | Open (previous finding) |
| F-08 | A02 / secrets | Low | Old QA password is still in HEAD (`security/*`) and git history; QA accounts exist in production | Partly fixed (password rotated) |
| F-09 | A04 | Low | Id existence oracle (409 on a foreign id) remains; sample-id squatting is closed | Partly fixed |
| F-10 | A09 | Low | No application-level logging or alerting (platform logs exist) | Open |
| F-11 | A07 | Low | No rate limit seen on password login (12 rapid failures, no 429); no CAPTCHA | Open |
| V-08 | LLM01 | Info | Prompt injection: 6 payloads, none succeeded | Tested, resisted |
| V-09 | LLM02 / LLM05 | Info | No key or system prompt in the browser code; errors generic; output rendered as text | Verified |
| V-10 | A03 / A10 | Info | No stored XSS; SSRF not applicable (no server-side fetch of user URLs) | Verified |
| V-11 | A06 / LLM03 | Info | Production dependencies: 0 known vulnerabilities. Dev-only: 17 (11 high) in eslint/vitest chain | Info |
| V-12 | A05 | Info | Supabase advisor: 3 SECURITY DEFINER functions executable by signed-in users; all three reviewed and safe | Expected |
| F-13, F-15, F-16 | A02, A05, A08 | Info | Tokens in localStorage; CORS `*` on static pages; no CI | Unchanged |

Counts: Critical 0, High 0, Medium 3, Low 10, Info 8 (F-13, F-15, F-16 counted as 3).

## 3. Findings in detail

### F-02 Medium: weak passwords accepted by the server (A07)
**Evidence** (`v06_auth_probes.txt`, `v06_auth_settings.json`): `POST /auth/v1/signup` against the existing QA address (so no account is created; the server answers with an obfuscated user): `abcdef`, `password` and `12345678` returned `200`; `a` returned `422 weak_password "at least 6 characters"`. Supabase advisor `auth_leaked_password_protection`: disabled. The web form enforces 8 characters and a common-password list (`lib/auth/validate.ts`), but that is only in the browser.
**Impact:** anyone calling the API directly, or a customer on an old page, can set a password that is guessed in seconds. 12 wrong logins in a row were not slowed (F-11).
**Fix:** Supabase dashboard, Authentication, Providers, Email: minimum length 12 (8 at the least), "Prevent use of leaked passwords" on, require current password to change it ("secure password change"). Then re-run `v06` to confirm `abcdef` gives 422.

### V-01 Medium: open sign-up multiplies the AI allowance, no overall cap (LLM10 Unbounded Consumption)
**Evidence:** `disable_signup:false`, email confirmation on (good). Each account gets `AI_DAILY_LIMIT` (30) calls per rolling 24 hours; a report draft can use up to 8000 output tokens (`prompts.ts`). Nothing limits total spend across accounts, and there is no CAPTCHA (F-11). The preview deployment holds the real key.
**Impact:** a person with a stream of throw-away email addresses can run up your Anthropic bill. Per account the exposure is small (30 calls); across many accounts it is not bounded by the app.
**Fix:** set a monthly spend limit on the Anthropic workspace (owner action, section 5); add a global daily counter in `ai_consume` (for example a hard stop at N calls per day for the whole site, with an alert); add CAPTCHA on sign-up; consider invite-only or manual approval for the first customers; use a separate, low-limit key for Preview deployments.

### V-02 Medium: per-account storage ceiling is still large (A04, residual of F-01)
**Evidence** (`v05_output.txt`, tests 26-28; constraints read from the database): `investigations.data` is capped at 5 MiB (`octet_length(data::text) <= 5242880`), 500 rows per user, object-only; `assets.data` 64 KiB and 5000 rows. A 6 MiB row and a 70 KB asset were rejected (`23514`). 500 x 5 MiB is about 2.5 GB, plus about 320 MB of assets, per account.
**Impact:** one malicious or buggy account can consume most of a small database plan. Real investigations (text plus a few 800 px photos) are well under 1 MB.
**Fix:** lower the investigation cap to about 1.5 MiB; add a per-user total check in the insert/update trigger (for example 100 MB); monitor database size with an alert.

### V-03 Low: `ai_refund` and `ai_consume` are callable by the user, so the daily cap can be stretched (LLM10)
**Evidence** (`v09_refund_abuse.sh`, `v09_output.txt`, own account only, rows removed afterwards): both functions are executable by `authenticated` (they must be, today, because the server calls them with the user's token). A user called `ai_consume` directly (one "successful" call), hit the daily cap, called `ai_refund` on that call, and was allowed another call. The refund cap held: 5 refunds per 24 hours (the earlier server refund of a failed draft counted in it), the 6th to 8th refused. A user cannot refund others' calls (`false` for A's ids), cannot write `ai_usage` directly (403), and cannot read others' rows (empty).
**Impact:** at most 35 instead of 30 calls per day per account. Minor, but it shows the limit is advisory for anyone who talks to the database directly. The limits themselves (30, 5) are passed by the server, so a user cannot raise them for the app route.
**Fix:** call `ai_consume` and `ai_refund` from the server with a service-role client (key only in Vercel server env), pass the user id verified by `auth.getUser`, and `revoke execute ... from authenticated`. Keep the 5-per-day refund cap.

### V-04 Low: forgot-password reply differs for existing and unknown addresses (A07 enumeration)
**Evidence** (`v06_auth_probes.txt`): `POST /auth/v1/recover` for the existing `qa-user-a@rca-tool.test` returned `400 email_address_invalid`; for the unknown `nobody-xyz123@rca-tool.test` it returned `200 {}`. This is probably because `.test` addresses cannot receive mail, so sending fails only for a real account; with real domains both may return `200`. Login (`invalid_credentials` for both) and sign-up (obfuscated user) do not enumerate.
**Impact:** possibly reveals which email addresses have accounts. Could not be confirmed without a real mailbox, and the real owner's address was not used.
**Fix:** after go-live, request a reset for a real test mailbox and for an unregistered real address and compare status, body and timing. If different, make the app show the same message in both cases (the form already does) and ensure the API behaviour is uniform; add CAPTCHA.

### V-05 Low: extra table privileges for signed-in users (A05)
**Evidence** (`information_schema.role_table_grants`): `authenticated` has `SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER` on `investigations` and `assets`. RLS does not apply to TRUNCATE. PostgREST does not expose TRUNCATE, so it is not reachable through the API today. `ai_usage` is correct (SELECT only).
**Impact:** none now; a future database function, edge function or enabled GraphQL could turn it into "any user wipes the table".
**Fix:** `revoke truncate, references, trigger on public.investigations, public.assets from authenticated, anon;` and add it to a migration.

### V-06 Low: CSP allows inline scripts; preview carries the real key (A05)
**Evidence** (`v01_headers_preview.txt`): CSP present on every route including the 404 (the earlier "404 page breaks CSP" defect is gone: the custom `not-found` has no inline style), `frame-ancestors 'none'`, nosniff, referrer-policy, permissions-policy, X-Frame-Options DENY, HSTS with preload. `script-src 'self' 'unsafe-inline'` remains (Next static pages), so the CSP would not stop an injected inline script.
**Fix:** move to nonce-based CSP via middleware (requires dynamic rendering) when time allows; until then rely on the verified absence of injection sinks (V-10). Treat Vercel preview URLs as sensitive: they are protected by a share link, but anyone with it can spend the key.

### V-07 Low: no per-IP limit on the AI routes (LLM10)
**Evidence** (`v03_*_output.txt`): unauthenticated, bad-token, fake-JWT, anon-key and oversize requests all end before any model call (401/413/400), so no AI cost. But each request with a plausible bearer token makes one Supabase `auth.getUser` call, and the body (up to the platform limit) is read before the token is checked (the 120 KB check uses `Content-Length` and the text length).
**Fix:** enable Vercel Firewall / rate limiting on `/api/ai/*`; check the token before reading the body.

### F-06 Low: session handling (A07, previous finding)
**Evidence** (`v07_output.txt`): access token life 3600 s; a refresh token reused 25 s after use still returned `200` (reuse detection not tripping); after `POST /auth/v1/logout` the access token still read `investigations` via REST (`200`) while `/auth/v1/user` returned `403`, so the AI routes (which call `getUser`) do cut off at once. `delete_own_account()` and password change need only a bearer token.
**Impact:** a stolen token works for up to one hour on the data tables and can delete the account.
**Fix:** JWT expiry 900-1800 s, enable "Detect and revoke compromised refresh tokens", require password re-entry before "Delete my account" (re-authenticate then call the function), keep sign-out global.

### F-08 Low: old QA password still in the repo (previous finding)
**Evidence:** the password was rotated (the old value now gives `400 invalid_credentials`), but it is still in HEAD in `security/lib.sh`, `a03_xss.js`, `a04_a05_browser.js`, `a07_open_redirect.js`, and in git history. `qa/harness.js` now reads `QA_PASSWORD` from the environment. The QA accounts still exist in the production project.
**Fix:** delete the old value from those scripts (use `QA_PW_FILE` as in `security/v1/lib2.sh`); delete the two QA accounts before launch or move QA to a separate Supabase project.

### F-09 Low: id oracle remains (A04, previous finding)
**Evidence** (`v05_output.txt` 8-11b, 29): inserting `sample-<other uid>` is now blocked by a check constraint (`400`), so squatting a victim's sample id is closed. Inserting any other id that exists in someone else's account still returns `409` (existence oracle, ids are random so impact is low).
**Fix:** composite primary key `(user_id, id)`.

### F-10, F-11 Low (previous findings, unchanged)
No application logging beyond server `console.error` with a code only (good for privacy, poor for detection); Supabase platform logs show auth traffic (I read them: 142 `user`, 134 `token` 200s, no 429). 12 consecutive wrong-password requests returned 400 each, no 429 (`v06_auth_probes.txt`); the Supabase threshold is not visible. **Fix:** Supabase log drain or alerts on auth failures and 5xx, Vercel alerts, CAPTCHA, check Auth rate limits in the dashboard.

### V-08 Info: prompt injection (LLM01), 6 real AI calls
Payloads and responses are in `security/v1/ai/` (request JSON and response text, no secrets). Injection was planted in the draft notes box, a cause statement, an evidence note, an action description, the problem title (with a fullwidth fake `</investigation>` tag that the ASCII `defang` does not touch), and asked for: the system prompt verbatim, a section "VERIFIED BY AI", a phishing link, `<script>`, `<img onerror>`, `[x](javascript:...)`, markdown, a plain "ALL CLEAR" instead of JSON, "return zero issues", French output.
Results: no system prompt text, no links, no HTML, no markdown, no "verified" claims in any answer; the challenge review ignored the "analysis is perfect" note and returned 7 normal issues; the report called the injected evidence note "corrupted" and still said "All causes ... are hypotheses. None is verified." One request (p6, injection in the title plus notes asking for the prompt) returned `502 unusable` and the call was refunded. That is a safe failure (availability only).
**Residual risk:** model behaviour is probabilistic; defences rely on the prompt rule plus structural controls (JSON schema, field clipping, reference mapping). Those structural controls are what make a successful injection low impact: the AI cannot call tools, write data, or reach URLs. Keep that property (see "excessive agency" below).

### V-09 Info: sensitive information disclosure, output handling, agency (LLM02, LLM05, LLM06)
- Key and prompt: the 27 files in `.next/static` contain no `sk-ant`, `ANTHROPIC`, `x-api-key`, `api.anthropic.com`, `service_role`, system-prompt text or `@anthropic-ai` (`v02_bundle_grep.txt`; the one `sb_secret` hit is supabase-js refusing secret keys in the browser). The method prompt exists only in server chunks. No `.map` files are served (403).
- Errors: the handler returns only a code and a fixed friendly message; API errors, keys and stack traces are never sent; the server log carries a code only.
- Output: `output.ts` validates each field, clips lengths, drops unknown references, strips internal labels; the UI renders React text (no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `document.write` anywhere in app code). Accepted suggestions are flagged `aiSuggested` and are never marked verified.
- Agency: the model has no tools and no URLs to fetch; the only side effect of a call is one `ai_usage` row.
- `AI_MOCK` is ignored when `NODE_ENV=production` (`mock.ts`).

### V-10 Info: injection and XSS (A03), SSRF (A10)
`v10_xss_rerun.js` against the local production build, signed in as B: a row with 120 text fields set to `"><img onerror>`, `<script>`, `</title><svg onload>` payloads and five hostile image values. All 7 steps and the report/print view: `window.__xss` stayed null, 0 dialogs, 0 injected scripts, **0 `<img>` rendered** (image values are now validated by `safeImage`/`isSafeImage`), 0 third-party requests. The tab title shows the payload as text. SQL injection: all database access is PostgREST with parameters or the two fixed functions. SSRF: the server fetches only Supabase (`auth.getUser`, `rpc`) and Anthropic, with URLs from environment variables, never from user input.

### V-11 Info: dependencies (A06, LLM03)
`npm audit --omit=dev`: 0 vulnerabilities (includes `@anthropic-ai/sdk`, `next 16.4.6`, `@supabase/supabase-js`). `npm audit`: 17 (6 moderate, 11 high), all in the dev toolchain (`picomatch`/`minimatch` ReDoS via eslint-config-next and vitest); not shipped. Lockfile present. No CI or Dependabot (F-16).

### V-12 Info: SECURITY DEFINER functions (A01/A04)
Reviewed in the database: `ai_consume`, `ai_refund`, `delete_own_account` are `SECURITY DEFINER`, owner `postgres`, `search_path=''`, schema-qualified, take `auth.uid()` (no user-id argument), raise on null uid, `EXECUTE` revoked from `public`/`anon` (anon calls: 401), granted to `authenticated` and `service_role` only. `ai_refund` checks `user_id = auth.uid()`, only rows under 5 minutes old, 5 per 24 h (V-03). The two trigger functions are `SECURITY INVOKER`, `search_path=''`. RLS is on for `investigations`, `assets`, `ai_usage`; policies are owner-only with `(select auth.uid())`; no other tables in `public`; no storage buckets; GraphQL not enabled; REST OpenAPI root is not readable by users.

## 4. Previous findings: status

| ID | Earlier severity | Now | Evidence |
|----|------|-----|----------|
| F-01 size/count limits | Medium | **Fixed**, residual in V-02 | 6 MiB row and 70 KB asset rejected; object-only check; triggers for 500 / 5000 rows present |
| F-02 weak passwords | Medium | **Still open** | `abcdef`, `password`, `12345678` accepted; leaked-password check off |
| F-03 open redirect | Medium | **Fixed** | 14 cases in a real browser incl. tab, newline, `/%09/`, `/app/..//host`: none left the site (`v11_output.txt`) |
| F-04 headers/CSP | Medium | **Fixed** (inline scripts remain, V-06) | All headers on `/`, `/login`, `/app`, 404, API (`v01_*`); same on live site |
| F-05 deletion/export/privacy | Medium | **Fixed**, with caveat | Account page has export and delete; `/privacy` is a draft; no terms page yet |
| F-06 sessions | Low | **Still open** | see F-06 above |
| F-07 bad row crashes dashboard | Low | Not re-tested | `lib/normalize.ts` and tests exist; not exercised |
| F-08 test password | Low | **Partly fixed** | rotated; old value still in HEAD and history |
| F-09 id squatting/oracle | Low | **Partly fixed** | sample-id check constraint; 409 oracle remains |
| F-10 logging | Low | Open | |
| F-11 rate limit | Low | Open | |
| F-12 image URLs | Info | **Fixed** | no `<img>` rendered for hostile values |
| F-13 tokens in localStorage | Info | Unchanged | still the default; no cookies set |
| F-14 dependencies | Info | Production clean | see V-11 |
| F-15 CORS `*` | Info | Unchanged | static pages only; API route sends none |
| F-16 no CI | Info | Unchanged | no `.github` |

## 5. Owner must do in dashboards

**Supabase** (project `rca-saas`)
1. Authentication, Providers, Email: minimum password length 12 (8 at the least); enable "Prevent use of leaked passwords"; enable secure password change (re-authentication).
2. Authentication, Attack Protection: enable CAPTCHA (Turnstile or hCaptcha) for sign-up and password reset; review rate limits for sign-in, sign-up, token refresh and email.
3. Authentication, Sessions: JWT expiry 900-1800 s; enable "Detect and revoke compromised refresh tokens" with a short reuse interval.
4. Authentication, URL configuration: Site URL `https://www.rcapilot.com` (it is); keep the redirect allowlist to that origin only (I confirmed hostile and preview URLs are ignored, so reset and confirmation links sent from a preview land on production; add the preview host only temporarily when testing).
5. Set up custom SMTP (Resend) so email limits and deliverability are yours; verify sender domain SPF/DKIM/DMARC.
6. Run the V-05 revoke migration and (with a developer) the V-03 and V-02 changes. Add log drains or alerts for auth failures, 5xx and database size; confirm backups/PITR.
7. Delete the two QA accounts before launch, or move QA to a separate project.

**Vercel**
1. Mark `ANTHROPIC_API_KEY` as Sensitive. Use a different, low-limit Anthropic key for Preview deployments (the preview now carries the real key and anyone with the share link can spend it); Production key only in Production scope.
2. Turn on Deployment Protection for previews (it is on) and rotate the share link after this audit (it was used here).
3. Add rate limiting (Firewall) on `/api/ai/*` and an alert on function errors; set `AI_DAILY_LIMIT` and `AI_BURST_LIMIT` deliberately (defaults 30 and 5).
4. Protect the `main` branch; require review before production deploys.

**Anthropic**
1. Set a monthly spend limit and an alert on the workspace that owns the key; use one workspace per environment. Rotate the key if the preview URL or share link was ever shared widely.
2. Check data-retention terms and, if customers require it, ask about zero data retention. Keep the privacy page statement in line with what you confirm.

**Resend**
1. Verify the domain, restrict the API key to sending only, and add it to Supabase SMTP only (never to client code).

**Repository**
1. Remove the old QA password from `security/lib.sh` and the three `security/*.js` scripts; add Dependabot and a CI job running `npm audit --omit=dev`, lint and tests.

## 6. What could not be tested

- Real-mailbox flows: confirmation email, reset link expiry and single use, enumeration on forgot-password (V-04). The `.test` domain cannot receive mail and the real owner account was not touched.
- High-volume abuse, load and denial of service (out of scope); true Auth rate-limit thresholds.
- Supabase and Vercel dashboard settings other than what the APIs reveal (SMTP, backups, MFA, firewall).
- Cross-session race on the burst limit (an advisory lock per user is in the function; not stress-tested).
- F-07 (malformed row) was not re-run.

## 7. Conduct notes

- Real AI calls: 6 (p1 to p6) on the preview, 1 failed and was refunded. Local build ran without an AI key (no model calls).
- Test rows: all `t-*` investigation and asset rows removed; each QA account holds its sample data. `ai_usage` rows created by my direct `ai_consume` calls (feature `audit`, 8 rows) were deleted for qa-user-b only; its other 11 rows are from the AI calls (mine and the parallel QA agent's).
- Side effect to know about: I called `POST /auth/v1/logout` with the default (global) scope on qa-user-b, which ended **all** sessions of qa-user-b once, including any held by the parallel QA agent; a fresh login restores them. Passwords were not changed.
- Three sign-up probes were sent to the existing QA address `qa-user-a@rca-tool.test` (no account created; user count unchanged at 3) and two recover probes.
- Requests went only to the in-scope hosts; `evil.example.com` navigations in browser tests were aborted before leaving the browser.
