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
| 0.2 GitHub repo ROBERTSRPM/rca-platform created; Claude GitHub App needs access to it before it can be attached | WAITING ON OWNER |
| 0.3 Vercel project linked to the GitHub repo (auto-deploy on push) | NOT STARTED |
| 0.4 Supabase project `rca-saas` created (Sydney); schema not yet applied | IN PROGRESS |

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
| 2.1 Script with timings and on-screen visuals (`video/script.md`, 1,337 words, 17 scenes, arithmetic checked by PM) | DONE, owner review pending |
| 2.2 Worked example (`video/case-study.md`), illustrative numbers; owner to review technical accuracy | WAITING ON OWNER |
| 2.3 Visuals: animated scenes rendered to MP4 (code-driven), charts, cause tree build-up | IN PROGRESS |
| 2.4 Voiceover (owner's own voice recommended for authority) | NOT STARTED |
| 2.5 Title, description, chapters, thumbnail concepts (`video/youtube-metadata.md`) | DONE |

## Phase 3 - Product build
Proposed stack: Next.js + TypeScript on Vercel, Supabase (Postgres, login, row-level security), Claude API for the AI assistance, Stripe later for billing.

| Step | Status |
|---|---|
| 3.1 Product spec and data model from Phase 1 findings | DONE |
| 3.2 App skeleton (phase A: browser storage, no login yet; phase B: Supabase login and database) | IN PROGRESS |
| 3.3 Core RCA workflow: problem statement, evidence, cause tree (5 Whys, fishbone, logic tree), root causes | NOT STARTED |
| 3.4 AI assistance: challenge weak causes, suggest missing branches, draft report | NOT STARTED |
| 3.5 Actions: owners, due dates, close-out, effectiveness check for recurrence | NOT STARTED |
| 3.6 Financial impact: loss per event, annualised cost, benefit of fix | NOT STARTED |
| 3.7 Report export and share link | NOT STARTED |
| 3.8 Landing page with the video embedded | NOT STARTED |

## Phase 4 - Independent QA
| Step | Status |
|---|---|
| 4.1 QA agent writes a test plan covering every button, form and flow | NOT STARTED |
| 4.2 Automated browser tests (Playwright) run locally before deployment | NOT STARTED |
| 4.3 Defects logged to `qa/defects.md`, fixed by build agents, retested | NOT STARTED |
| 4.4 Same test suite run against the live Vercel URL after deployment | NOT STARTED |
| 4.5 Security review (login, data isolation between customers) | NOT STARTED |

## Phase 5 - Launch
| Step | Status |
|---|---|
| 5.1 Production deploy and custom domain | NOT STARTED |
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
