import { defineConfig, devices } from "@playwright/test";

import { AUTH_STATE_PATH } from "./e2e/support/auth";

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
      // when /api/auth/me never resolves. auth.setup.ts always writes the state file (empty when no
      // seller is configured) because an absent file aborts context creation rather than skipping;
      // e2e/support/auth's marker file is what tells the specs whether the session is real.
      name: "authenticated",
      testMatch: /private\//,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: AUTH_STATE_PATH },
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
      // Blanked so the build does not pick up a developer .env: an unset value keeps the Google
      // button on its disabled placeholder, which is the state e2e/public/google-absent asserts.
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: "",
      GOOGLE_ANALYTICS_MEASUREMENT_ID: "",
    },
  },
});