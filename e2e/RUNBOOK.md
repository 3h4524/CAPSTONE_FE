# E2E Runbook

How to run the Playwright suite in `e2e/`. The suite has three projects
(see `e2e/playwright.config.ts`): `setup` (log in once via API), `public`
(works without a backend), `authenticated` (needs a live backend + seeded seller).

The root `playwright.config.ts` belongs to the workflow UI suite in
`tests/browser` (`pnpm test:workflow-ui`); the two suites stay apart.

## Prerequisites

- Docker running (Postgres + Redis come from `CAPSTONE_BE/scripts/e2e/docker-compose.yml`).
- Ports free: `5191`-`5195` (API picks a free one), `4010` (FE), `55432` (PG), `56379` (Redis), `2525` (SMTP sink).
  The suite always builds and starts a production frontend of its own on `4010`, so a dev server
  must not sit on that port — run the dev server on `3000` instead.

## Backend + seller (one command)

```bash
cd ../CAPSTONE_BE
E2E_ORCHESTRATION_COMMAND=up dotnet test tests/APCS.E2E.Automation/APCS.E2E.Automation.csproj
```

The orchestrator owns the whole backend: compose, schema from the EF model (`EnsureCreated`),
SMTP sink, API, and the seller seeding (register -> verify via the sink mail -> login).
The seller is the fixed account `e2e.seller@apcs.test` / `Passw0rdTest1!` and is seeded
idempotently, so it is always fresh. When a stack from an earlier run is still alive it is
reused: application tables are truncated while the run history in `test_report_runs` is kept,
Redis is flushed and catalog/admin are reseeded. `E2E_ORCHESTRATION_COMMAND=down` takes
everything down again. See `CAPSTONE_BE/scripts/e2e/README.md`.

## Running

```bash
cd ~/fpt/CAPSTONE_FE
export E2E_SELLER_EMAIL='e2e.seller@apcs.test'
export E2E_SELLER_PASSWORD='Passw0rdTest1!'

pnpm test:e2e:public                                      # 26 tests, no backend needed
pnpm playwright test --config e2e/playwright.config.ts --project=authenticated   # setup + 44 tests
pnpm test:e2e                                             # everything (70 tests)
pnpm playwright test --config e2e/playwright.config.ts e2e/private/profile.spec.ts --project=authenticated   # one file
pnpm playwright test --config e2e/playwright.config.ts e2e/private/profile.spec.ts:21 --project=authenticated # one test
```

Playwright always starts a production frontend of its own on `:4010` (`reuseExistingServer: false`),
so the first run of the day spends ~4min on the build and every later one reuses the build
output. The env it builds with is `NEXT_PUBLIC_API_BASE_URL=http://localhost:5191` with a blank
`NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

## Watching / debugging

```bash
pnpm playwright test --config e2e/playwright.config.ts --project=authenticated --headed --workers=1   # visible browser
pnpm playwright test --config e2e/playwright.config.ts <file>:<line> --project=authenticated --debug  # step-through Inspector
pnpm test:e2e:ui                                                    # UI mode: timeline, time-travel
```

Slow motion has no CLI flag — add temporarily to `use:` in
`e2e/playwright.config.ts`, remove before committing:

```ts
launchOptions: { slowMo: 500 },
```

Insert `await page.pause()` in a spec to freeze the browser at that point.
`pnpm exec playwright show-report` opens the last HTML report.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| 32 skipped, only redirects pass | `E2E_SELLER_EMAIL/PASSWORD` missing in your shell | export creds, rerun |
| Public project runs but backend-dependent steps fail | backend not up | run `E2E_ORCHESTRATION_COMMAND=up dotnet test ...` again |
| Seller seeding hangs on the verification mail | SMTP sink died or port 2525 taken | kill `.run/smtp.pid`, rerun; check `.run/smtp.log` |
| Headed window is black | no X display | run under Xvfb or a real desktop |
| `POST /api/support-tickets` 500 in E2E | known gap (BUG B5), GET list 500 too (BUG B4) | do not write success-path tests for it |
| Stale FE build picked up | `.next` from another branch | rebuild (`pnpm build`) or delete `.next` |

## Do not commit

`.auth/` storage state, `test-results/`, `playwright-report/`, screenshots,
or real credentials. Test accounts use `@apcs.test` addresses only.
