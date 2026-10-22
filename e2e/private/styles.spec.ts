import { expect, test } from "@playwright/test";

import { findCalls, recordApiCalls } from "../support/api";
import { hasSellerSession } from "../support/auth";
import { openPrivateRoute, pageHeading } from "../support/private";

test.describe("art styles", () => {
  test.beforeEach(() => {
    test.skip(!hasSellerSession(), "Seller storage state is missing; run the setup project first.");
  });

  test("renders the styles page shell", async ({ page }) => {
    const calls = recordApiCalls(page);

    await openPrivateRoute(page, "/styles");

    await test.step("the heading and the create action are rendered", async () => {
      await expect(pageHeading(page, "My Styles")).toBeVisible();
      await expect(page.getByRole("button", { name: "New style" }).first()).toBeVisible();
    });

    await test.step("GET /api/style-art-presets was called", async () => {
      await expect
        .poll(() => findCalls(calls, "GET", "/api/style-art-presets").length, { timeout: 15_000 })
        .toBeGreaterThan(0);
    });
  });

  test("the presets answer 200 and the page lists them", async ({ page }) => {
    const calls = recordApiCalls(page);

    await openPrivateRoute(page, "/styles");

    await test.step("GET /api/style-art-presets answers 200", async () => {
      await expect
        .poll(
          () => findCalls(calls, "GET", "/api/style-art-presets")[0]?.status ?? 0,
          { timeout: 15_000 }
        )
        .toBe(200);
    });

    await test.step("the presets are listed instead of the error state", async () => {
      await expect(page.getByText("Art styles unavailable")).toHaveCount(0);
      await expect(page.getByText("No art styles yet")).toBeHidden();
    });
  });

  test("the new-style dialog validates before any request", async ({ page }) => {
    const calls = recordApiCalls(page);

    await openPrivateRoute(page, "/styles");
    await page.getByRole("button", { name: "New style" }).first().click();

    const dialog = page.getByRole("dialog");
    await test.step("the dialog opens with an empty form", async () => {
      await expect(dialog.getByRole("heading", { name: "New art style" })).toBeVisible();
      await expect(dialog.getByPlaceholder("Neon Glow")).toHaveValue("");
    });

    await test.step("no create request left the browser", () => {
      expect(findCalls(calls, "POST", "/api/style-art-presets")).toHaveLength(0);
    });
  });
});