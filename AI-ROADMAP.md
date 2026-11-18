# AI roadmap (owner-approved)

AI is what makes RCA Pilot 10x. Rule for every feature: the AI suggests, the human decides; nothing becomes "verified" without evidence. Build the owner's method into the AI guidance (natural vs forced deterioration, CAPA, evidence before opinions, system/latent causes).

## Core (first release): build these first
1. **Cause coach**: while the user builds the tree, the AI suggests likely causes for that asset type and failure mode across physical, human and system levels. Each comes as a hypothesis, with the evidence that would confirm or rule it out.
2. **Challenge mode**: the AI questions weak logic, like an experienced reviewer would: "you stopped at a physical cause", "this cause has no evidence", "this is blame, not a system cause".
3. **CAPA recommender**: for each root cause, it proposes corrective and preventive actions, including maintenance tasks with intervals, condition monitoring, spares to hold and procedure changes. It also tells natural deterioration apart from forced.
4. **Write-up drafting**: turns rough notes and photos into a clear problem statement, then the final report and a one-page management summary.

## Next
5. **Learning from history**: reads the site's past investigations and work orders to say "this failed the same way at P-103 last year, and here's what fixed it".
6. **Horizontal expansion**: after a fix is verified, it ranks other assets at risk and drafts the inspection checks for each.
7. **Photo and data reading**: it reads failed-part photos (wear patterns, cracking) and pasted trend or alarm data to suggest what they show.
8. **Voice capture on the shop floor**: a technician describes the failure by voice and gets a structured problem statement.

## Later
9. **Connection to the maintenance system**: reads failure history from systems like SAP or Maximo and flags repeat failures automatically.

## Prerequisites
- Anthropic API key from the owner (request_credential; set as a Vercel environment variable, server-side only, never sent to the browser).
- AI calls run server-side (Next.js route handlers) with the user's session verified; per-user and per-day usage limits; inputs and outputs size-limited; no customer data used for anything but the request.
- Existing rule-based quality check and similarity scoring stay as the fallback when AI is unavailable.
