# RootLoop (phase A)

Root cause analysis for maintenance and reliability teams: investigate, track actions to done, and prove the failure stopped with the money quantified. Phase A is a fully working front end that stores everything in the browser (localStorage). No backend or login yet.

## Run

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start   # production
npm run lint
npm test             # vitest unit tests
```

## Structure

- `app/` routes: `/` landing, `/app` dashboard, `/app/investigations/[id]` workspace.
- `components/workspace/` the 7-step workspace; `cause/` holds the Tree, 5 Whys and Fishbone views over one tree.
- `lib/types.ts` all domain types (one module).
- `lib/store/types.ts` **the `InvestigationStore` interface** (list, get, create, update, delete, duplicate, resetSample; all async). `lib/store/local.ts` is the localStorage implementation (falls back to memory if storage is blocked or during server rendering). `lib/store/index.ts` `getStore()` is the single place to swap in a database store.
- `lib/finance.ts` pure money calculations (tested).
- `lib/quality.ts` pure rule-based quality check (tested); `lib/coach.ts` the `Coach` interface for a future AI.
- `lib/tree.ts` pure immutable cause-tree operations (tested).
- `lib/sample.ts` the illustrative sample investigation (seeded on first visit).
- `lib/status.ts` investigation status is derived from the data, not stored.
