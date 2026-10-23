import { expect, test } from "@playwright/test";

import { findCalls, recordApiCalls } from "../support/api";

const VALID_PASSWORD = "NewPassw0rd1!";

const uniqueEmail = () =>
  `e2e.forgot.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@apcs.test`;

test.describe("forgot password", () => {
  test("sends the reset link request for the filled email", async ({ page }) => {
    const calls = recordApiCalls(page);
    const email = uniqueEmail();

    await test.step("open the forgot-password page", async () => {
      await page.goto("/forgot-password");
      await page.waitForLoadState("domcontentloaded");
      await expect(page.getByLabel("Email")).toBeVisible();
    });

    await test.step("POST /api/auth/forgot-password succeeds", async () => {
      await page.getByLabel("Email").fill(email);

      const [response] = await Promise.all([
        page.waitForResponse(
          (candidate) =>
            candidate.url().endsWith("/api/auth/forgot-password") &&
            candidate.request().method() === "POST"
        ),
        page.getByRole("button", { name: "Send Request" }).click(),
      ]);

      expect(response.ok()).toBe(true);
      expect(findCalls(calls, "POST", "/api/auth/forgot-password")[0]?.status).toBeLessThan(300);
    });

    await test.step("the confirmation names the submitted email", async () => {
      await expect(page.getByText(/we sent a link to reset your password/i)).toBeVisible();
      await expect(page.getByText(email)).toBeVisible();
      await expect(page.getByRole("link", { name: /back to login/i })).toBeVisible();
    });
  });

  test("rejects an empty email without calling the API", async ({ page }) => {
    const calls = recordApiCalls(page);

    await page.goto("/forgot-password");
    await page.waitForLoadState("domcontentloaded");

    await test.step("zod reports the missing email inside the form", async () => {
      await page.getByRole("button", { name: "Send Request" }).click();

      const form = page
        .getByRole("button", { name: "Send Request" })
        .locator("xpath=ancestor::form");
      await expect(form.getByText("Please enter a valid email address")).toBeVisible();
    });

    await test.step("no reset request left the browser", () => {
      expect(findCalls(calls, "POST", "/api/auth/forgot-password")).toHaveLength(0);
    });
  });
});

test.describe("reset password", () => {
  test("rejects mismatched passwords before any request", async ({ page }) => {
    const calls = recordApiCalls(page);

    await test.step("open the reset form with a placeholder token", async () => {
      await page.goto("/reset-password?token=e2e-placeholder-token");
      await page.waitForLoadState("domcontentloaded");
      await expect(page.getByLabel("New Password")).toBeVisible();
    });

    await test.step("zod reports the mismatch inside the form", async () => {
      await page.getByLabel("New Password").fill(VALID_PASSWORD);
      await page.getByLabel("Confirm Password").fill("Different1!");
      await page.getByRole("button", { name: "Update Password" }).click();

      const form = page
        .getByRole("button", { name: "Update Password" })
        .locator("xpath=ancestor::form");
      await expect(form.getByText("Passwords do not match")).toBeVisible();
    });

    await test.step("no reset request left the browser", () => {
      expect(findCalls(calls, "POST", "/api/auth/reset-password")).toHaveLength(0);
    });
  });

  test("a bogus token shows the invalid-link error", async ({ page }) => {
    const calls = recordApiCalls(page);

    await test.step("open the reset form with a bogus token", async () => {
      await page.goto("/reset-password?token=e2e-bogus-token");
      await page.waitForLoadState("domcontentloaded");
      await expect(page.getByLabel("New Password")).toBeVisible();
    });

    await test.step("POST /api/auth/reset-password is rejected", async () => {
      await page.getByLabel("New Password").fill(VALID_PASSWORD);
      await page.getByLabel("Confirm Password").fill(VALID_PASSWORD);

      const [response] = await Promise.all([
        page.waitForResponse(
          (candidate) =>
            candidate.url().endsWith("/api/auth/reset-password") &&
            candidate.request().method() === "POST"
        ),
        page.getByRole("button", { name: "Update Password" }).click(),
      ]);

      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(findCalls(calls, "POST", "/api/auth/reset-password")[0]?.status).toBeGreaterThanOrEqual(
        400
      );
    });

    await test.step("the page explains the link failed and offers a new one", async () => {
      await expect(page.locator("form").getByRole("alert")).toContainText(/invalid|expired/i);
      await expect(page.getByRole("link", { name: /request a new link/i })).toBeVisible();
      await expect(page).toHaveURL(/\/reset-password\?token=e2e-bogus-token/);
    });
  });
});
