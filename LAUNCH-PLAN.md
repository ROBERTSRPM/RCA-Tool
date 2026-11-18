# Launch plan: first 50 paying users

Status: draft by PM, 2026-11-18. Owner decisions are marked **DECIDE**.

## 1. The order of work (each step is a gate)

| # | Step | Who | Gate to pass |
|---|---|---|---|
| 1 | AI features: independent QA, then real-AI test on the Vercel preview | QA agent | No high/critical defects; answer quality judged fit for a plant manager |
| 2 | Design pass: professional, clean, not "AI-made" | Design agent | Owner likes the before/after screenshots |
| 3 | Pre-launch QA: "what must be fixed before customers come in" | QA agent (fresh, did not build it) | A ranked list; all blockers fixed and re-tested |
| 4 | Security audit against OWASP Top 10, plus OWASP Top 10 for LLM apps (the AI part) | Security agent (fresh) | No high/critical findings open |
| 5 | Launch blockers below, done | Owner + agents | All ticked |
| 6 | Go live: merge to `main`, smoke test on www.rcapilot.com | PM | Login, signup email, AI, report all work live |
| 7 | 5 design partners, then paid | Owner | See section 4 |

## 2. Launch blockers (must be done before the first customer)

**Email (most urgent).** Supabase's built-in sender only reliably reaches the project team and allows only a few emails an hour, so a real customer may never get the verification email.
- Set up a sending service (recommended: Resend; Postmark is the alternative) on `rcapilot.com`, with the SPF, DKIM and DMARC records added in Vercel DNS. Connect it in Supabase → Authentication → Emails → SMTP settings. **DECIDE** the provider; owner creates the account, agents do the rest.
- Branded email templates (confirm signup, reset password, change email), sent from `no-reply@rcapilot.com`.
- A real inbox for replies and support, e.g. `support@rcapilot.com`. **DECIDE**: Google Workspace or forwarding to the existing address.

**Accounts and security.** Supabase settings: minimum password length 8, leaked-password protection, CAPTCHA on signup/login (Cloudflare Turnstile is free), tighter auth rate limits. Optional two-factor login for customers who want it.

**Plans (paid hosting).**
- Vercel Pro: the Hobby plan is non-commercial only.
- Supabase Pro: daily backups and no pausing; the free plan pauses inactive projects and has no backups.
- Rough running cost before AI usage is about US$45 to 70 a month (check current prices).

**Legal.**
- Terms of service, privacy policy, and a short "how we use AI" note: customer data goes to the AI provider only to answer that request and is not used to train models; check the provider's current terms.
- Cookie notice if analytics are added.
- Business details for invoices. **DECIDE**: trading entity and ABN.

**Billing.**
- Stripe Checkout and the Stripe customer portal.
- A `subscriptions` table updated by a Stripe webhook.
- Plan checks in the app (free trial, then paid). AI limits per plan.

**Running the service.**
- Error tracking: Sentry free tier, with no investigation content sent.
- An uptime check.
- A small admin page, for the owner only: users, plan, last active, AI use this month.

**Known defects.** The open items in `qa/defects.md`, plus whatever steps 3 and 4 find.

## 3. Managing users at scale (to 50, and ready for 500)

Fifty users is small for the technology. Vercel and Supabase handle thousands without changes. What breaks first is people and process, not servers. The plan:

1. **Self-serve everything.**
   - Already in place: signup, email verification, password reset, data export and account deletion.
   - Still to add: billing changes and cancellation in the Stripe portal, so the owner never handles these by hand.
2. **Teams and sites (organisations).**
   - Plant customers buy per site and share investigations: a planner, the maintenance manager and a reliability engineer all work on one RCA.
   - Build: organisation → sites → members with roles (owner, editor, viewer), email invitations, and investigations owned by the organisation instead of one person.
   - Security in the database (row level security) moves from "my rows" to "rows of organisations I belong to".
   - **DECIDE** whether this ships before or after the first paying customers. Recommendation: build it now. It is the main reason a site pays rather than one person using it free, and moving data later is harder.
3. **Plans and limits in one place.** One `plans` table (seats, AI uses per month, number of assets). The app reads from it, so changing a price or limit needs no code change.
4. **Support that doesn't eat the owner's evenings.**
   - A help page: getting started, the 7 steps, FAQs.
   - A "Send feedback" button in the app that emails the support inbox.
   - The sample investigation for every new account (already there).
   - Welcome email on day 0, tips on day 3, and a check-in on day 10 of the trial.
5. **Watch usage.** For each account: last active, number of investigations, AI calls, and trial days left. This shows who is getting value, who is stuck, and who to call.
6. **Cost control.**
   - AI cost per user is capped by daily and monthly limits.
   - An alert at 80% of the Anthropic monthly budget.
   - Auto-reload on the API account turned on, with a spending limit, before launch, so AI doesn't stop when credit runs out.
7. **Data protection as it grows.**
   - Daily backups (Supabase Pro), with a restore test once a quarter.
   - Customer data stays in the Sydney region; say so on the privacy page, since Australian plant customers will ask.
   - A security page for buyers' IT teams (hosting, encryption, access control, AI data handling).

## 4. Path to 50 paying users

| Stage | Target | How |
|---|---|---|
| Design partners | 5 sites | The owner's own network of maintenance and plant managers. Free for 3 months in exchange for using it on real failures, a 30-minute feedback call every two weeks, and a case study at the end |
| First paid | 10 | Convert the design partners plus their referrals; publish the first case study |
| Content | ongoing | The explainer video, the product demo video, a short LinkedIn post per week from the owner's experience (one real failure story, one lesson) |
| Outreach | 50 | Direct messages to maintenance, reliability and plant managers in mining, utilities, food and beverage, and manufacturing; reliability groups and conferences |

**DECIDE** pricing. A starting point to test with design partners: per site per month (for example A$99 to 199 per site with 5 users, AI included within limits), with an annual discount. Avoid per-investigation pricing, which discourages use.

## 4a. Pricing and first-customer setup (owner direction 2026-11-18: mini SaaS, low friction, owner as forward-deployed engineer)

Draft for the owner to test on the first calls. All prices are in A$ and exclude GST.

| Offer | Price | What they get |
|---|---|---|
| Site pilot (90 days) | A$2,500 one-off | Set-up: their asset register loaded, terminology and templates adjusted. One training session. The owner co-leads their first 1 to 2 real RCAs. Credited against the first year if they continue. |
| Site subscription | A$450 a month per site, or A$4,500 a year (2 months free) | Up to 10 users, AI included within fair-use limits, a monthly check-in, and small changes on request. |
| Starter, later and self-serve | A$149 a month, 3 users | No set-up, no check-ins. Add it once the self-serve billing is built. |

- **Why these levels:**
  - One avoided breakdown on a critical asset usually costs a site far more than a year's fee.
  - A one-off fee under a manager's own approval limit avoids procurement.
  - The pilot fee gets commitment, so the customer actually uses it.
- **Billing with no code:**
  - Stripe invoices: a one-off item for the pilot fee, then a recurring Stripe subscription that is invoiced or paid by card.
  - Industrial customers often pay by invoice and bank transfer on 30-day terms, which Stripe supports.
  - The owner switches an account to paid by hand, through an agent. Automated Stripe billing in the app comes later.
- **Sign-up:** customers create their own accounts at www.rcapilot.com. Shared team workspaces come next, before pilots end. Until then each user has their own account.

## 5. Owner to-do (short list)
1. Pick the email provider and create the account (Resend recommended).
2. Upgrade Vercel to Pro and Supabase to Pro before the first paying customer.
3. Decide: teams now or later, pricing, trading entity and ABN.
4. Supabase auth settings: password length 8, leaked-password protection, CAPTCHA.
5. Line up 5 design partners.
