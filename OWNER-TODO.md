# Owner to-do

Kept up to date by the PM. Nothing here blocks the agents right now unless it is marked **BLOCKING**.

## Email (needed before the first customer signs up)
- [x] Resend account, domain `rcapilot.com` verified (Tokyo), DMARC record added
- [ ] Resend → API Keys → create `supabase-smtp` (sending access) and copy it
- [ ] Supabase → Authentication → Emails → SMTP Settings → custom SMTP:
  - Host `smtp.resend.com`, port `465`, username `resend`
  - Password = the key
  - Sender `no-reply@rcapilot.com`, name `RCA Pilot`
- [ ] Supabase → Authentication → Rate Limits → emails per hour about 30
- [ ] Paste the branded email templates from `web/supabase/email-templates/` into Supabase → Authentication → Emails → Templates (when they are ready)
- [ ] Test: sign up with `robertsprasath+test1@gmail.com`, click the link, and say where it lands

## Approvals
- [ ] New look: approve the design (screenshots in `design/screens/`) and the orange brand colour
- [ ] Going live: approve once QA and the security audit pass

## Supabase settings (before the first customer)
- [ ] Authentication → Passwords: minimum length 8, leaked-password protection on
- [ ] Authentication → Attack protection: CAPTCHA (Cloudflare Turnstile; agents will give the steps)

## Paid plans (before taking money)
- [ ] Vercel → upgrade to Pro (the Hobby plan is non-commercial only)
- [ ] Supabase → upgrade to Pro (daily backups, no pausing)
- [ ] Anthropic Console → turn on auto-reload with a monthly limit before customers use the AI
- [ ] Stripe account with ABN, for invoices and subscriptions

## Decisions (see `LAUNCH-PLAN.md`)
- [ ] Pricing: the draft is an A$2,500 pilot, then A$450 a month per site
- [ ] Teams and sites: build now (recommended) or later
- [ ] Demo video: length, and your voice or captions only
- [ ] Trading entity and ABN for invoices; support inbox (e.g. support@rcapilot.com)

## Small things
- [ ] YouTube: paste the new description line, "Try RCA Pilot, the tool that takes you through these steps: https://www.rcapilot.com"
- [ ] Anthropic key: if it has an expiry date, tell the PM so a reminder can be set
- [ ] Line up 5 design partners from your network
