import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: ".next/workflow-ui-results",
  timeout: 45_000,
  workers: 1,
  use: { ...devices["Desktop Chrome"], launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }, baseURL: "http://127.0.0.1:3101", viewport: { width: 1600, height: 1000 }, screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: { command: "pnpm dev --port 3101", url: "http://127.0.0.1:3101", reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
