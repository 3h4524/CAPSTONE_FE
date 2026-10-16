# E2E Runbook

How to run the Playwright suite in `e2e/`. The suite has three projects
(see `playwright.config.ts`): `setup` (log in once via API), `public`
(works without a backend), `authenticated` (needs a live backend + seeded seller).

## Prerequisites

- Docker running (Postgres + Redis come from `CAPSTONE_BE/scripts/e2e/docker-compose.yml`).
- Ports free: `5191` (API), `4010` (FE), `55432` (PG), `56379` (Redis), `2525` (SMTP sink).

## One-time setup (per database)

```bash
cd ../CAPSTONE_BE/scripts/e2e
./bootstrap-postgres.sh   # Postgres 18 + Redis containers
./start-backend.sh        # schema + API + SMTP sink
./seed-seller.sh          # register -> verify (via sink mail) -> login
cat .run/seller.json      # copy email/password from here
```

The seller persists in the `apcs_e2e` database. Re-seed only when the DB is
wiped or you want a fresh account — always with a **new** email, reusing an
old one stalls waiting for a verification mail that never comes.

## Running

```bash
cd ~/fpt/CAPSTONE_FE
export E2E_SELLER_EMAIL='<from seller.json>'
export E2E_SELLER_PASSWORD='Passw0rdTest1!'

pnpm playwright test --project=public                      # 26 tests, no backend needed
pnpm playwright test --project=authenticated               # setup + 44 tests, needs backend
pnpm playwright test                                        # everything (70 tests)
pnpm playwright test e2e/private/profile.spec.ts --project=authenticated   # one file
pnpm playwright test e2e/private/profile.spec.ts:21 --project=authenticated # one test
```

Playwright reuses a FE server already on `:4010` (`reuseExistingServer`), so
keep it running to skip the ~4min build. Its env must be
`NEXT_PUBLIC_API_BASE_URL=http://localhost:5191` with a blank
`NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

## Watching / debugging

```bash
pnpm playwright test --project=authenticated --headed --workers=1   # visible browser
pnpm playwright test <file>:<line> --project=authenticated --debug  # step-through Inspector
pnpm test:e2e:ui                                                    # UI mode: timeline, time-travel
```

Slow motion has no CLI flag — add temporarily to `use:` in
`playwright.config.ts`, remove before committing:

```ts
launchOptions: { slowMo: 500 },
```

Insert `await page.pause()` in a spec to freeze the browser at that point.
`pnpm exec playwright show-report` opens the last HTML report.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| 32 skipped, only redirects pass | `E2E_SELLER_EMAIL/PASSWORD` missing in your shell | export creds, rerun |
| `auth.setup` fails: login 500 | API lost Postgres (Docker stalled) | restart Docker, rerun `start-backend.sh` |
| `seed-seller.sh` hangs on verification mail | reused an already-registered email | seed with a fresh email |
| Headed window is black | no X display | run under Xvfb or a real desktop |
| `POST /api/support-tickets` 500 in E2E | known gap (BUG B5), GET list 500 too (BUG B4) | do not write success-path tests for it |
| Stale FE build picked up | `.next` from another branch | rebuild (`pnpm build`) or delete `.next` |

## Do not commit

`.auth/` storage state, `test-results/`, `playwright-report/`, screenshots,
or real credentials. Test accounts use `@apcs.test` addresses only.
