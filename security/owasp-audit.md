# Security audit: RootLoop (rca-platform), OWASP Top 10 (2021) and ASVS L1

Date: 2026-11-16. Scope: source in `web/`, live site `https://rca-tool-omega.vercel.app`, Supabase project `ccigtztlrvgkzyppjmxt` (REST and Auth APIs only). Accounts used: the two QA test accounts. Audit only: nothing was fixed. Scripts and raw outputs are in this folder (`a01_*`, `a03_*`, `a04_*`, `a05_*`, `a07_*`; `lib.sh` holds shared helpers). Tokens are redacted everywhere.

## 1. Executive summary (for the owner)

**Bottom line: the thing that matters most is sound.** Customers' data is properly separated. Using user B's login, I tried 19 different ways to read, change, delete, steal or overwrite user A's investigations (and anonymous access). All failed. The database rules do their job. I also tried to plant malicious scripts in every text field and in uploaded photos; the app showed them as harmless text and did not run them. There is no server code of your own that could be attacked (no API routes), and no secrets were found in the code, in the live website's code or in the full git history.

**What is weak is everything that sits around that core.** None of it lets one customer see another customer's data, but several items should be fixed before you charge businesses money:

1. **No limit on how much one account can store.** I saved a single 40 MB record into a test account without any complaint, and 100 records in one call. A single free or paid user can run up your database bill or fill the quota. (Medium)
2. **The "8 character password" rule is only a rule in the web page.** The server accepts 6 characters and common passwords like `password` and `12345678` when called directly. There is also no "leaked password" check. (Medium)
3. **A crafted login link can send a user to another website after they sign in** (phishing risk). Confirmed with a hidden tab or newline character in the link. (Medium)
4. **The website sends none of the standard browser protections** (no Content-Security-Policy, no anti-framing, etc.). Anyone can put your login page inside their own page (clickjacking), and if a script injection bug ever appears, nothing would contain it. (Medium)
5. **A malformed record breaks the whole dashboard** for that user, and they cannot fix it from the app. Today only the user themselves can cause it, but it is fragile. (Low)
6. **Business-customer basics are missing:** no way to delete an account, no way to export data, no privacy notice, no activity logging you control. (Medium for selling to companies)
7. The QA test password is committed in the repository and works against the live database. Harmless today, a real problem if the repository is ever shared. (Low)

Nothing rated Critical or High was found.

## 2. Findings table

| ID | OWASP | Severity | Title | Status |
|----|-------|----------|-------|--------|
| F-01 | A04 Insecure design | Medium | No server-side limit on row size or row count per user | Confirmed |
| F-02 | A07 Auth failures | Medium | Password policy enforced only in the browser; server minimum is 6, no breached/common-password check | Confirmed |
| F-03 | A01 / A07 | Medium | Open redirect after login via `next` parameter (tab/newline bypass of `safeNext`) | Confirmed |
| F-04 | A05 Misconfiguration | Medium | No CSP, X-Frame-Options/frame-ancestors, nosniff, Referrer-Policy or Permissions-Policy; site is frameable | Confirmed |
| F-05 | A04 / privacy | Medium | No account deletion, no data export, no privacy/terms pages | Confirmed (absence in source and UI) |
| F-06 | A07 Auth failures | Low | Sessions are not revoked on sign-out or password change; refresh token reusable after rotation | Confirmed |
| F-07 | A04 Insecure design | Low | Stored `data` is not validated; a malformed row crashes `/app` and cannot be removed from the UI | Confirmed |
| F-08 | A08 / Secrets | Low | Test-account password committed in `qa/` (README, harness.js, git history); works on production | Confirmed |
| F-09 | A04 Insecure design | Low | Client-supplied global primary key: id existence oracle and id squatting (`sample-<uid>` is predictable) | Confirmed mechanism; victim impact theoretical |
| F-10 | A09 Logging | Low | No application logging, audit trail, alerting or error reporting | Confirmed (absence) |
| F-11 | A07 Auth failures | Low | No rate limiting observed on password login (6 rapid failures, no 429); no CAPTCHA on open sign-up | Confirmed (limited probe) |
| F-12 | A03 Injection | Info | Image field accepts any URL; hostile values cause the browser to request external URLs (no script execution) | Confirmed |
| F-13 | A02 Crypto / sessions | Info | Access and refresh tokens in `localStorage` (supabase-js default) | Confirmed |
| F-14 | A06 Components | Info | `npm audit`: 7 moderate, all dev-only (eslint toolchain, minimatch DoS); 0 in production deps | Confirmed |
| F-15 | A05 Misconfiguration | Info | `access-control-allow-origin: *` on site pages; Supabase CORS also `*` | Confirmed |
| F-16 | A08 Integrity | Info | No CI, no dependency-update automation; `.vercel`/deploy config not in repo; Vercel build is the only gate | Confirmed (absence in repo) |

## 3. Findings in detail

### F-01 Medium: No limit on row size or count (A04)
**Evidence** (`a04_limits.sh`, `a04_output.txt`), user B, valid session:
- `POST /rest/v1/investigations` with `{"id":"t-big-40","data":{"blob":"A"×40 MiB}}` returned `HTTP 201` in 7.7 s. 1 MiB and 8 MiB rows also `201`.
- One POST with a JSON array of 100 rows returned `201`; `Prefer: count=exact` then showed `content-range: 0-103/104`.
- `data` accepted any shape (array with `__proto__` key: `201`).
- All test rows deleted afterwards; B ended with only the sample.

**Impact:** any signed-in user (sign-up is open) can fill your Supabase database and bandwidth quota with a few requests, or make their own account slow. Because the app loads all of a user's rows on the dashboard, one huge row also makes that user's own app heavy. I did not measure the load time effect reliably (my probe was inconclusive), so that part is theoretical.

**Fix:** add a database `CHECK (pg_column_size(data) < 1000000)` (or `octet_length(data::text)`) on `data`; cap rows per user with a `BEFORE INSERT` trigger (for example 500); add a `CHECK` that `jsonb_typeof(data)='object'`; set an upper request-body limit if the plan allows; add per-user quota monitoring.

### F-02 Medium: Password rule is client-only; weak passwords accepted by the server (A07/ASVS 2.1)
**Evidence** (`a07_auth.sh`, `a07_output.txt`): authenticated `PUT /auth/v1/user {"password":"<value>"}` as B:
- `"a"` returned `422 weak_password "Password should be at least 6 characters."`
- `"abcdef"`, `"password"`, `"12345678"` all returned `200` (password changed; I restored the original and confirmed login works again).
The web form requires 8 (`lib/auth/validate.ts` `MIN_PASSWORD_LENGTH = 8`), but anyone can call the Auth API directly. Public `/auth/v1/settings` does not show a minimum. Sign-up itself was not tested (rule: no made-up addresses); sign-up uses the same server-side policy, so the same limits are expected (theoretical for sign-up).

**Impact:** customers (or attackers calling the API) can pick very weak passwords that are easy to guess. ASVS L1 expects at least 8 characters and a check against common/breached passwords.

**Fix:** in Supabase Auth settings set minimum length to 12 (at least 8), enable "Prevent use of leaked passwords" (HaveIBeenPwned) and character requirements if desired; keep the client check only as a convenience. Also enable "require current password / reauthentication to change password" (secure password change).

### F-03 Medium: Open redirect after login (A01/A07, ASVS 5.1.5)
**Evidence** (`a07_open_redirect.js`, `a07c_output.txt`): in a real browser, sign in on `/login?next=<value>` (attacker host requests were aborted, never sent):
- `//evil.example.com`, `/\evil.example.com`, `https://evil.example.com`: safely ignored (landed on `/app`).
- `next=%2F%09%2Fevil.example.com` (literal tab) and `%2F%0A%2Fevil.example.com` (newline): **the app navigated to `https://evil.example.com/`**.
Cause: `safeNext()` in `lib/auth/validate.ts` rejects `//` and `\` but not control characters; the browser's URL parser strips tab/newline, turning `/<TAB>/evil.example.com` into `//evil.example.com`.

**Impact:** an attacker can send a victim a real `rca-tool-omega.vercel.app/login?...` link; after the victim signs in, they land on the attacker's look-alike site (for example "session expired, enter your password again"). Trust in your domain is abused.

**Fix:** validate with the URL parser: `const u = new URL(next, location.origin); if (u.origin !== location.origin) fallback;` then use `u.pathname + u.search + u.hash`. Reject any char below 0x20 and `%0[9AD]`. Add these cases to `validate.test.ts`.
(The email redirect parameters are safe: Supabase `verify?redirect_to=` with three hostile values all redirected to the configured site URL only.)

### F-04 Medium: Missing HTTP security headers, site is frameable (A05, ASVS 14.4/14.5)
**Evidence** (`a05_headers.sh`, `a05_output.txt`; `a04_a05_browser.js` section C): `curl -I` on `/`, `/login`, `/app` shows only `strict-transport-security` (good), `access-control-allow-origin: *`, `cache-control`. Absent: `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. A page on a foreign origin embedded `<iframe src="https://rca-tool-omega.vercel.app/login">` and the site loaded inside it.

**Impact:** clickjacking (an attacker overlays your real login or "delete" buttons under a decoy); no defence-in-depth if script injection ever occurs (see F-12/F-13: tokens are readable by any script on the page).

**Fix:** in `next.config.ts` `headers()` add at least: `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'` (Next needs inline scripts unless you adopt nonces); `img-src 'self' data: blob:`; `connect-src 'self' https://ccigtztlrvgkzyppjmxt.supabase.co`; `frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`; `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy: camera=(), microphone=(), geolocation=()`; `X-Frame-Options: DENY`.

### F-05 Medium (for B2B): No account deletion, data export, or privacy documentation (Privacy / A04)
**Evidence:** source and UI contain no delete-account, export or download function, and no privacy policy, terms, cookie or consent text (`grep` across `app/ components/ lib/`). Data held per account: email address, password hash (Supabase Auth), sign-in timestamps/IP (Supabase Auth logs), and free text the user types (asset names, people names in `owner`, incident descriptions, costs, photos), all in `public.investigations.data`. Data lives in Supabase (region not verified).

**Impact:** companies will ask for a DPA/privacy notice and will need GDPR-style erasure and portability. Today you could only delete a user by hand in the Supabase dashboard (the FK `ON DELETE CASCADE` does remove their rows, per the schema you gave; not exercised).

**Fix:** add "Download my data (JSON)" and "Delete my account" (needs a server-side function with the service role, for example a Supabase Edge Function that re-authenticates the user); publish a privacy notice and terms; list sub-processors (Supabase, Vercel); document retention and backup policy.

### F-06 Low: Sessions outlive sign-out and password change (A07, ASVS 3.3)
**Evidence** (`a07_auth2.sh`, `a07b_output.txt`):
- After `POST /auth/v1/logout` (204), the same access token still read data: `GET /rest/v1/investigations` returned `200` with the row. The refresh token was revoked (`refresh_token_not_found`). Access token life is 3600 s.
- Changing the password (F-02 test) did not end the existing session: the same token was used to set the password back.
- Reusing an already-rotated refresh token 20 s later returned `200` with fresh tokens, so reuse detection did not trip (I cannot tell if this is the configured reuse interval or a setting).
- Password change needs only a bearer token, not the current password.

**Impact:** a stolen token (for example from a shared computer) keeps working up to one hour after the owner signs out. A stolen refresh token is not cut off by rotation.

**Fix:** shorten JWT expiry (for example 15-30 min), enable "Detect and revoke compromised refresh tokens" with a short reuse interval, require reauthentication for password change, offer "sign out everywhere" (`signOut({scope:'global'})`), and revoke other sessions after a password reset.

### F-07 Low: Stored `data` is not validated; one bad row bricks the dashboard (A04/A08)
**Evidence** (`a04_a05_browser.js` section A, `a04b_output.txt`): inserted `{"id":"t-bad-1","data":{}}` as B, opened `/app`. Result: "This page couldn't load", console `TypeError: Cannot read properties of undefined (reading 'recurred')`; the sample card was not shown. Row removed via API.

**Impact:** today only the owner can write their rows (RLS), so this is self-inflicted or a future-bug risk (a schema change, a failed import). The user cannot recover from the UI because the list page itself crashes.

**Fix:** validate and normalise rows on read (skip or quarantine invalid rows, show an error card with a Delete button); validate on write (database `CHECK` or an RPC); version `schemaVersion` migrations.

### F-08 Low: QA test password committed and valid on production (Secrets)
**Evidence:** `qa/harness.js:7` and `qa/README.md:9` contain the shared test password (value redacted here); it appears in git history (`git log -p`). Both accounts exist in the production Supabase project and the password logs in successfully. Scan of the working tree, all 17 commits and the live JS bundle (`bundle`, 943 KB, 6 pages) found no `sb_secret_`, `service_role`, database URLs, private keys or JWTs. The publishable key appears in the bundle (public by design). `web/.env.local` exists on disk but is git-ignored and was never committed. `qa/shots/*.png` (committed screenshots) were not reviewed for personal data.

**Impact:** if the repository is ever made public, shared with a contractor, or the QA scripts leak, anyone can sign in as the test users on production and use them as a foothold for storage abuse (F-01). Low today because the repository is private (not verified).

**Fix:** rotate the password now; move test credentials to an env var/secret store; run QA against a separate Supabase project or branch; delete the QA accounts before launch (or disable sign-in for them).

### F-09 Low: Client-supplied global primary key (A04)
**Evidence** (`a01_output.txt`, tests 9-11b): `id` is a global text primary key chosen by the client. B inserting an id that already belongs to A returns `409 duplicate key value violates unique constraint "investigations_pkey"` (test 11/11b with a row A created). The error tells B that the id exists in someone else's account. Upsert (merge-duplicates) onto A's id returned `403`, `ignore-duplicates` returned an empty `201`; nothing was overwritten. The app's seeded sample id is `sample-<user uuid>` (predictable if you know the uuid). A user could therefore pre-create `sample-<victim uuid>` and make the victim's first-login seeding fail: this mechanism works (any user can insert an arbitrary id) but needs the victim's uuid, which I did not obtain, so the attack on a real victim is theoretical.

**Impact:** low (uuids are random and hard to learn), but it is a collision/squatting and existence-oracle surface.

**Fix:** make the primary key `(user_id, id)` or a server-generated uuid (`DEFAULT gen_random_uuid()`) and keep the client's id in `data`; seed the sample via a database trigger on `auth.users` or an RPC.

### F-10 Low: No application logging or monitoring (A09, ASVS 7)
**Evidence:** no logging, analytics or error-reporting code in `app/ components/ lib/` beyond UI messages; no API routes; no CI. Available but not reviewed (I had no dashboard access): Supabase Auth/API logs and Vercel access logs.

**Impact:** you would not notice credential-stuffing, a spike of writes (F-01), or a data-export attempt. Also no audit trail for customers.

**Fix:** turn on Supabase log drains/alerts (failed logins, 4xx/5xx spikes, DB size), Vercel alerts, client error reporting (for example Sentry without PII), an `updated_by`/audit table if customers ask, and an incident contact page.

### F-11 Low: Rate limiting and sign-up abuse (A07)
**Evidence** (`a07_auth2.sh`): six consecutive wrong-password requests to `/auth/v1/token` all returned `400 invalid_credentials`, no `429` or delay. Only a handful was sent on purpose, so Supabase's built-in limits (which exist at higher volume) were not reached or measured. Sign-up is open (`disable_signup:false`) with email confirmation required (`mailer_autoconfirm:false`, good) and no CAPTCHA configured that I could see.
Login responses do not enumerate users: unknown email and wrong password give the identical `400 invalid_credentials`. Sign-up with an existing address returns an obfuscated user (`identities: []`) instead of an "already registered" error (no enumeration). Forgot-password enumeration could **not** be tested (see section 5).

**Fix:** enable CAPTCHA (Turnstile/hCaptcha) on sign-up and password reset, confirm the Auth rate limits in the dashboard, and consider custom SMTP so email-sending limits are yours.

### F-12 Info: Image field accepts arbitrary strings; hostile URLs trigger outbound requests (A03)
**Evidence** (`a03_xss.js`, `a03_output.txt`): via REST I stored five hostile `image` values (SVG data URL with `<script>` and `onload`, `javascript:` URL, `data:text/html`, attribute-breaking string, external `https://evil.example.com/track.gif`) plus an XSS payload in all 76 text fields (`"><img onerror>`, `<script>`, `</title><svg onload>`, template syntax). I opened the row as B and visited all 7 steps including the Report/print view. Observed: `window.__xss` stayed `null`, no dialogs, 0 injected script/onerror elements; the title was set as plain text (`document.title` contained the literal payload, harmless). The browser did attempt to fetch the external image URL and the `javascript:` src (blocked by the browser inside `<img>`). I aborted the evil.example.com requests in the browser, so no traffic left to that host.

**Impact:** no script execution found. A tracking-pixel style request to any attacker URL is possible only if the attacker can put data into the victim's account (no sharing feature exists today, so only the owner's own data). It becomes relevant if you add sharing, team accounts or report links.

**Fix:** validate on save that `image` starts with `data:image/jpeg;base64,` (or `image/png`) and is under a size limit, and add `img-src 'self' data:` in the CSP (F-04). No `dangerouslySetInnerHTML`, `innerHTML` or `eval` exists in the app source (the 16 hits in the production bundle are React/Next internals).

### F-13 Info: Tokens in `localStorage` (A02, ASVS 3.2)
**Evidence** (`a03_output.txt`): key `sb-ccigtztlrvgkzyppjmxt-auth-token` holds access token, refresh token and user object; no cookies are set by the site. This is the default for client-side supabase-js and is not a bug by itself, but it means any future XSS reads the refresh token. Mitigate through F-04 (CSP) and F-06 (short sessions, rotation).

### F-14 Info: Dependencies (A06)
**Evidence:** `npm audit` in `web/`: 7 moderate (all dev-time: `@typescript-eslint/*` chain via `minimatch` DoS GHSA-g3hv-75wg-m249); `npm audit --omit=dev`: 0. `npm outdated`: react/react-dom 19.3.0 vs 19.3.1, tailwindcss 4.3.3 vs 4.3.5, others major-version only. Lockfile is present with registry URLs and integrity hashes.
**Fix:** update patch versions, enable Dependabot/Renovate, run `npm audit --omit=dev` in CI.

### F-15 Info: CORS wide open (A05)
**Evidence:** site pages return `access-control-allow-origin: *` (Vercel static default); Supabase REST preflight from `Origin: https://evil.example.com` returned `access-control-allow-origin: *`. Auth uses bearer tokens (not cookies), so a foreign site cannot ride a victim's session. No action needed beyond awareness; do not add cookie-based auth without revisiting this.

### F-16 Info: Build and deploy chain (A08)
**Evidence:** no `.github`/CI config in the repo, no `.vercel` folder committed, `.env*` ignored. No third-party scripts, fonts or CDNs load on the live pages (checked `<script src>` and bundle URLs; the only external hosts referenced are the Supabase project and docs links inside library code). Source maps are not served (`.map` requests returned 403 and no `sourceMappingURL` in the bundle).
**Fix:** add CI (lint, tests, audit), protect the main branch, require review for deploys, and enable Vercel deployment protection for preview URLs.

## 4. What was tested and found sound

- **RLS / access control (A01), all as user B against A's rows or anonymously** (`a01_output.txt`): select by id and by `user_id` (empty result); update of A's row (0 rows affected, A's row unchanged); delete of A's row (0 rows); insert with `user_id=A` (403); insert with `user_id=null` (403); changing own row's `user_id` to A (403); upsert onto A's id (403); plain insert on A's id (409, nothing changed); `GET` of all rows returned only B's rows; anonymous select and insert (401 permission denied); publishable key used as bearer (401); `auth.users` not exposed through REST (404); storage buckets list empty. Database ownership defaults to `auth.uid()` correctly.
- Open redirect through Supabase email links (`redirect_to` is restricted to the site URL).
- Login error responses do not reveal whether an email exists; sign-up for an existing address is obfuscated; email confirmation is required (`mailer_autoconfirm:false`); anonymous sign-ins and third-party providers are off.
- Stored XSS in all text fields, tab title, report/print view, image data URLs including SVG with script (no execution).
- No server-side code of your own: no API routes, no server actions, no `fetch` in app code except the Supabase client; `POST /api/...` returns 404. **A10 SSRF: not applicable.**
- Exposed files: `/.env`, `/.git/config`, `/package.json`, `.env.local`, build files all 404; source maps not served; production errors are generic (the 404 page is the standard Next page; PostgREST errors include a standard grant hint, nothing sensitive).
- Secrets: none in the live bundle, working tree or git history (apart from F-08's test password and the public key). No service-role key is used.
- HSTS is present with preload (`max-age=63072000; includeSubDomains; preload`).
- Production dependencies have no known vulnerabilities.

## 5. What could not be tested (and why)

- **Sign-up policy and sign-up flow:** forbidden (no made-up addresses). Password policy was tested by changing an existing test account's password instead (F-02).
- **Forgot-password / reset flow:** my one allowed request was spent on `qa-user-a@rca-tool.test` and the server rejected the address as invalid (`email_address_invalid`, because `.test` is not a deliverable domain), so I could not observe enumeration, token expiry, single-use of reset links, or whether reset revokes sessions. All theoretical.
- **Email confirmation links and email templates** (no mailbox).
- **Supabase dashboard settings** (no admin access used): JWT expiry configuration, refresh-token reuse interval, exact rate-limit thresholds, SMTP provider, MFA, log retention, backups, region, whether the database has statement or size limits other than what I observed. Policies were judged by behaviour only.
- **Real victim scenarios for F-09** (needs another real account's uuid).
- **Load behaviour with very large rows** (my measurement was inconclusive).
- **High-volume attacks, DoS, brute force** (out of scope by rules): real rate-limit thresholds are unknown.
- **Vercel project settings** (deployment protection, env var scoping, team access) and the GitHub repository's visibility/access.
- **Content of committed QA screenshots** and `video/` assets (not reviewed for personal data).

## 6. Notes on conduct

- All rows created were deleted; final state verified: each test account holds only its seeded sample (`sample-<uid>`, `updated_at` unchanged).
- Test account B's password was changed to weak values and restored to the original; login verified afterwards. Two sessions of B were logged out as part of the sign-out test.
- One sign-up request (existing test address A) and one forgot-password request (rejected) were made.
- During F-03 and F-12 tests the browser tried to open `https://evil.example.com/...` (a reserved example domain, not a tested host); I blocked those requests in the browser (route abort), so nothing was sent to that host. Hosts actually contacted: the two in-scope hosts only.
