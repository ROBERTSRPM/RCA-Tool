# Handoff for a new session

Read this first, then `BLUEPRINT.md` and `AI-ROADMAP.md` (the owner-approved AI feature plan). This file replaces the long history of the first session.

## How to work (owner's standing instructions)
- You are the project manager. Delegate building, fixing, testing and media work to sub-agents on Sonnet; keep your own checks light (one look per deliverable). The owner is on a usage-limited plan.
- Keep messages to the owner very short: progress, and only what is needed from them.
- Never claim something works without a check. Every app change gets an independent QA pass before it goes live.
- Branches: work and in-progress snapshots go to `work`. Only verified work is fast-forwarded to `main`. Vercel deploys `main` to the live site automatically.
- If an agent stops on a usage limit, resume it with SendMessage after the reset rather than starting a new one.

## Owner
- Former Maintenance Manager, Production Manager and Site/Plant Manager. Wants the product to show their authority as a subject expert.
- Has a full-time job. Not appearing on camera; voice only.
- Their expertise to build into the product: natural vs forced deterioration, CAPA (corrective and preventive), maintenance plan changes, spares, learning from similar past failures, rolling a fix out to similar assets (horizontal expansion).

## Live systems
| What | Where |
|---|---|
| Live site | https://www.rcapilot.com (also rca-tool-omega.vercel.app; Vercel project `rca-tool`, root directory `web`). AI layer, restyle and pre-launch fixes went live 2026-11-19 (main = f95916b), owner-approved after QA, security audit v1 and release retest GO |
| Repo | github.com/ROBERTSRPM/RCA-Tool |
| Database and login | Supabase project `rca-saas`, id `ccigtztlrvgkzyppjmxt`, Sydney. Tables `investigations` and `assets`, both with owner-only row level security, size checks and per-user limits. Function `delete_own_account()`. Migrations in `web/supabase/migrations/` (all applied). |
| Cloud environment | `rca-tool`: allows the Supabase host, the live site, and Hugging Face hosts (for speech-to-text). |
| Test accounts | `qa-user-a@rca-tool.test`, `qa-user-b@rca-tool.test`. The password is NOT in the repo; QA scripts read `QA_PASSWORD`. If you don't have it, reset both with SQL via the Supabase tools (`extensions.crypt(..., extensions.gen_salt('bf'))` on `auth.users.encrypted_password`) and keep it in the scratchpad only. |

## Product state (live)
- Demo mode without an account; email/password accounts; account page with data export and account deletion.
- 7-step investigation: Problem (with asset details), Loss (lost / made up / buffer split, cash vs opportunity), Evidence, Cause tree (Tree / 5 Whys / Fishbone views, natural vs forced deterioration), Actions (CAPA, maintenance plan changes, spares check), Verify (savings counted only when verified; "Roll this fix out" to similar assets), Report.
- Asset register, similar past failures, rule-based quality check.
- Security: OWASP audit in `security/owasp-audit.md`; fixes applied; strict headers.
- Product name is "RCA Pilot by Intelbeyond", chosen by the owner; domain rcapilot.com to be bought by the owner on Vercel; preliminary name check done (verdict: use with caution, no existing RCA Pilot product found but RCA is a registered mark incl. software; `web/lib/brand.ts`).

## AI layer (built on branch `claude/new-session-tdmk2t`)
- Features: Cause coach and Challenge mode on the Cause tree step (Challenge also on Actions), CAPA recommender per root cause on Actions, write-up drafting (problem statement on Problem; report and one-page management summary on Report). Every result is a suggestion with Accept / Dismiss; accepted items are ordinary editable data flagged `aiSuggested` (never verified).
- Code: `web/lib/ai/` (context slimming and caps, prompts with the owner's method as a cached system prompt, JSON schemas, output validation, limits, Anthropic call, dev mock, shared handler), routes `web/app/api/ai/{coach,challenge,capa,draft}/route.ts`, UI in `web/components/workspace/ai/`. SDK: `@anthropic-ai/sdk`, structured outputs (`output_config.format`).
- Env vars (Vercel, server-side, no NEXT_PUBLIC_): `ANTHROPIC_API_KEY` (required to switch AI on; without it the UI says AI is not switched on), `ANTHROPIC_MODEL` (optional, default `claude-sonnet-5-5`), `AI_DAILY_LIMIT` (default 30) and `AI_BURST_LIMIT` (default 5), optional `AI_EFFORT`. Supabase variables are already needed.
- Database: migration `20261118000100_ai_usage_limits.sql` (applied): table `ai_usage` (owner-only select, no direct writes) and function `ai_consume()` (SECURITY DEFINER, authenticated only; the Supabase advisor "signed-in users can execute SECURITY DEFINER function" is expected for it, as for `delete_own_account`).
- Failed AI calls (outage, timeout, unusable answer) are refunded from the daily allowance by migration `20261118000200_ai_usage_refund.sql` (applied): `ai_refund()` allows at most 5 refunds per 24 h; every call still counts toward the burst limit. Privacy summary (draft) at `/privacy`; each AI panel shows a one-line notice that investigation text goes to Anthropic.
- Local testing without a key: `AI_MOCK=1 npm run dev` returns canned answers (`AI_MOCK=fail` simulates an outage). It is ignored when NODE_ENV is production, so it cannot run on Vercel. Node `fetch` in the container needs `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` to reach Supabase.
- Not done: real-API quality tuning of prompts (no key was reachable from the build container), photos in the write-up (text only; TODO in `DraftReport.tsx`).

## Open items
- Minor defects in `qa/defects.md`: 404 page breaks the CSP; CSP still allows inline scripts; asset status slow (~4 s) signed in; existing accounts lack the sample assets until "Reset sample data"; demo-mode two-tab race (NEW-01); long Problem step and Actions below the fold on phones.
- Some QA header checks fail only because Node `fetch` can't use the proxy in the container; verify headers with curl.
- Owner to do in Supabase: minimum password length 8, leaked-password protection, CAPTCHA before public promotion.

## Video
- Final: `video/out/rca-explainer-final.mp4` (12:23, 1080p, voiceover). Not in git (too large); rebuild with the commands in `video/animation/README.md`. The owner has a copy.
- Script: `video/voiceover.txt` is final (owner-approved). Scenes 1, 3 to 6, 8 to 17; scenes 2 and 7 were removed.
- Original recording: `video/recordings/voiceover-original.m4a`. Edit and enhancement log: `video/animation/public/audio/edit-log.md`. Per-scene WAVs are not in git; rebuild them from the original following that log.
- YouTube title options, description, chapters and thumbnails: `video/youtube-metadata.md`.

## Next steps (owner decisions pending)
1. AI layer: Core features built (see "AI layer" below); needs ANTHROPIC_API_KEY in Vercel, a real-API quality pass on a preview deployment, and independent QA before `main`. Next AI items are in `AI-ROADMAP.md`.
2. Teams/organisations (shared investigations per site, invitations, roles). Owner has not yet approved.
3. Billing (Stripe), own email sending service, terms and privacy pages.
4. Product name and custom domain (Vercel → Settings → Domains; then update Supabase Site URL and Redirect URLs).
5. Codex independent review (instructions were given to the owner).
6. Path to 50 paying users: 5 design partners from the owner's network, then content and outreach.
