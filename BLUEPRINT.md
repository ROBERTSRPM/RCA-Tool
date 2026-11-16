# Blueprint: RCA Micro-SaaS (video first, then product)

Living document. The PM (lead Claude session) updates it as each phase closes.
Status key: DONE / IN PROGRESS / WAITING ON OWNER / NOT STARTED

## Operating model

| Role | Who | Model | Why |
|---|---|---|---|
| Project manager, architecture, final verification | Lead session | Top model | Judgment, cross-checking agent output |
| Market research | Sub-agent | Sonnet | Search and summarise, cheap |
| Video script and storyboard | Sub-agent | Sonnet, PM edits | Writing, reviewed by PM for expertise and tone |
| Product build (frontend, backend) | Sub-agents | Sonnet | Bulk coding to a spec written by the PM |
| Simple chores (file moves, formatting, seed data) | Sub-agent | Haiku | Lowest cost |
| Independent QA | Separate sub-agent with no build context | Sonnet | Must not have written the code it tests |

Rules the PM follows:
- Every agent gets a written brief and a defined deliverable file.
- The PM checks each deliverable itself (runs the code, opens the page, reads the sources) before marking it DONE.
- Nothing is deployed until QA passes; QA runs again against the live URL.
- All work is committed and pushed to GitHub, because the cloud container is temporary.

## Phase 0 - Setup
| Step | Status |
|---|---|
| 0.1 Owner answers kickoff questions: ex Maintenance/Production/Plant Manager; animation + owner's voice; repeat pump failure case | DONE |
| 0.2 GitHub repo ROBERTSRPM/RCA-Tool attached; all work pushed to `main` | DONE |
| 0.3 Vercel project `rca-tool` linked to the repo (root directory `web`), auto-deploys on push: https://rca-tool-omega.vercel.app | DONE |
| 0.4 Supabase project `rca-saas` (Sydney): `investigations` table with per-user row level security; Site URL and redirect URLs set by owner | DONE |

## Phase 1 - Market research
| Step | Status |
|---|---|
| 1.1 Competitor scan, pricing, user complaints, gaps -> `research/competitor-analysis.md` (search summaries only; review sites were blocked, user-complaint evidence is thin) | DONE |
| 1.2 PM reviewed report; positioning: close the loop, quantify the loss, no training, self-serve price | DONE |
| 1.3 Owner approves MVP scope | NOT STARTED |

## Phase 2 - YouTube video
Structure (target 8 to 10 minutes):
1. Hook: the cost of firefighting the same breakdown again and again
2. What root cause analysis is (and what it is not: blame, or stopping at the first cause)
3. Why it matters: uptime, cost per unit, profit, capacity without large CAPEX
4. What an effective RCA looks like: evidence, causal logic, verified causes, actions that get closed, recurrence check
5. Worked example: problem, evidence, cause tree, root causes, actions, measured outcome in dollars
6. Close: the method as a repeatable system, and a lead-in to the product

| Step | Status |
|---|---|
| 2.1 Script: owner reviewed; scenes 1, 15, 16 revised in `video/voiceover.txt` (zero failures after fix, speed change instead of impeller trim, natural vs forced deterioration). `script.md`, `case-study.md`, animation and app sample still carry the old version until sign-off | WAITING ON OWNER |
| 2.2 Worked example (`video/case-study.md`), illustrative numbers; owner to review technical accuracy | WAITING ON OWNER |
| 2.3 Visuals: first cut rendered (Remotion, 17 scenes, 9:39, re-timable per scene). Re-render after script sign-off with a clear bottom-right corner for the owner's face | FIRST CUT DONE |
| 2.4 Owner records video and audio per scene: full screen in scenes 1, 2, 7, 17; corner in 3 to 6, 8 to 10; voice only in 11 to 16 | WAITING ON OWNER |
| 2.5 Title, description, chapters, thumbnail concepts (`video/youtube-metadata.md`) | DONE |

## Phase 3 - Product build
Proposed stack: Next.js + TypeScript on Vercel, Supabase (Postgres, login, row-level security), Claude API for the AI assistance, Stripe later for billing.

| Step | Status |
|---|---|
| 3.1 Product spec and data model from Phase 1 findings | DONE |
| 3.2 App skeleton, demo mode on browser storage, Supabase login and per-user cloud storage (organisation and site structure: later) | DONE |
| 3.3 Core RCA workflow: 7 steps, cause tree with Tree / 5 Whys / Fishbone views on one model, rule-based quality check | DONE |
| 3.4 AI assistance: challenge weak causes, suggest missing branches, draft report (needs owner's Anthropic API key) | NOT STARTED |
| 3.5 Actions: owners, due dates, close-out, recurrence check; savings count as verified only when actions are done and failure has not recurred | DONE |
| 3.6 Financial impact: lost / made up / buffer split, optional cost lines, cash versus opportunity loss, saving and payback | DONE |
| 3.7 Report: print / save as PDF (share link: later) | PARTLY DONE |
| 3.8 Landing page (video placeholder until the video is published) | PARTLY DONE |

## Phase 4 - Independent QA
| Step | Status |
|---|---|
| 4.1 QA agent test plan and control inventory (`qa/test-plan.md`) | DONE |
| 4.2 Automated browser tests, round 1: 263 checks, 241 passed, 15 defects (3 major) | DONE |
| 4.3 Defects fixed by build agent; independent retest (round 2): all 15 round 1 defects fixed, DEF-16 not reproducible. Open: NEW-01 (minor, demo-mode two-tab race), NEW-02 (unconfirmed, sample missing once) | DONE |
| 4.4 Suite run against the live site: 375 checks, 373 passed; 1 failure is NEW-01, 1 was a test expectation since corrected. Not covered: email flows, import offer, non-Chromium browsers, real touch devices | DONE |
| 4.5 Data isolation tested by PM at database level and by QA through the app; full security review before paying customers | PARTLY DONE |

## Phase 5 - Launch
| Step | Status |
|---|---|
| 5.1 Production deploy live on Vercel; custom domain, product name and own email service (Supabase's built-in sender allows only a few emails per hour) | PARTLY DONE |
| 5.2 Video published, linked to landing page | NOT STARTED |
| 5.3 First ten prospects contacted, feedback loop | NOT STARTED |

## What the owner needs to provide (running list)
- A GitHub repository (empty is fine) and its name
- A Vercel account connected to that repository
- An Anthropic API key for the in-app AI features (entered through a secure form, never pasted in chat)
- Optional: a voice service key if an AI voiceover is chosen
- Later: Stripe account, domain name

## Decision log
| Date | Decision | Reason |
|---|---|---|
| 2026-11-16 | Research and coding agents run on cheaper models; PM verifies | Token cost |
| 2026-11-16 | Fresh Supabase project instead of reusing the paused one | Owner's choice |
| 2026-11-16 | Investigation stored as one JSON document per row, owner-only access | Fast to build; team and site structure can be added later |
| 2026-11-16 | Demo mode without an account, on browser storage | Self-serve trial with no sign-up friction |
| 2026-11-16 | Lost margin applies only to production lost for good; made-up production is costed as recovery cost | Avoids double counting; credible to finance |
| 2026-11-16 | Video example ends with zero failures; natural deterioration managed by condition monitoring | Owner's review |
| 2026-11-16 | "RootLoop" is a placeholder name held in `web/lib/brand.ts` | Owner to decide |
| 2026-11-16 | Watchdog scheduled task every 2 hours restarts work stopped by usage limits | Owner's request |
