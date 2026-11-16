# RootLoop (phase B)

Root cause analysis for maintenance and reliability teams: investigate, track actions to done, and prove the failure stopped with the money quantified. The product name lives in one constant, `lib/brand.ts`.

Two modes: **demo mode** (signed out, everything in browser localStorage) and **account mode** (Supabase auth and a Postgres table, `public.investigations`, one jsonb document per investigation, protected by row level security). With no Supabase variables the app builds and runs in demo mode only.

## Configure

Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the publishable key is public by design; never use a secret key here). Leave them unset for local-only mode.

## Run

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start   # production
npm run lint
npm test             # vitest unit tests
```

## Structure

- `app/` routes: `/` landing, `/app` dashboard, `/app/investigations/[id]` workspace, `/login`, `/signup`, `/forgot-password`, `/reset-password`.
- `components/auth/` auth provider, header account menu, auth forms, the `/app` shell (demo banner, one-time import of browser data into a new account). `lib/auth/validate.ts` pure validation and error messages.
- `components/workspace/` the 7-step workspace; `cause/` holds the Tree, 5 Whys and Fishbone views over one tree.
- `lib/types.ts` all domain types (one module).
- `lib/store/types.ts` **the `InvestigationStore` interface** (list, get, create, update, delete, duplicate, resetSample; all async). `lib/store/local.ts` is the localStorage implementation (falls back to memory if storage is blocked or during server rendering). `lib/store/supabase.ts` is the Supabase implementation (seeds the sample once per new account). `lib/store/index.ts` `getStore()` routes each call to the account store when signed in, else to localStorage. `lib/store/import.ts` pure decision logic for copying browser data into an account.
- `lib/finance.ts` pure money calculations (tested).
- `lib/quality.ts` pure rule-based quality check (tested); `lib/coach.ts` the `Coach` interface for a future AI.
- `lib/tree.ts` pure immutable cause-tree operations (tested).
- `lib/sample.ts` the illustrative sample investigation (seeded on first visit).
- `lib/status.ts` investigation status is derived from the data, not stored.
