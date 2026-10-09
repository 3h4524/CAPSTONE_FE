import { expect, test } from "@playwright/test";

// Without a client ID the OAuth flow cannot complete, so `AuthSocialDivider` must keep the button
// inert instead of rendering a Google widget that would fail on click. Guards against a regression
// where the button is wired up in an environment where Google is unconfigured.
test.describe("google sign-in escape hatch", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
  });

  test("renders a disabled placeholder instead of a google widget", async ({ page }) => {
    const googleButton = page.getByRole("button", { name: /sign in with google/i });

    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeDisabled();
    await expect(page.locator('iframe[src*="accounts.google.com"]')).toHaveCount(0);
  });

  test("never loads the Google Identity Services script", async ({ page }) => {
    await expect(page.locator('script[src*="accounts.google.com/gsi/client"]')).toHaveCount(0);
  });
});