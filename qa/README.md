# RootLoop QA suite

Black-box Playwright tests (plain Node scripts, no test runner needed). They read
`BASE_URL` (default `http://localhost:3555`) and `QA_PASSWORD` (required); nothing under `web/` or `video/` is touched.

## Prerequisites
- Node 22 with the globally installed `playwright` (`require('playwright')` must resolve; do not install it).
- The app reachable at `BASE_URL`. Local: `cd web && npm run build && npm start -- -p 3555`.
- The two existing test accounts: `qa-user-a@rca-tool.test`, `qa-user-b@rca-tool.test`. Their password is not stored in the repository: set it in the environment variable `QA_PASSWORD` (the scripts exit with a clear message if it is unset). Ask the project owner for it.
  The suite never signs up and never submits forgot-password with a real address.

## Run everything (against any URL)
```bash
cd /home/user/rca-platform/qa
QA_PASSWORD='<test password>' BASE_URL=https://your-deployed-site.example node run-all.js     # default http://localhost:3555
```
`run-all.js` = account cleanup -> demo suite -> loss feature suite (`loss.js`) -> signed-in suite -> control inventory, then prints totals.
Takes roughly 10-15 minutes.

## Run parts
(`QA_PASSWORD` must be set for these too.)
```bash
BASE_URL=... node demo.js              # demo mode (signed out), 375px and 1440px
BASE_URL=... node demo.js D-TREE       # only tests whose id starts with D-TREE
BASE_URL=... node account.js           # signed in (needs the two accounts)
BASE_URL=... node account.js A-OFF     # offline / recovery tests only
BASE_URL=... node account.js A-ZZ      # cleanup: deletes everything but each account's sample
BASE_URL=... node inventory.js         # writes results/inventory.json (every control per page/step)
```
Test ids: `D-*` demo, `A-*` signed in. Sub-checks are `ID.sub`. Results: `results/<suite>.json`
(pass/fail/detail/timing and observations), screenshots and the print PDF: `shots/`.

## Files
- `harness.js` runner and helpers; `flows.js` UI flows; `e2e.js` end-to-end flow with independent hand calculations.
- `loss.js` (round 2: shares, recovery, buffer holding, other costs, cash vs opportunity; desktop and 375px), `demo.js` (+ `demo-tree.js`, `demo-edge.js`, `demo-ui.js`), `account.js`, `inventory.js`, `run-all.js`.
- `test-plan.md`, `defects.md`.

## Notes for the deployed run
- Some tests assert today-relative behaviour (due today is not overdue); they compute dates at run time.
- Tests that create data in the accounts register it and `A-ZZ-CLEANUP` removes it; re-run `node account.js A-ZZ` after an aborted run.
- `A-ISO-1.b-write` reads the publishable key from the app's own network traffic; it does not need any secret.
