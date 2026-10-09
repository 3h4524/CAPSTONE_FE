import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // `networkidle` never settles here: the app keeps long-lived connections open, so wait for
    // the DOM plus an explicit visibility assertion instead.
    await page.waitForLoadState("domcontentloaded");
  });

  test("renders the hero heading and site navigation", async ({ page }) => {
    await expect(page).toHaveTitle(/APCS/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("primary CTA navigates to login", async ({ page }) => {
    await page.getByRole("link", { name: "Get started for free" }).first().click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("features CTA navigates to the features page", async ({ page }) => {
    await page.getByRole("link", { name: "Explore all features" }).click();

    await expect(page).toHaveURL(/\/features$/);
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
  });

  test("unknown route returns the 404 page", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist");

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /page not found/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /back home/i })).toBeVisible();
  });
});