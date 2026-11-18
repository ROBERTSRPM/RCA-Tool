# RCA Pilot: design review and direction

Brief: modern and clean, but not obviously AI-generated. Something a plant manager would trust and show the site GM. Reference points: Linear and Stripe Dashboard for restraint, an industrial instrument for precision.

Before screenshots are in `design/screens/before-*`, after in `design/screens/after-*`.

## Audit: what read as templated or AI-made

| Where | Problem |
|---|---|
| Landing | Dark navy page, amber-on-black pill ("For maintenance, reliability and plant teams"), 60px extra-bold headline with one coloured phrase, three identical feature cards each with a yellow icon tile, an empty 16:9 "Video coming soon" box. This is the standard startup template. Copy was generic ("The root cause tool that closes the loop"). |
| Whole app | Heavy navy header bar, amber primary buttons with black text, `rounded-xl` cards with soft shadows on a blue-grey page, 70 uses of `font-bold` plus 68 of `font-semibold` and 4 of `font-extrabold`: too many weights competing. System font stack, so the look changed per device. |
| AI panels | Violet card border, violet "AI" chip with a sparkle icon, sparkle on every button, "AI-suggested" violet badges. The classic "magic add-on" look, and it was the only purple in the product. |
| Stepper | Seven large bordered buttons with filled green circles; the active one a solid black block. Visually louder than the content it navigates. |
| Dashboard | Five separate shadowed stat cards, each with 3 lines of grey text; status chips in five different pastel fills. |
| Loss step | A large near-black "live calculation" slab with a bright amber total: loudest thing in the app for a table of numbers. |
| Quality check | A mint-green banner with a green circle and shield icon when there is nothing to report. |
| Asset register | Ten tall single-column cards, each with three grey tiles; yellow, pink and amber chips side by side. |
| Phones | Problem step was 3,700 px tall: AI notes box, 14 form fields, asset details and similar failures all expanded. Actions step repeated a four-line AI explainer under every root cause. |
| 404 | Default Next.js page, which also broke the CSP (open defect). |
| Print/report | Actions table wrapped "Status" and "$12,000" mid-word; maintenance table used a larger size than the rest of the report. |

## Direction

Calm, flat, bordered. Information first. One accent colour, used sparingly. Plain labels. No decoration that carries no information.

### Type
- Inter (variable, latin subset), self-hosted through `next/font/local` from `app/fonts/` (SIL OFL licence file alongside). No external font host, CSP unchanged.
- Body 15px / 1.5. Inputs stay 16px on phones to stop iOS zooming, 14px from `sm` up.
- Scale actually used: 12 (labels, help), 14 (UI, tables), 15 (body), 16 (section titles), 20/24 (page titles), 30/48 (landing only).
- Weights: 400 body, 500 buttons and nav, 600 headings and figures. Nothing heavier. Numbers use `tabular-nums`.
- Eyebrow label: 12px, 500, uppercase, tracked, slate-500. Used for table heads, stat labels and section tags.

### Colour (tokens in `app/globals.css`, remapped onto Tailwind's scales so every component follows)
- Neutrals (cool grey): page `#f8f9fb`, surface `#fff`, subtle `#f1f3f6`, border `#e2e5ea`, strong border `#cbd0d8`, muted text `#586170`, text `#161a21`.
- Accent: signal orange `#c2410c` (hover `#9a3412`). White on accent is 5.2:1. Used for the single primary button, focus ring, active tab underline and the logo's arrows. Kept from the original amber brand mark, darkened so it passes AA.
- Semantic, always paired with a text label, never colour alone: emerald = done / verified, amber = due / warning, red = overdue / destructive / fix first, sky = information, slate-blue (replaces violet) only for the "human" cause category.
- Contrast checked against white and `#f8f9fb`: text slate-900 17.4:1, slate-700 11.5:1, slate-600 8.7:1, slate-500 6.2:1 (5.6:1 on the subtle grey; the lightest text colour used), accent 5.2:1, emerald-700 5.5:1, red-700 6.5:1, amber-900 on amber-50 8.8:1.

### Spacing, radius, borders
- 4px base. Common steps: 8, 12, 16, 24, 32. Cards 16 (phone) / 20 padding. Page gutter 16 on phones, 24 from `sm`.
- Radius: 4 for chips, 6 for buttons and inputs, 8 for cards and dialogs. Nothing larger, nothing pill-shaped except status dots and step numbers.
- Borders separate; shadows only for things that float (menus, dialogs). Tailwind's `shadow`, `shadow-sm` are set to none.

### Components
- Buttons: 40px high (44px for the landing CTAs). Primary = accent, one per screen. Secondary = white with border. Dark = ink, for "Next". Danger = outlined red; solid red only in the confirm dialog.
- Inputs: white, 1px slate-300, accent border and a 25% accent ring on focus.
- Tables and lists: hairline row dividers, eyebrow headers, right-aligned tabular numbers. Dashboard stats are one bordered strip, not five cards.
- Status: neutral chip with a 6px coloured dot and the label. Criticality and category chips: pale fill with a ring, red only for A.
- Stepper: underline tabs (accent underline on the current step), small numbered or ticked dot. Completed steps show a green tick.
- AI: titled plainly ("Suggestions" eyebrow, buttons say what they do, accepted items are tagged "Suggested"). Same card as everything else; no colour, no sparkle. Copy keeps the rule that nothing is marked verified because of a suggestion.
- Empty states: one line of title, one of explanation, one action. Dashed hairline border.
- Icons: the existing 24px stroke set, stroke 1.75, only on buttons where it helps scanning (add, edit, delete, copy, back/next). Removed from landing cards and AI.

### Layout fixes for phones
- Problem step: asset details, similar failures and the AI notes card are collapsed behind their title on phones (open from `sm` up). The step went from about 3,700 px to about 2,100 px, with the main form first.
- Actions step: the repeated "Suggested actions" card under each root cause is collapsed on phones, and its text is one line. Add action is at the top.
- App navigation is a two-tab row under the header on phones with an underline on the current section.

## Decisions to check
- AI badge text changed from "AI-suggested" to "Suggested" (still says AI in the hover title and in the panel intro). Any QA scripts matching "AI-suggested" need updating.
- Removed the "Video coming soon" placeholder from the landing page. Put a real video section back when there is one.
- Orange accent is a brand call; changing `--color-accent` in `globals.css` and the arrow colour in `components/Logo.tsx` rethemes everything.
