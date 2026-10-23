import { expect, test } from "@playwright/test";

test.describe("auth pages", () => {
  test("login exposes labelled email and password fields", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
  });

  test("forgot password exposes a single email field", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: /forgot password/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toHaveCount(0);
  });

  test("reset password without a token asks for a new link", async ({ page }) => {
    await page.goto("/reset-password");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: /reset password/i })).toBeVisible();
    await expect(page.getByText(/missing its reset token/i)).toBeVisible();

    const requestNewLink = page.getByRole("link", { name: /request a new link/i });
    await expect(requestNewLink).toBeVisible();
    await requestNewLink.click();
    await expect(page).toHaveURL(/\/forgot-password$/);
  });

  test("verify email without a token offers to resend", async ({ page }) => {
    await page.goto("/verify-email");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: /verify your email/i })).toBeVisible();
    await expect(page.getByText(/missing its verification token/i)).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: /resend verification email/i })).toBeEnabled();
  });
});