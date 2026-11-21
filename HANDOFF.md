# Handoff for a new session

Read this first. Then, depending on the task: `marketing/` (getting customers), `LAUNCH-PLAN.md`, `OWNER-TODO.md`, `BLUEPRINT.md`, `AI-ROADMAP.md`.

## How to work (owner's standing instructions)
- You are the project manager. Delegate building, fixing, testing, research and media work to sub-agents on Sonnet; keep your own checks light (one look per deliverable). The owner wants tokens saved.
- Keep messages to the owner very short: progress, and only what is needed from them. Discuss before jumping to solutions; ask before changing headlines, titles or the owner's wording.
- Never claim something works without a check. Every app change gets an independent QA pass before it goes live.
- Branch `claude/new-session-tdmk2t` for work. Only verified work is fast-forwarded to `main`, and only after the owner says "go live". Vercel deploys `main` to the live site.
- If an agent stops on a usage limit, resume it with SendMessage after the reset rather than starting a new one; schedule a one-off reminder for the reset time.
- Never ask for secrets in chat. Supabase delete prompts may not reach the owner's device; avoid needing them.
- Wording rules: "countermeasure" not "fix"; never "free"; contact is email only, roberts@intelbeyond.com, and never "call me" or "reach out" (side hustle). Numbers as digits. Conversational, one idea per sentence.
- **Reminder owed to the owner:** before the first customer, narrow `.claude/settings.json` from all Supabase tools (`mcp__Supabase`) to read-only.

## Owner
- Roberts. Former Maintenance Manager, Production Manager and Site/Plant Manager. Full-time job; this is a side hustle. Voice only on video, no camera. Based in Australia.

## Live systems
| What | Where |
|---|---|
| Live site | https://www.rcapilot.com (Vercel project `rca-tool`, root `web`). main = 1eea886 (2026-11-21). |
| Repo | github.com/ROBERTSRPM/RCA-Tool |
| Database and login | Supabase `rca-saas`, id `ccigtztlrvgkzyppjmxt`, Sydney, RLS on all tables. Migrations in `web/supabase/migrations/` (all applied). |
| Email | Resend, domain rcapilot.com verified; Supabase custom SMTP and 2 branded templates set by the owner. End-to-end signup email test still to confirm. |
| AI | Anthropic key in Vercel only (`ANTHROPIC_API_KEY`), model `claude-sonnet-5-5`; 30 per user per day, 5 per minute, 300 per day globally. |
| Test accounts | `qa-user-a@rca-tool.test` (QA), `qa-user-b@rca-tool.test` (video recording). Password only in the session scratchpad. |
| Preview | Behind Vercel login; share link was in chat only (never in the repo). Owner to rotate it after testing. |

## Product state (live)
- 7-step investigation: Problem (equipment or process/quality failure), Loss ("Money spent" and "Lost margin", "Not known yet" allowed), Evidence, Cause tree (tree / 5 Whys / fishbone, cause area), Actions (corrective and preventive countermeasures, maintenance plan, spares), Verify (savings and "Line time back" in hours, counted only when verified; roll out to similar assets), Report and one-page management summary.
- AI: cause coach, challenge my analysis, CAPA suggestions, problem statement and report drafting. All suggestions need Accept.
- Dashboard: open loss, actions, overdue, verified savings with line time back, roll-out checks.
- QA and security reports in `qa/` and `security/`.

## Videos
- Public: explainer https://youtu.be/b_pNSfn9jjI and demo https://youtu.be/3_s0V_pwHdE (sources in `video/demo/`).
- Walkthrough (13–14 min, tray sealer leaking packs story, owner's voice): `video/walkthrough/`. **Not approved yet; must not be uploaded, linked or used until the owner approves.** Final render in progress on 2026-11-21 (AI scenes after the test account's daily AI limit reset). Owner feedback rules: screen must match the voice at every moment; cursor and a tight orange glow border on the item being spoken about; no music under the voice.

## Getting customers (next focus, new chat)
- Drafts (not posted or sent) in `marketing/`: `ICP.md`, `first-50-plan.md`, `outreach-templates.md`, `linkedin-posts.md`, `landing-page-notes.md`, `owner-actions.md`.
- Pricing draft (not final): A$2,500 90-day site pilot, then A$450 a month per site, ex GST. Design-partner terms still to decide (the old "free for 3 months" in `LAUNCH-PLAN.md` conflicts with the no-"free" rule).
- Skills shortlist (not installed, owner to decide): coreyhaines31/marketingskills (cold-email, copywriting, cro, seo-audit, social), remotion-dev/skills, supabase/agent-skills, sergebulaev/linkedin-skills (drafts only, no paid integrations). Read each skill's files before installing.

## Open items
- `OWNER-TODO.md`: Supabase password/CAPTCHA/session settings, Vercel and Supabase Pro before taking money, Anthropic spend limit, Stripe, privacy and terms review.
- Low: `qa/loss.js`, `qa/e2e.js`, `qa/features.js` still assert the old "Cash"/"Opportunity" labels.
- Minor defects in `qa/defects.md`.
