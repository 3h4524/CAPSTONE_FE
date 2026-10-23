import { expect, test } from "@playwright/test";

import { findCalls, recordApiCalls } from "../support/api";

const VALID_PASSWORD = "Passw0rdTest1!";

const uniqueEmail = () =>
  `e2e.register.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@apcs.test`;

test.describe("registration", () => {
  test("renders the registration form", async ({ page }) => {
    await test.step("open the register page", async () => {
      await page.goto("/register");
      await page.waitForLoadState("domcontentloaded");
    });

    await test.step("every field and the submit button are visible", async () => {
      await expect(page.getByLabel("Full name")).toBeVisible();
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.locator("#password")).toBeVisible();
      await expect(page.locator("#confirmPassword")).toBeVisible();
      await expect(page.getByRole("button", { name: "Create account" })).toBeEnabled();
    });
  });

  test("rejects mismatched passwords without calling the API", async ({ page }) => {
    const calls = recordApiCalls(page);

    await page.goto("/register");
    await page.waitForLoadState("domcontentloaded");

    await test.step("fill the form with mismatched passwords", async () => {
      await page.getByLabel("Full name").fill("E2E User");
      await page.getByLabel("Email").fill(uniqueEmail());
      await page.locator("#password").fill(VALID_PASSWORD);
      await page.locator("#confirmPassword").fill("Different1!");
    });

    await test.step("zod reports the mismatch inside the form", async () => {
      await page.getByRole("button", { name: "Create account" }).click();

      const form = page
        .getByRole("button", { name: "Create account" })
        .locator("xpath=ancestor::form");
      await expect(form.getByText("Passwords do not match")).toBeVisible();
    });

    await test.step("no registration request left the browser", () => {
      expect(findCalls(calls, "POST", "/api/auth/register")).toHaveLength(0);
    });
  });

  test("rejects a weak password without calling the API", async ({ page }) => {
    const calls = recordApiCalls(page);

    await page.goto("/register");
    await page.waitForLoadState("domcontentloaded");

    await test.step("fill the form with a password missing an uppercase letter", async () => {
      await page.getByLabel("Email").fill(uniqueEmail());
      await page.locator("#password").fill("weakpass1");
      await page.locator("#confirmPassword").fill("weakpass1");
    });

    await test.step("zod reports the password rule inside the form", async () => {
      await page.getByRole("button", { name: "Create account" }).click();

      const form = page
        .getByRole("button", { name: "Create account" })
        .locator("xpath=ancestor::form");
      await expect(form.getByRole("alert")).toHaveText(/at least one uppercase letter/i);
    });

    await test.step("no registration request left the browser", () => {
      expect(findCalls(calls, "POST", "/api/auth/register")).toHaveLength(0);
    });
  });

  test("blocks a malformed email with native validation before any request", async ({ page }) => {
    const calls = recordApiCalls(page);

    await page.goto("/register");
    await page.waitForLoadState("domcontentloaded");

    await test.step("fill an unparsable email address", async () => {
      await page.getByLabel("Email").fill("not-an-email");
      await page.locator("#password").fill(VALID_PASSWORD);
      await page.locator("#confirmPassword").fill(VALID_PASSWORD);
      await page.getByRole("button", { name: "Create account" }).click();
    });

    await test.step("the browser stops the submit and the API stays untouched", async () => {
      await expect(page.getByLabel("Email")).toHaveJSProperty("validity.typeMismatch", true);
      await expect(page.locator("form").getByRole("alert")).toHaveCount(0);
      expect(findCalls(calls, "POST", "/api/auth/register")).toHaveLength(0);
    });
  });

  test("registers a new account and asks for email verification", async ({ page }) => {
    const calls = recordApiCalls(page);
    const email = uniqueEmail();

    await page.goto("/register");
    await page.waitForLoadState("domcontentloaded");

    await test.step("POST /api/auth/register requires email verification", async () => {
      await page.getByLabel("Full name").fill("E2E User");
      await page.getByLabel("Email").fill(email);
      await page.locator("#password").fill(VALID_PASSWORD);
      await page.locator("#confirmPassword").fill(VALID_PASSWORD);

      const [response] = await Promise.all([
        page.waitForResponse(
          (candidate) =>
            candidate.url().endsWith("/api/auth/register") &&
            candidate.request().method() === "POST"
        ),
        page.getByRole("button", { name: "Create account" }).click(),
      ]);

      expect(response.ok()).toBe(true);
      expect(await response.json()).toMatchObject({
        email,
        requiresEmailVerification: true,
      });
      expect(findCalls(calls, "POST", "/api/auth/register")[0]?.status).toBeLessThan(300);
    });

    await test.step("the verification prompt replaces the form", async () => {
      await expect(page.getByText(/verification link to/i)).toBeVisible();
      await expect(page.getByText(email)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Resend verification email" })
      ).toBeVisible();
      await expect(page.getByLabel("Full name")).toHaveCount(0);
    });
  });
});
