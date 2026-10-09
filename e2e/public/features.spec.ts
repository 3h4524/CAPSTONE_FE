import { expect, test } from "@playwright/test";

test.describe("features page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/features");
    await page.waitForLoadState("domcontentloaded");
  });

  test("renders at least three section headings", async ({ page }) => {
    const headings = page.getByRole("heading", { level: 2 });

    await expect(headings).not.toHaveCount(0);
    expect(await headings.count()).toBeGreaterThanOrEqual(3);
  });

  test("is reachable from the landing page navigation", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Features" }).click();

    await expect(page).toHaveURL(/\/features$/);
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
  });
});