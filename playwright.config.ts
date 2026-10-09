import { defineConfig, devices } from "@playwright/test";

const E2E_BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:4010";
const E2E_API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://localhost:5191";
const IS_CI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  // Authenticated specs share a single seeded account, so parallel workers would fight over the
  // same session; parallelism would also let one spec's logout invalidate another's cookie.
  fullyParallel: false,
  workers: IS_CI ? 2 : undefined,
  forbidOnly: IS_CI,
  retries: IS_CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: E2E_BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Public routes never call the API, so they stay green with the backend down.
      name: "public",
      testIgnore: ["**/auth.setup.ts", "**/private/**"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Private routes need a live backend: the auth guard keeps spinning instead of redirecting
      // when /api/auth/me never resolves. `storageState` is applied per spec (see e2e/support/auth)
      // rather than here, so a missing seller session skips instead of failing context creation.
      name: "authenticated",
      testMatch: /private\//,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm build && pnpm start",
    url: E2E_BASE_URL,
    reuseExistingServer: !IS_CI,
    timeout: 300_000,
    env: {
      PORT: new URL(E2E_BASE_URL).port || "4010",
      NEXT_PUBLIC_API_BASE_URL: E2E_API_BASE_URL,
    },
  },
});