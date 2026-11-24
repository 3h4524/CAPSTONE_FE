import path from "node:path";

import type { Page } from "@playwright/test";
import { expect, request, test } from "@playwright/test";

import { E2E_API_BASE_URL } from "../support/auth";
import { readLatestAdminOtp } from "../support/otp";
import { openPrivateRoute, pageHeading } from "../support/private";
import { setEnglishInterface } from "../support/profile";

const ADMIN_EMAIL = "demo.admin@apcs.test";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Passw0rdTest1!";
const ADMIN_STATE_PATH = path.resolve("playwright/.auth/admin.json");

type LoginResponse = {
  user?: { id: string; email: string; fullName: string; roles: string[] };
  requiresTwoFactor?: boolean;
  tempToken?: string;
};

const authenticateAdmin = async () => {
  const api = await request.newContext({ baseURL: E2E_API_BASE_URL, storageState: { cookies: [], origins: [] } });
  try {
    const login = await api.post("/api/auth/login", {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    if (!login.ok()) {
      throw new Error(`Admin login failed with ${login.status()}: ${await login.text()}`);
    }
    const loginBody = (await login.json()) as LoginResponse;
    if (!loginBody.requiresTwoFactor || !loginBody.tempToken) {
      throw new Error(`Admin login did not stop at 2FA: ${JSON.stringify(loginBody)}`);
    }
    const otp = readLatestAdminOtp(ADMIN_EMAIL);
    const verify = await api.post("/api/auth/admin/verify-2fa", {
      data: { TempToken: loginBody.tempToken, OtpCode: otp },
    });
    if (!verify.ok()) {
      throw new Error(`Admin 2FA verification failed with ${verify.status()}: ${await verify.text()}`);
    }
    await setEnglishInterface(api);
    await api.storageState({ path: ADMIN_STATE_PATH });
  } finally {
    await api.dispose();
  }
};

const captureConsoleErrors = (page: Page) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  return consoleErrors;
};

test.describe("admin pages", () => {
  test.use({ storageState: ADMIN_STATE_PATH });

  test.beforeAll(async () => {
    await authenticateAdmin();
  });

  test("dashboard renders the admin heading", async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    await openPrivateRoute(page, "/admin/dashboard");
    await expect(pageHeading(page, "Admin Dashboard")).toBeVisible();
    expect(consoleErrors, "console errors on /admin/dashboard").toEqual([]);
  });

  test("subscription plans opens create dialog with VND pricing", async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    await openPrivateRoute(page, "/admin/subscription-plans");
    await expect(pageHeading(page, "Subscription Plans")).toBeVisible();

    await page.getByRole("button", { name: "Create new plan" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Create New Subscription Plan" })).toBeVisible();

    const monthlyVnd = dialog.getByLabel("Monthly price (VND)");
    const monthlyUsd = dialog.getByLabel("Monthly price (USD)");
    await expect(monthlyVnd.or(monthlyUsd)).toBeVisible();

    if (await monthlyVnd.isVisible()) {
      await monthlyVnd.fill("299000");
      await expect(dialog.getByText(/299\.000/)).toBeVisible();
    }

    expect(consoleErrors, "console errors on /admin/subscription-plans").toEqual([]);
  });

  test("style art presets list the system styles and open the New style dialog", async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    await openPrivateRoute(page, "/admin/style-art-presets");
    await expect(pageHeading(page, "System styles")).toBeVisible();

    await expect(page.locator("tbody tr").first()).toBeVisible();

    await page.getByRole("button", { name: "New style" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "New system style" })).toBeVisible();

    expect(consoleErrors, "console errors on /admin/style-art-presets").toEqual([]);
  });

  test("support tickets renders the page heading", async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    await openPrivateRoute(page, "/admin/support-tickets");
    await expect(pageHeading(page, "Support Tickets")).toBeVisible();
    expect(consoleErrors, "console errors on /admin/support-tickets").toEqual([]);
  });

  test("users renders the heading and the table", async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    await openPrivateRoute(page, "/admin/users");
    await expect(pageHeading(page, /Users Management/)).toBeVisible();
    await expect(page.getByText("Failed to load user list.")).toHaveCount(0);
    expect(consoleErrors, "console errors on /admin/users").toEqual([]);
  });

  test("test reports dashboard renders heading, metrics and run tests dialog", async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    await openPrivateRoute(page, "/admin/test-reports");
    await expect(pageHeading(page, "End-to-end test reports")).toBeVisible();

    const runTestsButton = page.getByRole("button", { name: "Run tests" });
    await expect(runTestsButton).toBeVisible();
    await runTestsButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Run the end-to-end suite" })).toBeVisible();
    await expect(dialog.getByRole("radio", { name: /headless/i })).toBeVisible();
    await expect(dialog.getByRole("radio", { name: /headed/i })).toBeVisible();
    await expect(dialog.getByRole("radio", { name: /debug/i })).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();

    expect(consoleErrors, "console errors on /admin/test-reports").toEqual([]);
  });

  test("test reports detail renders breadcrumbs and navigation", async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    await openPrivateRoute(page, "/admin/test-reports/non-existent-run");
    await expect(page.getByRole("link", { name: "All test reports" })).toBeVisible();
    expect(consoleErrors, "console errors on /admin/test-reports/[runId]").toEqual([]);
  });

  test("mockup templates library renders heading and printify actions", async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    await openPrivateRoute(page, "/admin/mockup-templates");
    await expect(page.getByRole("heading", { name: "Mock-up template library" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create from Printify" })).toBeVisible();
    await expect(page.getByRole("button", { name: "New template" })).toBeVisible();
    expect(consoleErrors, "console errors on /admin/mockup-templates").toEqual([]);
  });

  test("model photos library renders heading, make with AI and upload actions", async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    await openPrivateRoute(page, "/admin/model-photos");
    await expect(pageHeading(page, "Model photo library")).toBeVisible();
    await expect(page.getByRole("button", { name: "Make with AI" })).toBeVisible();
    await expect(page.getByRole("button", { name: "New model photo" })).toBeVisible();
    expect(consoleErrors, "console errors on /admin/model-photos").toEqual([]);
  });
});

